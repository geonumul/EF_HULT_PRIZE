# 공실 조회, 미리보기, 업종 적합성, 렌더링 목록, 파트너 공실 등록. 공간 id는 공실 id와 같다.
from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import User, partner_user
from app.data import get_store
from app.schemas import PartnerListingCreate
from app.services import suitability
from app.services.external import building_hub, kakao_local, store_info, vworld

router = APIRouter()


def parse_bbox(text: str) -> tuple[float, float, float, float]:
    """bbox는 "서쪽경도,남쪽위도,동쪽경도,북쪽위도" 순서다."""
    try:
        min_lng, min_lat, max_lng, max_lat = (float(part) for part in text.split(","))
    except ValueError:
        raise HTTPException(status_code=422, detail="bbox는 minLng,minLat,maxLng,maxLat 형식이어야 합니다.")
    return min_lng, min_lat, max_lng, max_lat


def matches_cost(listing: dict, use: str | None, max_cost: int | None) -> bool:
    """use가 있으면 그 업종의 창업비로, 없으면 가장 싼 업종의 창업비로 maxCost(만원)와 비교한다."""
    if use is not None and use not in listing["costs"]:
        return False
    if max_cost is None:
        return True
    costs = [listing["costs"][use]] if use else list(listing["costs"].values())
    return bool(costs) and min(costs) <= max_cost


def get_listing_or_404(listing_id: str) -> dict:
    listing = get_store().get_listing(listing_id)
    if listing is None:
        raise HTTPException(status_code=404, detail="공실을 찾을 수 없습니다.")
    return listing


@router.get("/listings")
def list_listings(
    bbox: str | None = None,
    use: str | None = None,
    max_cost: int | None = Query(default=None, alias="maxCost"),
):
    box = parse_bbox(bbox) if bbox else None
    listings = get_store().list_listings(box)
    return [listing for listing in listings if matches_cost(listing, use, max_cost)]


@router.get("/listings/{listing_id}/preview")
def listing_preview(listing_id: str):
    listing = get_listing_or_404(listing_id)
    return {
        "id": listing["id"],
        "tag": listing["tag"],
        "address": listing["address"],
        "areaM2": listing["areaM2"],
        "photos": [listing["thumbnail"]],
        "renderCount": listing["renderCount"],
        "costs": listing["costs"],
        "verdicts": listing["verdicts"],
    }


@router.get("/spaces/{space_id}/suitability")
def space_suitability(space_id: str):
    listing = get_listing_or_404(space_id)
    store = get_store()
    position = listing["position"]
    zoning = vworld.zoning_at(position["lng"], position["lat"])

    # 저장된 판정이 있으면 그것을 쓰고, 없으면 엔진으로 판정해 저장한다.
    results = store.get_suitability(space_id)
    if not results:
        results = suitability.evaluate_all(listing["buildingUse"], zoning, listing["areaM2"])
        store.save_suitability(space_id, results)

    return {
        "spaceId": space_id,
        "inputs": {"buildingUse": listing["buildingUse"], "zoning": zoning, "areaM2": listing["areaM2"]},
        "results": results,
        # 동종 업소 밀도는 판정에 쓰지 않고 참고 지표로만 보여준다.
        "nearbyStores": store_info.nearby_counts(position["lng"], position["lat"]),
    }


@router.get("/spaces/{space_id}/renders")
def space_renders(space_id: str, use: str | None = None, style: str | None = None):
    get_listing_or_404(space_id)
    renders = get_store().list_renders(space_id)
    if use:
        renders = [render for render in renders if render["useType"] == use]
    if style:
        # 스타일이 정해지지 않은 렌더링은 어느 스타일 요청에도 포함한다.
        renders = [render for render in renders if render.get("style") in (None, style)]
    return renders


@router.post("/partner/listings", status_code=201)
def create_partner_listing(body: PartnerListingCreate, user: User = Depends(partner_user)):
    place = {"lat": body.lat, "lng": body.lng}
    building_use = body.building_use or ""
    if body.lat is None or body.lng is None or not building_use:
        found = kakao_local.geocode(body.address)
        if not found:
            raise HTTPException(status_code=422, detail="주소를 찾을 수 없습니다.")
        place = {"lat": found["lat"], "lng": found["lng"]}
        if not building_use:
            building_use = building_hub.title_info(found["bCode"], found["mainNo"], found["subNo"]).get("mainPurpose", "")

    listing = {
        "tag": body.tag,
        "address": body.address,
        "nearby": body.nearby or body.address,
        "areaM2": body.area_m2,
        "floor": body.floor,
        "ceilingHeightM": body.ceiling_height_m,
        "deposit": body.deposit,
        "rent": body.rent,
        "buildingUse": building_use,
        "condition": body.condition,
        "thumbnail": body.thumbnail,
        "position": place,
    }
    return get_store().add_listing(user.id, listing)
