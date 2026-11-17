# 견적 계산(프론트 lib/quote.ts 와 같은 합계), 확정, 주문 검증
from datetime import datetime, timezone

from app.services.external.coupang import make_authorization

CAFE_RENDER = "r-seongsu-2ga-1f-cafe"


def test_cafe_quote_matches_frontend_total(client):
    quote = client.get(f"/quotes/draft?renderId={CAFE_RENDER}").json()
    sums = {group["key"]: group["sum"] for group in quote["groups"]}
    assert sums == {"items": 11366000, "facility": 4700000, "construction": 17820000}
    assert quote["total"] == 33886000
    assert quote["usedSaving"] == 3764000
    assert quote["groups"][0]["items"][0] == {
        "name": "오크 원목 체어", "spec": "W450 × D520 · 신품", "qty": 22, "unitPrice": 89000, "productId": "chair-oak",
    }


def test_used_products_lower_the_total(client):
    quote = client.get(f"/quotes/draft?renderId={CAFE_RENDER}&used=chair-oak,fridge-showcase").json()
    # 의자 (89000-52000)*22 + 냉장고 (1280000-780000)*1
    assert quote["total"] == 33886000 - 814000 - 500000
    assert quote["usedSaving"] == 3764000 - 814000 - 500000
    assert quote["groups"][0]["items"][0]["spec"].endswith("중고")


def test_demolition_group_for_occupied_space(client):
    quote = client.get("/quotes/draft?renderId=r-seongsu-stn-2f-popup").json()
    groups = {group["key"]: group["sum"] for group in quote["groups"]}
    assert groups["demolition"] == 12696000  # 105.8m² x 120,000원 (전체 철거)
    partial = client.get("/quotes/draft?renderId=r-ttukseom-1f-pilates").json()
    assert {g["key"]: g["sum"] for g in partial["groups"]}["demolition"] == 2772000  # 46.2m² 부분 철거


def test_unknown_render_is_404(client):
    assert client.get("/quotes/draft?renderId=nope").status_code == 404


def order_body(amount, order_id="order-0001"):
    return {"quote_id": CAFE_RENDER, "payment_key": "pay_test_1", "order_id": order_id, "amount": amount}


def test_order_requires_confirmed_quote(client):
    assert client.post("/orders", json=order_body(33886000)).status_code == 409


def test_order_flow_with_demo_approval(client):
    assert client.post(f"/quotes/{CAFE_RENDER}/confirm").json()["status"] == "confirmed"
    assert client.post("/orders", json=order_body(1000)).status_code == 400  # 금액 불일치
    assert client.post("/orders", json={**order_body(33886000), "order_id": "x"}).status_code == 422  # 주문번호 형식
    paid = client.post("/orders", json=order_body(33886000))
    assert paid.status_code == 201
    assert paid.json()["status"] == "paid" and paid.json()["demo"] is True
    assert client.post("/orders", json=order_body(33886000)).status_code == 409  # 같은 주문번호 재요청


def test_confirm_keeps_used_choice(client):
    confirmed = client.post(f"/quotes/{CAFE_RENDER}/confirm?used=chair-oak").json()
    assert confirmed["total"] == 33886000 - 814000
    assert client.post("/orders", json=order_body(33886000)).status_code == 400
    assert client.post("/orders", json=order_body(33886000 - 814000)).status_code == 201


def test_coupang_signature_is_hex_hmac():
    now = datetime(2026, 1, 2, 3, 4, 5, tzinfo=timezone.utc)
    header = make_authorization("GET", "/path", "a=1", "AK", "SK", now)
    assert header.startswith("CEA algorithm=HmacSHA256, access-key=AK, signed-date=260102T030405Z, signature=")
    assert len(header.rsplit("signature=", 1)[1]) == 64
