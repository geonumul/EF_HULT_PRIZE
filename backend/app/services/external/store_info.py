# 소상공인 상가(상권)정보. 반경 안 동종 업소 수를 센다. 키: DATA_GO_KR_KEY
import httpx

from app.config import env

URL = "https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInRadius"

# Figma "09" 예시값: 반경 300m 카페 41곳, 필라테스 3곳
DEMO_COUNTS = {"cafe": 41, "pilates": 3}


# 우리 업종 이름과 상가정보의 소분류 이름(indsSclsNm)을 잇는 표. 실제 응답으로 확인했다.
USE_CLASSES = {"cafe": "카페", "pilates": "요가/필라테스 학원"}
PAGE_SIZE = 1000
MAX_PAGES = 10  # 한 번에 너무 많이 읽지 않도록 막는다.


def nearby_counts(lng: float, lat: float, radius_m: int = 300) -> dict:
    """업종별 업소 수와 전체 업소 수. 판정에는 쓰지 않고 참고 지표로만 보여준다."""
    if not env("DATA_GO_KR_KEY"):
        return dict(DEMO_COUNTS)
    counts = {use: 0 for use in USE_CLASSES}
    total = None
    read = 0
    for page in range(1, MAX_PAGES + 1):
        params = {
            "serviceKey": env("DATA_GO_KR_KEY"),
            "radius": radius_m,
            "cx": lng,
            "cy": lat,
            "numOfRows": PAGE_SIZE,
            "pageNo": page,
            "type": "json",
        }
        response = httpx.get(URL, params=params, timeout=20)
        response.raise_for_status()
        body = response.json().get("body") or {}
        items = body.get("items") or []
        if total is None:
            total = body.get("totalCount", 0)
        if not items:
            break
        read += len(items)
        for item in items:
            for use, class_name in USE_CLASSES.items():
                if (item.get("indsSclsNm") or "").strip() == class_name:
                    counts[use] += 1
        if read >= total:
            break
    return dict(counts, total=total or 0)
