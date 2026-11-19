# 공실 후보를 공간 정보로 바꾸는 계산
from app.services.candidate_space import CELL_LAT, CELL_LNG, DEFAULT_AREA_M2, building_use_of, image_for, space_from_candidate

CANDIDATE = {
    "id": "1120010100-1",
    "address": "서울특별시 성동구 성수동1가 656-449",
    "buildingName": "와이지포레스트",
    "floor": 1,
    "floorUse": "일반음식점",
    "floorDetail": "제2종근린생활시설(일반음식점)",
    "floorAreaM2": 35.65,
    "confidence": 0.65,
    "position": {"lat": 37.54, "lng": 127.05},
}


def test_building_use_comes_from_floor_detail():
    assert building_use_of(CANDIDATE) == "제2종근린생활시설"
    assert building_use_of({"floorDetail": "", "floorUse": "소매점"}) == "소매점"


def test_space_has_costs_and_verdicts_for_three_uses():
    space = space_from_candidate(CANDIDATE)
    assert space["id"] == "1120010100-1"
    assert space["address"] == "성동구 성수동1가 656-449"
    assert space["areaM2"] == 35.65
    assert set(space["costs"]) == {"cafe", "popup", "pilates"}
    assert set(space["verdicts"]) == {"cafe", "popup", "pilates"}
    assert space["terms"] == "inquiry"  # 임대 조건을 모른다


def test_unknown_area_uses_default():
    space = space_from_candidate({**CANDIDATE, "floorAreaM2": None})
    assert space["areaM2"] == DEFAULT_AREA_M2


def test_route_returns_404_without_candidate(client):
    assert client.get("/vacancy-candidates/none/space").status_code == 404


def test_neighbor_cells_get_different_images():
    base = {"lat": 37.5400, "lng": 127.0500}
    here = image_for(base)
    assert image_for({"lat": base["lat"] + CELL_LAT, "lng": base["lng"]}) != here
    assert image_for({"lat": base["lat"], "lng": base["lng"] + CELL_LNG}) != here
    assert image_for({"lat": base["lat"] + CELL_LAT, "lng": base["lng"] + CELL_LNG}) != here
    assert image_for(base) == here  # 같은 자리는 같은 사진


def test_space_uses_example_photo():
    assert space_from_candidate(CANDIDATE)["thumbnail"].startswith("/images/spaces/space-")
