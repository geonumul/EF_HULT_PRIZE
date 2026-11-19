# 인터넷 상품 검색. 입점 업체가 없는 상품의 판매처와 최저가를 보여 줄 때 쓴다.
import time

from fastapi import APIRouter, Query

from app.services.external import naver_shopping

router = APIRouter()

CACHE_SECONDS = 600  # 같은 검색어는 10분 동안 저장해 둔 결과를 쓴다. 검색 API 호출 한도를 아끼려는 것이다.
_cache: dict[str, tuple[float, list[dict]]] = {}


def cached_search(keyword: str, limit: int) -> list[dict]:
    key = f"{keyword}:{limit}"
    saved = _cache.get(key)
    if saved and time.time() - saved[0] < CACHE_SECONDS:
        return saved[1]
    items = naver_shopping.search_products(keyword, limit)
    _cache[key] = (time.time(), items)
    return items


@router.get("/shopping/search")
def shopping_search(q: str = Query(..., min_length=1, max_length=80), limit: int = Query(3, ge=1, le=10)):
    """상품 이름으로 인터넷 쇼핑몰의 최저가 상품을 찾는다. 키가 없거나 실패하면 configured나 items가 비어 프론트가 검색 링크로 대신한다."""
    if not naver_shopping.is_configured():
        return {"configured": False, "items": []}
    try:
        return {"configured": True, "items": cached_search(q, limit)}
    except Exception:  # noqa: BLE001  외부 서비스가 실패해도 화면은 검색 링크로 대신한다.
        return {"configured": True, "items": []}
