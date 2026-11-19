# 네이버 쇼핑 검색. 상품 이름으로 실제 판매 중인 상품과 최저가를 찾는다. 키: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
# 키는 developers.naver.com에서 애플리케이션을 만들고 "검색" API를 추가하면 받는다.
import re

import httpx

from app.config import env

URL = "https://openapi.naver.com/v1/search/shop.json"


def is_configured() -> bool:
    return bool(env("NAVER_CLIENT_ID") and env("NAVER_CLIENT_SECRET"))


def search_products(keyword: str, limit: int = 5) -> list[dict]:
    """가격이 낮은 순으로 상품을 찾는다. 키가 없으면 빈 목록이다."""
    if not is_configured():
        return []
    headers = {"X-Naver-Client-Id": env("NAVER_CLIENT_ID"), "X-Naver-Client-Secret": env("NAVER_CLIENT_SECRET")}
    params = {"query": keyword, "display": limit, "sort": "asc"}
    response = httpx.get(URL, params=params, headers=headers, timeout=10)
    response.raise_for_status()
    return [
        {
            "productId": item.get("productId", ""),
            "name": re.sub(r"<[^>]+>", "", item.get("title", "")),  # 검색어를 감싼 <b> 태그를 지운다.
            "price": int(item.get("lprice") or 0),
            "mall": item.get("mallName", ""),
            "imageUrl": item.get("image", ""),
            "url": item.get("link", ""),
        }
        for item in response.json().get("items", [])
    ]
