"""공실 후보를 찾아 DB에 저장한다.

중심 좌표와 반경 안의 점포를 번지별로 묶고, 번지마다 건축물대장의 상가 층을 읽어
영업 점포가 없는 층을 후보로 저장한다. 판정 규칙은 app/services/vacancy.py에 있다.

실행 (backend 폴더에서):
  한 곳만:   .venv/Scripts/python -m scripts.find_vacancies --lat 37.5445 --lng 127.0560 --radius 700
  넓은 범위: .venv/Scripts/python -m scripts.find_vacancies --lat 37.5445 --lng 127.0560 --span-km 8

--span-km을 주면 한 변이 그 길이인 정사각형 범위를 반경 700m 조각으로 나눠, 중심에서 가까운 조각부터 훑는다.
조사한 번지는 backend/data/scanned_parcels.json에 기록하고 다음 실행에서 건너뛴다.
건축HUB 호출은 번지 하나에 1회이고 하루 한도는 10,000건이다. --daily-limit(기본 9,000)에 닿으면 멈춘다.
다음 날 같은 명령을 다시 실행하면 남은 조각부터 이어서 한다.
--dry-run은 결과만 출력하고 저장하지 않는다. 같은 층을 다시 찾으면 기존 행을 갱신한다.
"""
import argparse
import json
import math
import os
import sys
import time
from datetime import date
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from app.services import vacancy  # noqa: E402
from app.services.external import building_hub, store_info  # noqa: E402

SCANNED_FILE = BACKEND / "data" / "scanned_parcels.json"
TILE_RADIUS_M = 700
MAX_CONSECUTIVE_FAILURES = 5  # 연속으로 이만큼 실패하면 일일 한도에 닿은 것으로 보고 멈춘다.


class QuotaLikelyExceeded(Exception):
    """건축HUB 호출이 연속으로 실패했다. 하루 한도에 닿았을 가능성이 크다."""


def load_env_file() -> None:
    """backend/.env의 값을 환경변수로 읽는다. 실행할 때만 부른다."""
    path = BACKEND / ".env"
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            name, value = line.split("=", 1)
            os.environ.setdefault(name.strip(), value.strip())


def load_scanned() -> dict:
    if SCANNED_FILE.exists():
        return json.loads(SCANNED_FILE.read_text(encoding="utf-8"))
    return {}


def save_scanned(scanned: dict) -> None:
    SCANNED_FILE.parent.mkdir(exist_ok=True)
    SCANNED_FILE.write_text(json.dumps(scanned, ensure_ascii=False), encoding="utf-8")


def group_by_parcel(stores: list[dict]) -> dict:
    """점포를 지번 코드(lnoCd)별로 묶는다."""
    parcels: dict[str, list[dict]] = {}
    for store in stores:
        code = store.get("lnoCd") or ""
        if len(code) == 19:
            parcels.setdefault(code, []).append(store)
    return parcels


def parcel_info(stores: list[dict]) -> dict:
    """번지의 대표 주소, 건물 이름, 좌표(점포 좌표의 평균)."""
    first = stores[0]
    names = [s.get("bldNm") for s in stores if s.get("bldNm")]
    lats = [s["lat"] for s in stores if s.get("lat")]
    lngs = [s["lon"] for s in stores if s.get("lon")]
    return {
        "address": first.get("lnoAdr", ""),
        "buildingName": names[0] if names else "",
        "lat": sum(lats) / len(lats),
        "lng": sum(lngs) / len(lngs),
    }


def tile_centers(lat: float, lng: float, span_km: float) -> list[tuple[float, float]]:
    """범위를 반경 700m 원 조각의 중심점으로 나누고, 중심에서 가까운 순서로 정렬한다."""
    step_m = TILE_RADIUS_M * 1.4  # 원이 빈틈없이 덮이도록 조금 겹친다.
    deg_lat = step_m / 111_000
    deg_lng = step_m / (111_000 * math.cos(math.radians(lat)))
    count = int(span_km * 1000 / step_m) + 1
    half = count // 2
    centers = [(lat + i * deg_lat, lng + j * deg_lng) for i in range(-half, half + 1) for j in range(-half, half + 1)]
    return sorted(centers, key=lambda c: (c[0] - lat) ** 2 + ((c[1] - lng) * math.cos(math.radians(lat))) ** 2)


