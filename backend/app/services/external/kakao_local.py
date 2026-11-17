# 카카오 로컬 주소 검색. 주소를 좌표와 법정동코드로 바꾼다. 키: KAKAO_REST_KEY
import httpx

from app.config import env

URL = "https://dapi.kakao.com/v2/local/search/address.json"

# 키가 없을 때 쓰는 Figma "09" 예시값
DEMO_RESULT = {
    "address": "서울 성동구 성수동2가",
    "lng": 127.05,
    "lat": 37.54,
    "bCode": "1120011500",
    "mainNo": "100",
    "subNo": "0",
}


def geocode(address: str) -> dict:
    key = env("KAKAO_REST_KEY")
    if not key:
        return dict(DEMO_RESULT, address=address or DEMO_RESULT["address"])
    response = httpx.get(URL, params={"query": address}, headers={"Authorization": f"KakaoAK {key}"}, timeout=10)
    response.raise_for_status()
    documents = response.json().get("documents", [])
    if not documents:
        return {}
    first = documents[0]
    parcel = first.get("address") or {}  # 지번 주소 정보. 도로명만 있는 결과는 비어 있을 수 있다.
    return {
        "address": first["address_name"],
        "lng": float(first["x"]),  # x는 경도
        "lat": float(first["y"]),  # y는 위도
        "bCode": parcel.get("b_code", ""),
        "mainNo": parcel.get("main_address_no", ""),
        "subNo": parcel.get("sub_address_no", ""),
    }
