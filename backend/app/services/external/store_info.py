# 소상공인 상가(상권)정보. 반경 안 동종 업소 수를 센다. 키: DATA_GO_KR_KEY
import httpx

from app.config import env

URL = "https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInRadius"

# Figma "09" 예시값: 반경 300m 카페 41곳, 필라테스 3곳
DEMO_COUNTS = {"cafe": 41, "pilates": 3}


def nearby_counts(lng: float, lat: float, radius_m: int = 300) -> dict:
    """업종별 업소 수. 판정에는 쓰지 않고 참고 지표로만 보여준다."""
    if not env("DATA_GO_KR_KEY"):
        return dict(DEMO_COUNTS)
    params = {"serviceKey": env("DATA_GO_KR_KEY"), "radius": radius_m, "cx": lng, "cy": lat, "type": "json"}
    response = httpx.get(URL, params=params, timeout=10)
    response.raise_for_status()
    # TODO: 공식 문서 확인. 응답의 업소 목록 위치(body.items)와 업종 분류 필드(indsLclsNm 추정),
    # 우리 업종 이름(cafe, pilates)과 분류명을 잇는 표가 필요하다. 그 전에는 빈 값을 돌려준다.
    return {}
