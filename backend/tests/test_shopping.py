# 인터넷 상품 검색
from app.routers import shopping
from app.services.external import naver_shopping


def test_search_without_keys_returns_empty(client):
    body = client.get("/shopping/search?q=오크 체어").json()
    assert body == {"configured": False, "items": []}


def test_search_returns_items_and_caches(client, monkeypatch):
    monkeypatch.setenv("NAVER_CLIENT_ID", "id")
    monkeypatch.setenv("NAVER_CLIENT_SECRET", "secret")
    shopping._cache.clear()
    calls = []

    def fake_search(keyword, limit):
        calls.append(keyword)
        return [{"productId": "1", "name": "오크 체어", "price": 89000, "mall": "몰", "imageUrl": "", "url": "https://shop.example/1"}]

    monkeypatch.setattr(naver_shopping, "search_products", fake_search)
    first = client.get("/shopping/search?q=오크 체어&limit=1").json()
    client.get("/shopping/search?q=오크 체어&limit=1")
    assert first["configured"] is True
    assert first["items"][0]["price"] == 89000
    assert calls == ["오크 체어"]  # 두 번째 요청은 저장된 결과를 쓴다.


def test_search_failure_falls_back_to_empty(client, monkeypatch):
    monkeypatch.setenv("NAVER_CLIENT_ID", "id")
    monkeypatch.setenv("NAVER_CLIENT_SECRET", "secret")
    shopping._cache.clear()

    def broken(keyword, limit):
        raise RuntimeError("외부 서비스 오류")

    monkeypatch.setattr(naver_shopping, "search_products", broken)
    assert client.get("/shopping/search?q=조명").json() == {"configured": True, "items": []}
