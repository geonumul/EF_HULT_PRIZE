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
    # TODO: 공식 문서 확인. 응답 래퍼 구조(response.body.items.item)와 번지 자리수 규칙.
    items = response.json().get("response", {}).get("body", {}).get("items", {}).get("item", [])
    return items if isinstance(items, list) else [items]


def title_info(bcode: str, main_no: str, sub_no: str) -> dict:
    """표제부. 주용도, 연면적, 지상 층수."""
    if not env("DATA_GO_KR_KEY"):
        return dict(DEMO_TITLE)
    items = _get("getBrTitleInfo", bcode, main_no, sub_no)
    if not items:
        return {}
    first = items[0]
    # TODO: 공식 문서 확인. 필드 이름 mainPurpsCdNm, totArea, grndFlrCnt는 추정이다.
    return {
        "mainPurpose": first.get("mainPurpsCdNm", ""),
        "totalAreaM2": first.get("totArea"),
        "groundFloors": first.get("grndFlrCnt"),
    }


def floor_info(bcode: str, main_no: str, sub_no: str, floor: int) -> dict:
    """층별개요. 해당 층의 용도와 면적."""
    if not env("DATA_GO_KR_KEY"):
        return dict(DEMO_FLOOR, floor=floor)
    for item in _get("getBrFlrOulnInfo", bcode, main_no, sub_no):
        # TODO: 공식 문서 확인. 필드 이름 flrNo, mainPurpsCdNm, area는 추정이다.
        if item.get("flrNo") == floor:
            return {"floor": floor, "purpose": item.get("mainPurpsCdNm", ""), "areaM2": item.get("area")}
    return {}
