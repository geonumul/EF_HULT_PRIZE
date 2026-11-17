# 네이버 쇼핑 검색. 상품 수집 배치용이다. 키: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
import httpx

from app.config import env

URL = "https://openapi.naver.com/v1/search/shop.json"

DEMO_ITEMS = [
    {
        "productId": "naver-demo-1",
        "name": "오크 원목 체어",
        "price": 93000,
        "mall": "마켓B",
        "imageUrl": "",
        "url": "https://example.com/naver/chair-oak",
    },
]


def search_products(keyword: str, limit: int = 20) -> list[dict]:
    client_id, client_secret = env("NAVER_CLIENT_ID"), env("NAVER_CLIENT_SECRET")
    if not client_id or not client_secret:
        return list(DEMO_ITEMS)
    headers = {"X-Naver-Client-Id": client_id, "X-Naver-Client-Secret": client_secret}
    response = httpx.get(URL, params={"query": keyword, "display": limit}, headers=headers, timeout=10)
    response.raise_for_status()
    # TODO: 공식 문서 확인. 필드 이름 title, lprice, mallName, image, link, productId는 추정이다.
    # NAVER API HUB 이관 여부도 확인한다. title에는 <b> 태그가 섞일 수 있다.
    return [
        {
            "productId": item.get("productId", ""),
            "name": item.get("title", ""),
            "price": int(item.get("lprice") or 0),
            "mall": item.get("mallName", ""),
            "imageUrl": item.get("image", ""),
            "url": item.get("link", ""),
        }
        for item in response.json().get("items", [])
    ]
