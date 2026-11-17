# 브이월드 2D 데이터 API. 좌표로 용도지역을 조회한다. 키: VWORLD_KEY
import httpx

from app.config import env

URL = "https://api.vworld.kr/req/data"
DEMO_ZONING = "준공업지역"  # Figma "09" 예시값


def zoning_at(lng: float, lat: float) -> str:
    """좌표의 용도지역 이름. 예: 준공업지역"""
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
        "crs": "EPSG:4326",
        "domain": "shopportunity.vercel.app",  # 키를 발급받을 때 적은 서비스 주소
    }
    response = httpx.get(URL, params=params, timeout=10)
    response.raise_for_status()
    # 응답 구조는 실제 호출로 확인했다: response.result.featureCollection.features[].properties.uname
    result = response.json().get("response", {}).get("result", {})
    features = result.get("featureCollection", {}).get("features", [])
    # 같은 좌표에 이름이 빈 항목이 섞여 오므로 이름이 있는 첫 항목을 쓴다.
    for feature in features:
        name = (feature.get("properties") or {}).get("uname", "")
        if name:
            return name
    return ""
