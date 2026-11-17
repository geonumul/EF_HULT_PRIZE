"""공실 후보 판정. 네트워크를 쓰지 않는 계산만 있다.

건축물대장에서 상가 층을 고르고, 상가정보에 같은 번지와 층의 영업 점포가 없으면 후보로 본다.
층 값이 빈 점포가 같은 번지에 많으면 후보의 가능성을 낮춘다.
결과는 추정이다. 현장이나 중개사가 확인하기 전까지 "확인 전" 후보로만 쓴다.
"""
import re

# 건축물대장 층별 주용도 중 창업 대상이 되는 상가 용도
COMMERCIAL_PURPOSES = {
    "소매점", "일반음식점", "휴게음식점", "제과점", "이용원", "미용원", "목욕장", "세탁소",
    "의원", "치과의원", "한의원", "학원", "체육시설", "판매시설",
}
# 사무소는 점포로 등록되지 않는 경우가 많아서 뺐다. 점포가 없다는 사실이 공실을 뜻하지 않는다.
# 후보에서 제외할 용도(상가가 아니거나 창업 공간이 아니다)
EXCLUDED_PURPOSES = {"주차장", "계단실", "승강기", "기계실", "전기실", "공용", "대피공간"}

MIN_UNIT_AREA_M2 = 15  # 이보다 작은 층은 창업 공간으로 보기 어렵다.
LARGE_FLOOR_AREA_M2 = 300  # 이보다 큰 층은 호실이 여러 개일 수 있다.


def parse_parcel(lno_code: str, plot_code: str) -> dict:
    """상가정보의 지번 코드(19자리)를 건축HUB 조회용 값으로 나눈다.

    지번 코드는 시군구 5, 법정동 5, 대지구분 1, 본번 4, 부번 4자리다.
    대지구분은 상가정보에서 '1'이 대지이고, 건축HUB에서는 '0'이 대지다. 두 서비스의 값이 다르다.
    """
    return {
        "sigunguCd": lno_code[:5],
        "bjdongCd": lno_code[5:10],
        "platGbCd": "0" if plot_code == "1" else "1",
        "bun": lno_code[11:15],
        "ji": lno_code[15:19],
    }


def parse_store_floor(value: str):
    """상가정보의 층 값을 숫자로 바꾼다. 지상 층만 돌려주고, 비었거나 지하이면 None이다."""
    text = (value or "").strip()
    if re.fullmatch(r"\d{1,3}", text):
        return int(text)
    return None


def is_commercial_floor(item: dict) -> bool:
    """건축물대장 층별 항목이 상가로 쓰는 지상 층인가."""
    if item.get("flrGbCdNm") != "지상":
        return False
    purpose = (item.get("mainPurpsCdNm") or "").strip()
    detail = (item.get("etcPurps") or "").strip()
    if any(word in purpose or word in detail for word in EXCLUDED_PURPOSES):
        return False
    if purpose == "사무소" or detail.endswith("(사무소)"):
        return False
    return purpose in COMMERCIAL_PURPOSES or "근린생활시설" in detail


def score(floor: int, area_m2: float | None, unknown_floor_stores: int) -> tuple[float, list[str]]:
    """후보의 가능성(0~1)과 이유를 돌려준다. 높을수록 비어 있을 가능성이 크다."""
    value = 0.5
    reasons = ["건축물대장상 상가 층인데 영업 점포가 확인되지 않음"]
    if floor <= 2:
        value += 0.15
        reasons.append("1~2층이라 창업 수요가 많은 층")
    if area_m2 is not None and area_m2 > LARGE_FLOOR_AREA_M2:
        value -= 0.15
        reasons.append("층 면적이 커서 호실이 여러 개일 수 있음")
    if unknown_floor_stores >= 3:
        value -= 0.2
        reasons.append(f"같은 번지에 층 정보가 없는 점포 {unknown_floor_stores}개가 있어 불확실")
    elif unknown_floor_stores > 0:
        value -= 0.1
        reasons.append(f"같은 번지에 층 정보가 없는 점포 {unknown_floor_stores}개")
    return round(max(0.05, min(0.95, value)), 2), reasons


def find_candidates(parcel: dict, floors: list[dict], stores: list[dict]) -> list[dict]:
    """한 번지의 후보를 찾는다.

    parcel: {"address", "lat", "lng", "buildingName"}
    floors: 건축HUB 층별개요 항목 목록
    stores: 같은 번지의 상가정보 점포 목록
    """
    stores_by_floor: dict[int, int] = {}
    unknown = 0
    for store in stores:
        floor = parse_store_floor(store.get("flrNo", ""))
        if floor is None:
            if not (store.get("flrNo") or "").strip():
                unknown += 1  # 층 값이 아예 비어 있음. 지하(B1 등)는 후보 층과 무관하므로 세지 않는다.
            continue
        stores_by_floor[floor] = stores_by_floor.get(floor, 0) + 1

    # 같은 층의 용도 항목이 여러 개면 면적이 가장 큰 상가 항목을 그 층의 대표로 쓴다.
    biggest: dict[int, dict] = {}
    for item in floors:
        if not is_commercial_floor(item):
            continue
        floor = item.get("flrNo")
        if not isinstance(floor, int):
            continue
        if floor not in biggest or (item.get("area") or 0) > (biggest[floor].get("area") or 0):
            biggest[floor] = item

    candidates = []
    for floor, item in sorted(biggest.items()):
        area = item.get("area")
        if stores_by_floor.get(floor, 0) > 0:
            continue  # 영업 점포가 있는 층은 후보가 아니다.
        if area is not None and area < MIN_UNIT_AREA_M2:
            continue
        confidence, reasons = score(floor, area, unknown)
        candidates.append({
            "floor": floor,
            "floorUse": item.get("mainPurpsCdNm", ""),
            "floorDetail": item.get("etcPurps", ""),
            "floorAreaM2": area,
            "storesOnFloor": 0,
            "unknownFloorStores": unknown,
            "confidence": confidence,
            "reasons": reasons,
        })
    return candidates
