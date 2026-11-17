# 쿠팡 파트너스 Open API. 상품 검색과 제휴 링크(딥링크). 키: COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY
import hashlib
import hmac
from datetime import datetime, timezone

import httpx

from app.config import env

HOST = "https://api-gateway.coupang.com"
API_PREFIX = "/v2/providers/affiliate_open_api/apis/openapi/v1"


def make_authorization(method: str, path: str, query: str, access_key: str, secret_key: str, now: datetime | None = None) -> str:
    """HMAC 서명 헤더 값. 서명 대상은 서명시각 + 메서드 + 경로 + 쿼리(물음표 없이)다."""
    now = now or datetime.now(timezone.utc)
    signed_date = now.strftime("%y%m%dT%H%M%SZ")
    message = signed_date + method + path + query
    signature = hmac.new(secret_key.encode(), message.encode(), hashlib.sha256).hexdigest()
    return f"CEA algorithm=HmacSHA256, access-key={access_key}, signed-date={signed_date}, signature={signature}"


def _keys() -> tuple[str, str]:
    return env("COUPANG_ACCESS_KEY"), env("COUPANG_SECRET_KEY")


def search_products(keyword: str, limit: int = 10) -> list[dict]:
    access_key, secret_key = _keys()
    if not access_key or not secret_key:
        return [{
            "productId": "coupang-demo-1",
            "name": "펜던트 조명 (유리)",
            "price": 48000,
            "imageUrl": "",
            "url": "https://example.com/coupang/lamp-pendant",
        }]
    path = f"{API_PREFIX}/products/search"
    query = f"keyword={keyword}&limit={limit}"
    headers = {"Authorization": make_authorization("GET", path, query, access_key, secret_key)}
    response = httpx.get(f"{HOST}{path}?{query}", headers=headers, timeout=10)
    response.raise_for_status()
    # TODO: 공식 문서 확인. 응답 필드 data.productData[].productName, productPrice, productImage, productUrl은 추정이다.
    products = response.json().get("data", {}).get("productData", [])
    return [
        {
            "productId": str(item.get("productId", "")),
            "name": item.get("productName", ""),
            "price": int(item.get("productPrice") or 0),
            "imageUrl": item.get("productImage", ""),
            "url": item.get("productUrl", ""),
        }
        for item in products
    ]


def deeplink(coupang_url: str) -> str:
    """쿠팡 상품 URL을 제휴 URL로 바꾼다. 키가 없으면 원래 URL을 돌려준다."""
    access_key, secret_key = _keys()
    if not access_key or not secret_key:
        return coupang_url
    path = f"{API_PREFIX}/deeplink"
    headers = {
        "Authorization": make_authorization("POST", path, "", access_key, secret_key),
        "Content-Type": "application/json",
    }
    response = httpx.post(f"{HOST}{path}", json={"coupangUrls": [coupang_url]}, headers=headers, timeout=10)
    response.raise_for_status()
    # TODO: 공식 문서 확인. 응답 필드 data[].shortenUrl은 추정이다.
    results = response.json().get("data", [])
    return results[0].get("shortenUrl", coupang_url) if results else coupang_url
