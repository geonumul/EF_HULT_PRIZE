# 업종 적합성 엔진. 건축물대장 주용도, 용도지역, 면적으로 가능, 조건부, 불가를 판정한다.
# 기준은 RULES 표에만 있다. 법령 수치를 지어내지 않고 Figma "09 API · 상품 연결"의 예시 흐름에 나온 규칙만 넣었다.
# 표에 없는 업종과 경우는 조건부로 두고 확인할 항목을 알린다.
from app.services.quote import facility_cost

NEIGHBORHOOD_USES = ["제1종 근린생활시설", "제2종 근린생활시설"]

RULES = {
    "cafe": {
        "allowed_uses": NEIGHBORHOOD_USES,
        "max_area_m2": 300,
        "possible_reason": "휴게음식점 300m² 미만",
        "over_area_reason": "휴게음식점 300m² 이상은 기준 확인이 필요합니다",  # TODO: 실제 기준 확인 필요
    },
    "popup": {
        "allowed_uses": NEIGHBORHOOD_USES,
        "possible_reason": "팝업 운영 가능",
    },
    "pilates": {
        "allowed_uses": NEIGHBORHOOD_USES,
        "conditions": ["층간 소음 확인"],
    },
}

# 규칙표에 없는 업종. TODO: 실제 기준 확인 필요
UNKNOWN_USE_REASON = "업종 기준 확인이 필요합니다"
UNKNOWN_BUILDING_USE_REASON = "건축물대장 주용도가 규칙표에 없어 확인이 필요합니다"  # TODO: 실제 기준 확인 필요

ALL_USE_TYPES = ["cafe", "popup", "pilates", "restaurant", "retail", "service", "office"]


def _compact(text: str) -> str:
    """건축물대장은 '제1종근린생활시설'처럼 띄어쓰기 없이 준다. 비교할 때는 공백을 모두 뺀다."""
    return "".join((text or "").split())


def _result(use_type: str, verdict: str, reasons: list[str]) -> dict:
    return {"useType": use_type, "verdict": verdict, "reasons": reasons, "extraCostWon": facility_cost(use_type)}


def evaluate_use(use_type: str, building_use: str, zoning: str, area_m2: float) -> dict:
    """업종 하나를 판정한다. zoning(용도지역)은 결과에 참고로만 쓰고 판정에는 아직 쓰지 않는다."""
    rule = RULES.get(use_type)
    if rule is None:
        return _result(use_type, "conditional", [UNKNOWN_USE_REASON])
    if _compact(building_use) not in [_compact(use) for use in rule["allowed_uses"]]:
        return _result(use_type, "conditional", [UNKNOWN_BUILDING_USE_REASON])
    if "max_area_m2" in rule and area_m2 >= rule["max_area_m2"]:
        return _result(use_type, "conditional", [rule["over_area_reason"]])
    if rule.get("conditions"):
        return _result(use_type, "conditional", list(rule["conditions"]))
    return _result(use_type, "possible", [rule["possible_reason"]])


def evaluate_all(building_use: str, zoning: str, area_m2: float) -> list[dict]:
    return [evaluate_use(use_type, building_use, zoning, area_m2) for use_type in ALL_USE_TYPES]
