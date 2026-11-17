"""공실 후보를 찾아 DB에 저장한다.

중심 좌표와 반경 안의 점포를 번지별로 묶고, 번지마다 건축물대장의 상가 층을 읽어
영업 점포가 없는 층을 후보로 저장한다. 판정 규칙은 app/services/vacancy.py에 있다.

실행 (backend 폴더에서):
  .venv/Scripts/python -m scripts.find_vacancies --lat 37.5445 --lng 127.0560 --radius 300 --dry-run
  .venv/Scripts/python -m scripts.find_vacancies --lat 37.5445 --lng 127.0560 --radius 700 --max-parcels 300

--dry-run은 결과만 출력하고 저장하지 않는다. 같은 층을 다시 찾으면 기존 행을 갱신한다.
번지 하나에 건축HUB를 1회 호출한다. 공공데이터포털 한도는 API마다 하루 10,000건이므로 --max-parcels로 줄일 수 있다.
"""
import argparse
import os
import sys
import time
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from app.services import vacancy  # noqa: E402
from app.services.external import building_hub, store_info  # noqa: E402


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
    parser.add_argument("--radius", type=int, default=300, help="반경(m). 기본 300")
    parser.add_argument("--max-parcels", type=int, default=150, help="조회할 번지 수의 상한. 호출량을 막는다")
    parser.add_argument("--dry-run", action="store_true", help="결과만 보여 주고 저장하지 않는다")
    args = parser.parse_args()

    print(f"점포를 모으는 중... (중심 {args.lat}, {args.lng} / 반경 {args.radius}m)")
    stores = store_info.stores_in_radius(args.lng, args.lat, args.radius)
    parcels = group_by_parcel(stores)
    print(f"점포 {len(stores)}개, 번지 {len(parcels)}곳")

    rows: list[dict] = []
    checked = 0
    for code, parcel_stores in list(parcels.items())[: args.max_parcels]:
        info = parcel_info(parcel_stores)
        parts = vacancy.parse_parcel(code, parcel_stores[0].get("plotSctCd", "1"))
        try:
            floors = building_hub.all_floors(parts["sigunguCd"] + parts["bjdongCd"], parts["bun"], parts["ji"])
        except Exception as error:  # noqa: BLE001  한 번지가 실패해도 나머지는 계속한다.
            print(f"  건너뜀 {info['address']}: {error}")
            continue
        checked += 1
        for candidate in vacancy.find_candidates(info, floors, parcel_stores):
            rows.append({**info, **candidate, "id": f"{code}-{candidate['floor']}"})
        time.sleep(0.05)  # 서버에 부담을 주지 않도록 잠깐 쉰다.

    rows.sort(key=lambda r: -r["confidence"])
    print(f"\n건축물대장을 조회한 번지 {checked}곳 / 공실 후보 {len(rows)}개")
    for row in rows[:15]:
        print(f"  {row['confidence']:.2f}  {row['address']} {row['floor']}층 {row['floorUse']} {row['floorAreaM2']}㎡  [{row['buildingName']}]")
    if len(rows) > 15:
        print(f"  ... 외 {len(rows) - 15}개")

    if args.dry_run:
        print("\n--dry-run이라 저장하지 않았습니다.")
        return
    save(rows)
    print(f"\n{len(rows)}개를 저장했습니다. (이미 확인됨/제외로 바꾼 행은 그대로 둡니다)")


if __name__ == "__main__":
    main()
