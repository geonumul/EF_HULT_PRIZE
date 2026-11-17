"""주소 하나로 공실을 등록하는 도구.

지번 주소와 현장에서 잰 값을 넣으면 아래를 자동으로 한다.
  1. 카카오 로컬로 좌표와 법정동 코드를 얻는다.
  2. 건축HUB에서 건물 용도, 연면적, 해당 층의 용도를 읽는다.
  3. 브이월드에서 용도지역을 읽는다.
  4. 상가정보에서 주변 카페와 필라테스 학원 수를 센다.
  5. 업종 적합성을 판정하고 업종별 창업비를 추정한다.
  6. 사진을 정리해 프론트 폴더에 복사하고 DB에 올린다.

사용 예 (backend 폴더에서):
  .venv/Scripts/python -m scripts.register_listing --address "서울 성동구 성수동2가 300-1" --floor 1 \\
      --area 39.6 --ceiling 3.2 --deposit 3000 --rent 180 --nearby "성수역 5분" --id seongsu-300-1-1f \\
      --photos "C:/사진/성수300" --dry-run

--dry-run을 붙이면 조회와 판정만 보여 주고 DB와 파일은 건드리지 않는다. 결과가 맞으면 --dry-run을 빼고 다시 실행한다.
금액은 보증금과 월세가 만원 단위, 창업비 추정은 예시 단가 기준이다.
"""
import argparse
import json
import re
import shutil
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))


def load_env_file() -> None:
    """backend/.env의 값을 환경변수로 읽는다. 키 값이 이 파일에 들어 있다."""
    import os

    path = BACKEND / ".env"
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            name, value = line.split("=", 1)
            os.environ.setdefault(name.strip(), value.strip())


from app.services import suitability  # noqa: E402
from app.services.external import building_hub, kakao_local, store_info, vworld  # noqa: E402
from app.services.quote import CONSTRUCTION_WON_PER_M2, facility_cost  # noqa: E402

FRONTEND_IMAGES = BACKEND.parent / "frontend" / "public" / "images" / "listings"
USES = ["cafe", "popup", "pilates"]

# 집기 비용을 면적에 비례해 잡는 예시 단가(원/m²). 기본 배치(카페 11개 테이블 등)의 집기 합계에서 계산했다.
FURNITURE_WON_PER_M2 = {"cafe": 287000, "popup": 85000, "pilates": 490000}


def floor_building_use(title: dict, floor_data: dict) -> str:
    """해당 층의 용도 분류를 돌려준다. 층별 설명에 '제1종근린생활시설(소매점)'처럼 적혀 있으면 그것을 쓴다."""
    for use in floor_data.get("uses", []):
        found = re.search(r"제[12]종\s*근린생활시설", use.get("detail", "") or "")
        if found:
            return "".join(found.group(0).split())
    return title.get("mainPurpose", "")


def estimate_costs(area_m2: float) -> dict:
    """업종별 창업비를 만원 단위로 추정한다. 집기, 설비, 시공을 더한다. 철거비는 견적서에서 따로 더한다."""
    costs = {}
    for use in USES:
        furniture = area_m2 * FURNITURE_WON_PER_M2[use]
        construction = area_m2 * CONSTRUCTION_WON_PER_M2
        costs[use] = round((furniture + facility_cost(use) + construction) / 10000)
    return costs


def slug_from(address: str, floor: int) -> str:
    """주소에서 영문 숫자 id를 만든다. 예: 성수동2가 300-1, 1층 -> seongsu-... 대신 번지와 층만 쓴다."""
    numbers = re.findall(r"\d+", address.split()[-1] if address.split() else address)
    return "listing-" + "-".join(numbers) + f"-{floor}f"


def dong_name(address: str) -> str:
    """주소에서 동 이름을 뽑는다. 예: '서울 성동구 성수동2가 300-1' -> '성수동2가'"""
    for word in address.split():
        if word.endswith(("동", "가")) or re.search(r"동\d*가?$", word):
            return word
    return address


