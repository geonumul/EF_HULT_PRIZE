# 상품 목록, 판매처 링크 클릭, 파트너 상품 등록, JWT 인증
import jwt

from app import data

SECRET = "test-secret-test-secret-test-secret"


def test_products_by_category_cheapest_link_first(client):
    chairs = client.get("/products?category=chair").json()
    assert [p["id"] for p in chairs] == ["chair-oak", "stool-bar"]
    assert [link["price"] for link in chairs[0]["links"]] == [89000, 92400, 93000]
    assert len(client.get("/products").json()) == 10


def test_go_records_click_and_redirects(client):
    response = client.get("/go/chair-oak-b")
    assert response.status_code == 302
    assert response.headers["location"] == "https://example.com/coupang/chair-oak"
    assert data.get_store().count_clicks("chair-oak-b") == 1
    assert client.get("/go/none").status_code == 404


def new_product_body():
    return {
        "name": "새 의자", "category": "chair", "widthMm": 400, "depthMm": 400, "heightMm": 800, "price": 50000,
        "links": [{"source": "partner", "label": "마켓B", "url": "https://example.com/new", "price": 50000}],
    }


def test_partner_product_needs_a_link(client):
    body = {**new_product_body(), "links": []}
    assert client.post("/partner/products", json=body).status_code == 422
    created = client.post("/partner/products", json=new_product_body())
    assert created.status_code == 201
    assert created.json()["id"] in [p["id"] for p in client.get("/products?category=chair").json()]


def test_partner_product_needs_vendor_account(client):
    response = client.post("/partner/products", json=new_product_body(), headers={"X-Demo-User": "stranger"})
    assert response.status_code == 403


def test_jwt_is_checked_when_secret_is_set(client, monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", SECRET)
    body = {"listingId": "seongsu-2ga-1f", "useType": "cafe"}
    assert client.post("/render-jobs", json=body).status_code == 401
    claims = {"sub": "user-1", "aud": "authenticated", "app_metadata": {"role": "user"}}
    headers = {"Authorization": "Bearer " + jwt.encode(claims, SECRET, algorithm="HS256")}
    assert client.post("/render-jobs", json=body, headers=headers).status_code == 201
    assert client.post("/partner/listings", json={"address": "a", "areaM2": 10}, headers=headers).status_code == 403
    assert client.post("/render-jobs", json=body, headers={"Authorization": "Bearer bad"}).status_code == 401
