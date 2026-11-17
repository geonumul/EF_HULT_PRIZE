# 브이월드 2D 데이터 API. 좌표로 용도지역을 조회한다. 키: VWORLD_KEY
import httpx

from app.config import env

URL = "https://api.vworld.kr/req/data"
DEMO_ZONING = "준공업지역"  # Figma "09" 예시값


def zoning_at(lng: float, lat: float) -> str:
    key = env("VWORLD_KEY")
    if not key:
        return DEMO_ZONING
    params = {
        "service": "data",
        "request": "GetFeature",
        "data": "LT_C_UQ111",  # 용도지역지구(국토계획법) 도시지역
        "key": key,
        "geomFilter": f"POINT({lng} {lat})",
        "format": "json",
    }
    response = httpx.get(URL, params=params, timeout=10)
    response.raise_for_status()
    # TODO: 공식 문서 확인. 응답 구조와 용도지역 이름 필드(uname 추정)를 확인한 뒤 고친다.
    result = response.json().get("response", {}).get("result", {})
    features = result.get("featureCollection", {}).get("features", [])
    if not features:
        return ""
    return features[0].get("properties", {}).get("uname", "")
