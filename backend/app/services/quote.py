# 견적 계산. frontend/src/lib/quote.ts 와 같은 규칙이다. 같은 입력이면 같은 합계가 나와야 한다.
# 설비, 시공, 철거 단가는 화면을 채우기 위한 예시 값이다. 실제 단가표를 받으면 이 파일의 숫자만 바꾼다.
import math

CONSTRUCTION_WON_PER_M2 = 450000  # 인테리어 시공 단가 (예시)
DEMOLITION_WON_PER_M2 = 120000  # 철거 단가 (예시)

# 업종별 설비 추가 공사 (예시). 적합성 엔진의 추가 설비비도 이 표를 쓴다.
FACILITY_BY_USE = {
    "cafe": [
        {"name": "급배수 공사", "spec": "싱크대, 제빙기 배관", "qty": 1, "unitPrice": 2800000},
        {"name": "환기·덕트", "spec": "주방 후드 연결", "qty": 1, "unitPrice": 1900000},
    ],
    "popup": [{"name": "전기 증설", "spec": "조명, 콘센트 증설", "qty": 1, "unitPrice": 900000}],
    "pilates": [
        {"name": "바닥 방진 공사", "spec": "층간 소음 대책", "qty": 1, "unitPrice": 3200000},
        {"name": "환기 보강", "spec": "운동 인원 기준", "qty": 1, "unitPrice": 1200000},
    ],
}


def js_round(value: float) -> int:
    """자바스크립트 Math.round와 같은 반올림. 프론트와 금액을 맞추려고 쓴다."""
    return math.floor(value + 0.5)


def sum_of(items: list[dict]) -> int:
    return sum(item["unitPrice"] * item["qty"] for item in items)


def facility_cost(use_type: str) -> int:
    return sum_of(FACILITY_BY_USE.get(use_type, []))


def _product_items(render: dict, used_product_ids: list[str], products: dict) -> tuple[list[dict], int]:
    """집기 항목과 중고로 바꿨을 때 줄어드는 금액을 계산한다."""
    items = []
    used_saving = 0
    for tag in render["tags"]:
        product = products.get(tag["productId"])
        if product is None:
            continue
        has_used_price = product.get("usedPrice") is not None
        use_used = product["id"] in used_product_ids and has_used_price
        unit_price = product["usedPrice"] if use_used else product["price"]
        if not use_used and has_used_price:
            used_saving += (product["price"] - product["usedPrice"]) * tag["qty"]
        items.append({
            "name": product["name"],
            "spec": f"W{product['widthMm']} × D{product['depthMm']} · {'중고' if use_used else '신품'}",
            "qty": tag["qty"],
            "unitPrice": unit_price,
            "productId": product["id"],
        })
    return items, used_saving


def _demolition_items(listing: dict) -> list[dict]:
    is_occupied = listing["condition"] == "occupied"
    ratio = 1 if is_occupied else 0.5  # 집기만 남은 곳은 부분 철거
    area = listing["areaM2"]
    return [{
        "name": "전체 철거" if is_occupied else "부분 철거",
        "spec": f"{_area_text(area)}m² 기준 (업체 견적으로 확정)",
        "qty": 1,
        "unitPrice": js_round(area * DEMOLITION_WON_PER_M2 * ratio),
    }]


def _area_text(area: float) -> str:
    """39.0 이 아니라 39 로 적는다. 자바스크립트 숫자 출력과 맞춘다."""
    return str(int(area)) if float(area).is_integer() else str(area)


def _group(key: str, title: str, items: list[dict]) -> dict:
    return {"key": key, "title": title, "sum": sum_of(items), "items": items}


def build_quote(render: dict, listing: dict | None, products: dict, used_product_ids: list[str] | None = None) -> dict:
    """렌더링 결과로 견적서를 만든다. used_product_ids에 든 상품은 중고 가격으로 계산한다."""
    used_product_ids = used_product_ids or []
    area = listing["areaM2"] if listing else 0

    product_items, used_saving = _product_items(render, used_product_ids, products)
    groups = [_group("items", "집기", product_items)]
    groups.append(_group("facility", "설비 추가 공사", FACILITY_BY_USE.get(render["useType"], [])))
    construction = [{
        "name": "인테리어 시공",
        "spec": f"{_area_text(area)}m² 기준 평균 단가",
        "qty": 1,
        "unitPrice": js_round(area * CONSTRUCTION_WON_PER_M2),
    }]
    groups.append(_group("construction", "인테리어 시공", construction))

    # 철거는 빈 공간이 아닐 때만 들어간다.
    if listing and listing["condition"] != "vacant":
        groups.append(_group("demolition", "철거", _demolition_items(listing)))

    total = sum(group["sum"] for group in groups)
    return {"id": render["id"], "renderId": render["id"], "groups": groups, "total": total, "usedSaving": used_saving}