def lookup(address: str, floor: int) -> dict:
    """주소 하나로 공공 데이터를 모두 조회한다."""
    place = kakao_local.geocode(address)
    if not place:
        raise SystemExit(f"주소를 찾을 수 없습니다: {address}")
    title = building_hub.title_info(place["bCode"], place["mainNo"], place["subNo"])
    floor_data = building_hub.floor_info(place["bCode"], place["mainNo"], place["subNo"], floor)
    zoning = vworld.zoning_at(place["lng"], place["lat"])
    stores = store_info.nearby_counts(place["lng"], place["lat"], 300)
    return {"place": place, "title": title, "floor": floor_data, "zoning": zoning, "stores": stores}


def copy_photos(photo_dir: Path, listing_id: str) -> list[str]:
    """사진을 줄여서 프론트 public 폴더에 복사한다. 돌려주는 값은 화면에서 쓰는 주소다."""
    target = FRONTEND_IMAGES / listing_id
    target.mkdir(parents=True, exist_ok=True)
    sources = sorted(p for p in photo_dir.iterdir() if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp"))
    urls = []
    for index, source in enumerate(sources, start=1):
        destination = target / f"{index:02d}.jpg"
        try:
            from PIL import Image, ImageOps

            image = ImageOps.exif_transpose(Image.open(source)).convert("RGB")
            image.thumbnail((1600, 1600))  # 긴 변을 1600px 안으로 줄인다.
            image.save(destination, "JPEG", quality=85)
        except ImportError:
            shutil.copy(source, destination)  # Pillow가 없으면 원본을 그대로 복사한다.
        urls.append(f"/images/listings/{listing_id}/{destination.name}")
    return urls


def save_to_database(record: dict, verdicts: list[dict]) -> None:
    import os

    import psycopg
    from psycopg.types.json import Jsonb

    url = os.environ.get("SUPABASE_DB_URL", "")
    if not url:
        raise SystemExit("SUPABASE_DB_URL이 없습니다. backend/.env를 확인하세요.")
    with psycopg.connect(url, connect_timeout=20) as conn:
        conn.execute(
            """insert into listings (id, tag, address, nearby, geom, area_m2, floor, ceiling_h,
                                     deposit, rent, building_use, thumbnail, costs)
               values (%(id)s, %(tag)s, %(address)s, %(nearby)s, ST_SetSRID(ST_MakePoint(%(lng)s, %(lat)s), 4326)::geography,
                       %(area)s, %(floor)s, %(ceiling)s, %(deposit)s, %(rent)s, %(building_use)s, %(thumbnail)s, %(costs)s)
               on conflict (id) do update set tag = excluded.tag, address = excluded.address, nearby = excluded.nearby,
                 geom = excluded.geom, area_m2 = excluded.area_m2, floor = excluded.floor, ceiling_h = excluded.ceiling_h,
                 deposit = excluded.deposit, rent = excluded.rent, building_use = excluded.building_use,
                 thumbnail = excluded.thumbnail, costs = excluded.costs""",
            {**record, "costs": Jsonb(record["costs"])},
        )
        conn.execute(
            """insert into spaces (id, listing_id, photos, dimensions, condition)
               values (%(id)s, %(id)s, %(photos)s, %(dimensions)s, %(condition)s)
               on conflict (id) do update set photos = excluded.photos, dimensions = excluded.dimensions,
                 condition = excluded.condition""",
            {**record, "dimensions": Jsonb(record["dimensions"])},
        )
        for row in verdicts:
            conn.execute(
                """insert into suitability (space_id, use_type, result, reason, extra_cost)
                   values (%s, %s, %s, %s, %s)
                   on conflict (space_id, use_type) do update set result = excluded.result,
                     reason = excluded.reason, extra_cost = excluded.extra_cost""",
                (record["id"], row["useType"], row["verdict"], " / ".join(row["reasons"]), row["extraCostWon"]),
            )
        conn.commit()


def main() -> None:
    load_env_file()  # 실행할 때만 읽는다. 가져오기만 하는 테스트가 실제 키를 쓰지 않게 한다.
    parser = argparse.ArgumentParser(description="주소로 공실을 등록한다.")
    parser.add_argument("--address", required=True, help="지번 주소. 예: 서울 성동구 성수동2가 300-1")
    parser.add_argument("--floor", type=int, required=True, help="층. 지상 층 번호")
    parser.add_argument("--area", type=float, required=True, help="전용 면적(m²). 실측 또는 임대 안내문")
    parser.add_argument("--ceiling", type=float, default=3.0, help="천장 높이(m)")
    parser.add_argument("--width", type=float, help="가로(m). 있으면 치수 정보에 저장한다")
    parser.add_argument("--depth", type=float, help="세로(m)")
    parser.add_argument("--deposit", type=int, default=0, help="보증금(만원)")
    parser.add_argument("--rent", type=int, default=0, help="월세(만원)")
    parser.add_argument("--condition", choices=["vacant", "has_fixtures", "occupied"], default="vacant",
                        help="vacant=빈 공간, has_fixtures=집기 일부 남음, occupied=영업하던 점포")
    parser.add_argument("--tag", help="목록에 보이는 이름. 기본은 '<층>층 상가'")
    parser.add_argument("--nearby", help="목록에 보이는 위치 설명. 예: 성수역 5분")
    parser.add_argument("--id", help="공실 id. 영문 숫자와 -만. 비우면 주소에서 만든다")
    parser.add_argument("--photos", help="현장 사진 폴더. 첫 번째 사진이 목록 썸네일이 된다")
    parser.add_argument("--dry-run", action="store_true", help="조회와 판정만 보여 주고 저장하지 않는다")
    args = parser.parse_args()

    found = lookup(args.address, args.floor)
    place, title, floor_data = found["place"], found["title"], found["floor"]
    building_use = floor_building_use(title, floor_data)
    verdicts = suitability.evaluate_all(building_use, found["zoning"], args.area)
    costs = estimate_costs(args.area)
    listing_id = args.id or slug_from(args.address, args.floor)

    print(f"\n[1] 주소: {place['address']} (좌표 {place['lat']:.5f}, {place['lng']:.5f}, 법정동 {place['bCode']}, 번지 {place['mainNo']}-{place['subNo']})")
    print(f"[2] 건축물대장: {title.get('mainPurpose')} / 연면적 {title.get('totalAreaM2')}㎡ / 지상 {title.get('groundFloors')}층")
    if floor_data:
        uses = ", ".join(f"{u['purpose']} {u['areaM2']}㎡" for u in floor_data["uses"])
        print(f"    {args.floor}층 용도: {uses}")
    else:
        print(f"    {args.floor}층 정보가 건축물대장에 없습니다. 층 번호를 확인하세요.")
    print(f"[3] 용도지역: {found['zoning'] or '조회 안 됨'}")
    print(f"[4] 반경 300m 점포: 전체 {found['stores'].get('total')}개 / 카페 {found['stores'].get('cafe')}개 / 필라테스 학원 {found['stores'].get('pilates')}개")
    print(f"[5] 판정 기준 용도: {building_use or '(없음)'}")
    for row in verdicts:
        if row["useType"] in USES:
            print(f"    {row['useType']:8s} {row['verdict']:12s} {' / '.join(row['reasons'])}  (추정 창업비 {costs[row['useType']]:,}만)")

    if args.dry_run:
        print("\n--dry-run이라 저장하지 않았습니다. 결과가 맞으면 --dry-run을 빼고 다시 실행하세요.")
        return

    photo_urls = copy_photos(Path(args.photos), listing_id) if args.photos else []
    record = {
        "id": listing_id,
        "tag": args.tag or f"{args.floor}층 상가",
        "address": place["address"],
        "nearby": args.nearby or dong_name(place["address"]),
        "lat": place["lat"],
        "lng": place["lng"],
        "area": args.area,
        "floor": args.floor,
        "ceiling": args.ceiling,
        "deposit": args.deposit,
        "rent": args.rent,
        "building_use": building_use,
        "thumbnail": photo_urls[0] if photo_urls else "/images/space-d.jpg",
        "costs": costs,
        "photos": photo_urls,
        "dimensions": {"widthM": args.width, "depthM": args.depth, "ceilingM": args.ceiling},
        "condition": args.condition,
    }
    save_to_database(record, verdicts)
    report = BACKEND / "data"
    report.mkdir(exist_ok=True)
    (report / f"{listing_id}.json").write_text(json.dumps({**record, "lookup": found}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n저장했습니다: {listing_id}  (사진 {len(photo_urls)}장, 조회 기록 backend/data/{listing_id}.json)")
    print("지도에서 보려면 백엔드 주소의 /listings 또는 사이트의 지도를 새로고침하세요.")


if __name__ == "__main__":
    main()
