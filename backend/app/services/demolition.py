# 철거비 추정. 단가는 quote.py의 예시 단가를 쓴다.
# TODO: 철거 업체 2~3곳의 실제 단가표를 받으면 범위(RANGE)와 부위별 단가로 바꾼다. (docs/FEATURES.md)
from app.services.quote import DEMOLITION_WON_PER_M2, js_round

CONDITION_RATIO = {"vacant": 0, "has_fixtures": 0.5, "occupied": 1}  # 빈 공간, 부분 철거, 전체 철거
RANGE_LOW, RANGE_HIGH = 0.8, 1.2  # 예시 범위. 실제 단가표 전까지 쓰는 값이다.

CHECKLIST = [
    "건물주 동의 여부",
    "원상복구 범위",
    "폐기물 처리 방법",
    "건축 연도가 오래된 건물이면 석면 조사가 필요할 수 있습니다. 확정은 업체와 관할 기관에 확인하세요.",
]


def estimate(listing: dict, scope: dict) -> dict:
    """하한과 상한 범위를 돌려준다. 법적 판단은 하지 않고 확인할 항목만 알린다."""
    ratio = CONDITION_RATIO.get(listing["condition"], 1)
    base = listing["areaM2"] * DEMOLITION_WON_PER_M2 * ratio
    return {
        "spaceId": listing["id"],
        "condition": listing["condition"],
        "areaM2": listing["areaM2"],
        "scope": scope,
        "lowWon": js_round(base * RANGE_LOW),
        "highWon": js_round(base * RANGE_HIGH),
        "checklist": CHECKLIST,
        "note": "예시 단가 기준 추정입니다. 업체 견적으로 확정됩니다.",
    }
