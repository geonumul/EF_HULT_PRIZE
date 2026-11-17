# 공실 조회와 필터, 미리보기, 적합성, 렌더링 목록, 파트너 공실 등록
from app.services.suitability import evaluate_use

CAFE_RENDER = "r-seongsu-2ga-1f-cafe"


def test_list_all_listings(client):
    listings = client.get("/listings").json()
    assert [item["id"] for item in listings] == ["seongsu-2ga-1f", "ttukseom-1f", "seoulsup-corner-1f", "seongsu-stn-2f"]
    first = listings[0]
    assert first["areaM2"] == 39.6 and first["costs"]["cafe"] == 4200 and first["position"]["lat"] == 37.5446


def test_filter_by_use_and_max_cost(client):
    ids = [item["id"] for item in client.get("/listings?use=cafe&maxCost=4500").json()]
    assert ids == ["seongsu-2ga-1f", "seoulsup-corner-1f"]  # 4200, 3600만원
    ids = [item["id"] for item in client.get("/listings?use=popup&maxCost=1900").json()]
    assert ids == ["seongsu-2ga-1f", "seoulsup-corner-1f"]
    assert client.get("/listings?maxCost=1000").json() == []


def test_filter_by_bbox(client):
    # 서울숲 코너만 들어가는 영역 (경도 127.03~127.04)
    ids = [item["id"] for item in client.get("/listings?bbox=127.03,37.54,127.04,37.55").json()]
    assert ids == ["seoulsup-corner-1f"]
    assert client.get("/listings?bbox=abc").status_code == 422


def test_preview(client):
    preview = client.get("/listings/ttukseom-1f/preview").json()
    assert preview["costs"] == {"pilates": 5600, "cafe": 4900, "popup": 2100}
    assert client.get("/listings/none/preview").status_code == 404


def test_suitability_endpoint_uses_saved_verdicts(client):
    body = client.get("/spaces/seongsu-2ga-1f/suitability").json()
    verdicts = {row["useType"]: row["verdict"] for row in body["results"]}
    assert verdicts == {"cafe": "possible", "popup": "possible", "pilates": "conditional"}
    assert body["inputs"]["zoning"] == "준공업지역"
    assert body["nearbyStores"] == {"cafe": 41, "pilates": 3}
    cafe = next(row for row in body["results"] if row["useType"] == "cafe")
    assert cafe["extraCostWon"] == 4700000


def test_engine_rules():
    cafe = evaluate_use("cafe", "제2종 근린생활시설", "준공업지역", 39.6)
    assert cafe["verdict"] == "possible" and cafe["reasons"] == ["휴게음식점 300m² 미만"]
    assert evaluate_use("cafe", "제2종 근린생활시설", "준공업지역", 300)["verdict"] == "conditional"
    pilates = evaluate_use("pilates", "제2종 근린생활시설", "준공업지역", 39.6)
    assert pilates["verdict"] == "conditional" and "층간 소음 확인" in pilates["reasons"]
    assert evaluate_use("popup", "제2종 근린생활시설", "준공업지역", 39.6)["verdict"] == "possible"
    assert evaluate_use("office", "제2종 근린생활시설", "준공업지역", 39.6)["verdict"] == "conditional"
    assert evaluate_use("cafe", "단독주택", "준공업지역", 39.6)["verdict"] == "conditional"


def test_renders_filter(client):
    renders = client.get("/spaces/seongsu-2ga-1f/renders").json()
    assert len(renders) == 3
    only_cafe = client.get("/spaces/seongsu-2ga-1f/renders?use=cafe&style=modern").json()
    assert [render["id"] for render in only_cafe] == [CAFE_RENDER]
    assert len(only_cafe[0]["tags"]) == 6


def test_partner_listing_is_new_and_diagnosed_by_engine(client):
    body = {"address": "서울 성동구 성수동2가 1", "areaM2": 30, "deposit": 1000, "rent": 100}
    created = client.post("/partner/listings", json=body)
    assert created.status_code == 201
    listing = created.json()
    assert listing["buildingUse"] == "제2종 근린생활시설"  # 건축HUB 데모 값
    assert listing["position"]["lng"] == 127.05  # 카카오 로컬 데모 값
    assert listing["id"] in [item["id"] for item in client.get("/listings").json()]
    results = client.get(f"/spaces/{listing['id']}/suitability").json()["results"]
    assert {row["useType"]: row["verdict"] for row in results}["cafe"] == "possible"
