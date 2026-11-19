# 면적으로 업종별 창업비를 추정한다. 공실 등록 도구와 공실 후보의 공간 정보가 같은 계산을 쓴다.
from app.services.quote import CONSTRUCTION_WON_PER_M2, facility_cost

USES = ["cafe", "popup", "pilates"]

# 집기 비용을 면적에 비례해 잡는 예시 단가(원/m²). 기본 배치(카페 11개 테이블 등)의 집기 합계에서 계산했다.
FURNITURE_WON_PER_M2 = {"cafe": 287000, "popup": 85000, "pilates": 490000}


def estimate_costs(area_m2: float) -> dict:
    """업종별 창업비를 만원 단위로 추정한다. 집기, 설비, 시공을 더한다. 철거비는 견적서에서 따로 더한다."""
    costs = {}
    for use in USES:
        furniture = area_m2 * FURNITURE_WON_PER_M2[use]
        construction = area_m2 * CONSTRUCTION_WON_PER_M2
        costs[use] = round((furniture + facility_cost(use) + construction) / 10000)
    return costs
