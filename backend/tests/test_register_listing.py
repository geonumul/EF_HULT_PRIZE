# 공실 등록 도구의 순수 계산 부분을 검증한다. 네트워크와 DB는 쓰지 않는다.
from scripts.register_listing import dong_name, estimate_costs, floor_building_use, slug_from


def test_dong_name():
    assert dong_name("서울 성동구 성수동2가 300-1") == "성수동2가"


def test_slug():
    assert slug_from("서울 성동구 성수동2가 300-1", 1) == "listing-300-1-1f"


def test_floor_use_prefers_floor_detail():
    floor = {"uses": [{"purpose": "소매점", "detail": "제1종근린생활시설(소매점)", "areaM2": 30}]}
    assert floor_building_use({"mainPurpose": "업무시설"}, floor) == "제1종근린생활시설"


def test_floor_use_falls_back_to_title():
    assert floor_building_use({"mainPurpose": "제2종근린생활시설"}, {}) == "제2종근린생활시설"


def test_costs_match_quote_for_cafe():
    # 39.6m² 카페: 집기 11,365,200 + 설비 4,700,000 + 시공 17,820,000 = 33,885,200원 -> 3,389만
    assert estimate_costs(39.6)["cafe"] == 3389
