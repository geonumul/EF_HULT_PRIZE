# 건축HUB 건축물대장. 표제부 주용도와 층별개요를 조회한다. 키: DATA_GO_KR_KEY
import httpx

from app.config import env

BASE = "https://apis.data.go.kr/1613000/BldRgstHubService"

# Figma "09" 예시값: 1층 제2종 근린생활시설, 39.6m²
DEMO_TITLE = {"mainPurpose": "제2종 근린생활시설", "totalAreaM2": 39.6, "groundFloors": 5}
DEMO_FLOOR = {"floor": 1, "purpose": "제2종 근린생활시설", "areaM2": 39.6}


def _get(operation: str, bcode: str, main_no: str, sub_no: str) -> list[dict]:
    params = {
        "serviceKey": env("DATA_GO_KR_KEY"),
        "sigunguCd": bcode[:5],  # b_code 앞 5자리가 시군구
        "bjdongCd": bcode[5:],  # 뒤 5자리가 법정동
        "bun": main_no.zfill(4),
        "ji": (sub_no or "0").zfill(4),
        "_type": "json",
    }
    response = httpx.get(f"{BASE}/{operation}", params=params, timeout=10)
    response.raise_for_status()
    # 응답 구조: response.body.items.item (항목이 하나면 목록이 아니라 객체로 온다). 2026-11 실제 응답으로 확인했다.
    items = response.json().get("response", {}).get("body", {}).get("items", {})
    items = items.get("item", []) if isinstance(items, dict) else []
    return items if isinstance(items, list) else [items]


def title_info(bcode: str, main_no: str, sub_no: str) -> dict:
    """표제부. 주용도, 연면적, 지상 층수."""
    if not env("DATA_GO_KR_KEY"):
        return dict(DEMO_TITLE)
    items = _get("getBrTitleInfo", bcode, main_no, sub_no)
    if not items:
        return {}
    first = items[0]
    # 필드 이름은 실제 응답으로 확인했다: mainPurpsCdNm(주용도), totArea(연면적), grndFlrCnt(지상 층수).
    return {
        "mainPurpose": first.get("mainPurpsCdNm", ""),
        "totalAreaM2": first.get("totArea"),
        "groundFloors": first.get("grndFlrCnt"),
    }


def floor_info(bcode: str, main_no: str, sub_no: str, floor: int) -> dict:
    """층별개요. 해당 지상 층의 용도와 면적. 한 층에 용도가 여러 개이면 uses에 모두 담는다."""
    if not env("DATA_GO_KR_KEY"):
        return dict(DEMO_FLOOR, floor=floor)
    uses = []
    for item in _get("getBrFlrOulnInfo", bcode, main_no, sub_no):
        # 필드: flrNo(층 번호), flrGbCdNm(지상/지하), mainPurpsCdNm(주용도), etcPurps(기타 용도 설명), area(면적)
        if item.get("flrGbCdNm") != "지상" or item.get("flrNo") != floor:
            continue
        uses.append({"purpose": item.get("mainPurpsCdNm", ""), "detail": item.get("etcPurps", ""), "areaM2": item.get("area")})
    if not uses:
        return {}
    biggest = max(uses, key=lambda use: use["areaM2"] or 0)
    return {"floor": floor, "purpose": biggest["purpose"], "areaM2": biggest["areaM2"], "uses": uses}
