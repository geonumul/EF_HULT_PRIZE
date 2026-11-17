# 공실 후보 판정 규칙을 검증한다. 네트워크는 쓰지 않는다.
from app.services import vacancy


def floor_item(floor, purpose="소매점", detail="제1종근린생활시설(소매점)", area=60.0, kind="지상"):
    return {"flrNo": floor, "flrGbCdNm": kind, "mainPurpsCdNm": purpose, "etcPurps": detail, "area": area}


def test_parse_parcel_converts_plot_code():
    parts = vacancy.parse_parcel("1120011500103150071", "1")
    assert parts == {"sigunguCd": "11200", "bjdongCd": "11500", "platGbCd": "0", "bun": "0315", "ji": "0071"}


def test_store_floor_parsing():
    assert vacancy.parse_store_floor("8") == 8
    assert vacancy.parse_store_floor("B1") is None
    assert vacancy.parse_store_floor("") is None


def test_floor_without_store_is_candidate():
    result = vacancy.find_candidates({}, [floor_item(1), floor_item(2)], [{"flrNo": "2"}])
    assert [c["floor"] for c in result] == [1]


def test_office_floor_is_not_candidate():
    result = vacancy.find_candidates({}, [floor_item(2, "사무소", "제2종근린생활시설(사무소)")], [])
    assert result == []


def test_underground_and_parking_are_ignored():
    items = [floor_item(1, kind="지하"), floor_item(1, "주차장", "주차장")]
    assert vacancy.find_candidates({}, items, []) == []


def test_small_floor_is_skipped():
    assert vacancy.find_candidates({}, [floor_item(1, area=10)], []) == []


def test_unknown_floor_stores_lower_confidence():
    clean = vacancy.find_candidates({}, [floor_item(1)], [])[0]["confidence"]
    unsure = vacancy.find_candidates({}, [floor_item(1)], [{"flrNo": ""}] * 3)[0]["confidence"]
    assert unsure < clean