def scan_tile(lat: float, lng: float, radius_m: int, scanned: dict, budget: int) -> tuple[list[dict], int]:
    """조각 하나를 조사한다. 후보 목록과 건축HUB 호출 수를 돌려준다."""
    stores = store_info.stores_in_radius(lng, lat, radius_m)
    parcels = group_by_parcel(stores)
    rows: list[dict] = []
    calls = 0
    failures_in_a_row = 0
    for code, parcel_stores in parcels.items():
        if code in scanned:
            continue  # 이미 조사한 번지
        if calls >= budget:
            break
        info = parcel_info(parcel_stores)
        parts = vacancy.parse_parcel(code, parcel_stores[0].get("plotSctCd", "1"))
        try:
            floors = building_hub.all_floors(parts["sigunguCd"] + parts["bjdongCd"], parts["bun"], parts["ji"])
        except Exception as error:  # noqa: BLE001  한 번지가 실패해도 나머지는 계속한다.
            print(f"  건너뜀 {info['address']}: {error}")
            failures_in_a_row += 1
            if failures_in_a_row >= MAX_CONSECUTIVE_FAILURES:
                raise QuotaLikelyExceeded(f"연속 {failures_in_a_row}번 실패") from error
            continue
        failures_in_a_row = 0
        calls += 1
        scanned[code] = date.today().isoformat()
        for candidate in vacancy.find_candidates(info, floors, parcel_stores):
            rows.append({**info, **candidate, "id": f"{code}-{candidate['floor']}"})
        time.sleep(0.05)  # 서버에 부담을 주지 않도록 잠깐 쉰다.
    return rows, calls


def save(rows: list[dict]) -> None:
    import psycopg

    url = os.environ.get("SUPABASE_DB_URL", "")
    if not url:
        raise SystemExit("SUPABASE_DB_URL이 없습니다. backend/.env를 확인하세요.")
    with psycopg.connect(url, connect_timeout=20) as conn:
        for row in rows:
            conn.execute(
                """insert into vacancy_candidates (id, address, building_name, floor, floor_use, floor_detail, floor_area_m2,
                       stores_on_floor, unknown_floor_stores, confidence, reasons, geom)
                   values (%(id)s, %(address)s, %(buildingName)s, %(floor)s, %(floorUse)s, %(floorDetail)s, %(floorAreaM2)s,
                           %(storesOnFloor)s, %(unknownFloorStores)s, %(confidence)s, %(reasons)s,
                           ST_SetSRID(ST_MakePoint(%(lng)s, %(lat)s), 4326)::geography)
                   on conflict (id) do update set address = excluded.address, building_name = excluded.building_name,
                     floor_use = excluded.floor_use, floor_detail = excluded.floor_detail, floor_area_m2 = excluded.floor_area_m2,
                     stores_on_floor = excluded.stores_on_floor, unknown_floor_stores = excluded.unknown_floor_stores,
                     confidence = excluded.confidence, reasons = excluded.reasons, geom = excluded.geom, found_at = now()
                   where vacancy_candidates.status = 'candidate'""",  # 확인됨, 제외로 바꾼 행은 건드리지 않는다.
                row,
            )
        conn.commit()


def main() -> None:
    load_env_file()
    parser = argparse.ArgumentParser(description="공실 후보를 찾는다.")
    parser.add_argument("--lat", type=float, required=True, help="중심 위도")
    parser.add_argument("--lng", type=float, required=True, help="중심 경도")
    parser.add_argument("--radius", type=int, default=TILE_RADIUS_M, help="한 곳만 조사할 때의 반경(m)")
    parser.add_argument("--span-km", type=float, help="넓은 범위 조사. 한 변의 길이(km)")
    parser.add_argument("--daily-limit", type=int, default=9000, help="건축HUB 호출 수의 상한")
    parser.add_argument("--dry-run", action="store_true", help="결과만 출력하고 저장하지 않는다")
    args = parser.parse_args()

    scanned = load_scanned()
    if args.span_km:
        centers = tile_centers(args.lat, args.lng, args.span_km)
        radius = TILE_RADIUS_M
    else:
        centers = [(args.lat, args.lng)]
        radius = args.radius
    print(f"조각 {len(centers)}개, 이미 조사한 번지 {len(scanned)}곳, 오늘 호출 상한 {args.daily_limit}건")

    total_calls = 0
    total_rows = 0
    for index, (lat, lng) in enumerate(centers, start=1):
        if total_calls >= args.daily_limit:
            print(f"호출 상한에 닿아 멈춥니다. 같은 명령을 다음 날 다시 실행하면 {index}번째 조각부터 이어서 합니다.")
            break
        try:
            rows, calls = scan_tile(lat, lng, radius, scanned, args.daily_limit - total_calls)
        except QuotaLikelyExceeded as error:
            save_scanned(scanned)
            print(f"건축HUB 호출이 연속으로 실패해 멈춥니다({error}). 하루 한도에 닿았을 가능성이 큽니다. 자정이 지난 뒤 같은 명령을 다시 실행하세요.")
            break
        except Exception as error:  # noqa: BLE001  조각 하나가 실패해도 다음 조각으로 간다.
            print(f"[{index}/{len(centers)}] 조각 건너뜀: {error}")
            continue
        total_calls += calls
        total_rows += len(rows)
        if rows and not args.dry_run:
            save(rows)
        if not args.dry_run:
            save_scanned(scanned)
        print(f"[{index}/{len(centers)}] ({lat:.4f}, {lng:.4f}) 새 번지 {calls}곳, 후보 {len(rows)}개 / 누적 호출 {total_calls}, 후보 {total_rows}")

    print(f"\n끝. 호출 {total_calls}건, 후보 {total_rows}개{' (저장 안 함)' if args.dry_run else ' 저장'}")


if __name__ == "__main__":
    main()
