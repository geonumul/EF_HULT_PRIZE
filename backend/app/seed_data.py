# 인메모리 가짜 데이터. frontend/src/mocks/{listings,products,renders}.ts 와 같은 값이다.
# 금액 단위: 공실(보증금, 월세, costs)은 만원, 상품과 견적은 원.
# 값을 바꾸면 supabase/seed.sql 도 같이 바꾼다.


def _link(link_id: str, source: str, label: str, url: str, price: int) -> dict:
    return {"id": link_id, "source": source, "label": label, "url": url, "price": price, "status": "live"}


def _product(product_id, name, category, size, price, used_price, image, links) -> dict:
    width, depth, height = size
    return {
        "id": product_id,
        "name": name,
        "category": category,
        "widthMm": width,
        "depthMm": depth,
        "heightMm": height,
        "price": price,
        "usedPrice": used_price,
        "imageUrl": f"/images/{image}",
        "links": links,
    }


LISTINGS = [
    {
        "id": "seongsu-2ga-1f", "tag": "1층 상가", "address": "성수동2가", "nearby": "성수동2가",
        "areaM2": 39.6, "floor": 1, "ceilingHeightM": 3.2, "deposit": 3000, "rent": 180,
        "buildingUse": "제2종 근린생활시설", "condition": "vacant", "thumbnail": "/images/space-a.jpg",
        "renderCount": 3, "position": {"lat": 37.5446, "lng": 127.0557},
        "costs": {"cafe": 4200, "popup": 1900, "pilates": 5600},
        "verdicts": {"cafe": "possible", "popup": "possible", "pilates": "conditional"},
    },
    {
        "id": "ttukseom-1f", "tag": "1층 상가", "address": "성수동1가", "nearby": "뚝섬역 3분",
        "areaM2": 46.2, "floor": 1, "ceilingHeightM": 3.0, "deposit": 3500, "rent": 210,
        "buildingUse": "제2종 근린생활시설", "condition": "has_fixtures", "thumbnail": "/images/space-b.jpg",
        "renderCount": 3, "position": {"lat": 37.5473, "lng": 127.0447},
        "costs": {"pilates": 5600, "cafe": 4900, "popup": 2100},
        "verdicts": {"pilates": "possible", "cafe": "possible", "popup": "possible"},
    },
    {
        "id": "seoulsup-corner-1f", "tag": "1층 코너", "address": "성수동1가", "nearby": "서울숲",
        "areaM2": 33.0, "floor": 1, "ceilingHeightM": 3.4, "deposit": 2000, "rent": 160,
        "buildingUse": "제1종 근린생활시설", "condition": "vacant", "thumbnail": "/images/space-c.jpg",
        "renderCount": 3, "position": {"lat": 37.5444, "lng": 127.0374},
        "costs": {"popup": 1900, "cafe": 3600, "pilates": 4800},
        "verdicts": {"popup": "possible", "cafe": "possible", "pilates": "conditional"},
    },
    {
        "id": "seongsu-stn-2f", "tag": "2층 상가", "address": "성수동2가", "nearby": "성수역 5분",
        "areaM2": 105.8, "floor": 2, "ceilingHeightM": 3.1, "deposit": 5000, "rent": 320,
        "buildingUse": "제2종 근린생활시설", "condition": "occupied", "thumbnail": "/images/space-d.jpg",
        "renderCount": 0, "position": {"lat": 37.5446, "lng": 127.0559},
        "costs": {"cafe": 6100, "pilates": 7200, "popup": 2600},
        "verdicts": {"cafe": "possible", "pilates": "possible", "popup": "possible"},
    },
]

PRODUCTS = [
    _product("chair-oak", "오크 원목 체어", "chair", (450, 520, 780), 89000, 52000, "prod-chair.jpg", [
        _link("chair-oak-a", "partner", "마켓B", "https://example.com/market-b/chair-oak", 89000),
        _link("chair-oak-b", "coupang", "쿠팡", "https://example.com/coupang/chair-oak", 92400),
        _link("chair-oak-c", "naver", "네이버 최저가", "https://example.com/naver/chair-oak", 93000),
    ]),
    _product("table-2p", "원목 2인 테이블", "table", (700, 600, 730), 190000, 114000, "prod-chair.jpg", [
        _link("table-2p-a", "partner", "마켓B", "https://example.com/market-b/table-2p", 190000),
        _link("table-2p-b", "naver", "네이버 최저가", "https://example.com/naver/table-2p", 198000),
    ]),
    _product("counter-bar", "바 카운터 2400", "counter", (2400, 600, 1050), 1850000, None, "prod-counter.jpg", [
        _link("counter-bar-a", "partner", "마켓B", "https://example.com/market-b/counter-bar", 1850000),
    ]),
    _product("lamp-pendant", "펜던트 조명 (유리)", "lamp", (300, 300, 250), 48000, 29000, "prod-lamp.jpg", [
        _link("lamp-pendant-a", "coupang", "쿠팡", "https://example.com/coupang/lamp-pendant", 48000),
        _link("lamp-pendant-b", "naver", "네이버 최저가", "https://example.com/naver/lamp-pendant", 51000),
    ]),
    _product("fridge-showcase", "업소용 쇼케이스 냉장고", "fridge", (1200, 700, 1900), 1280000, 780000, "prod-counter.jpg", [
        _link("fridge-showcase-a", "partner", "마켓B", "https://example.com/market-b/fridge", 1280000),
        _link("fridge-showcase-b", "used", "폐업 매장 중고", "https://example.com/used/fridge", 780000),
    ]),
    _product("espresso-machine", "2그룹 에스프레소 머신", "machine", (760, 580, 520), 3900000, 2400000, "prod-counter.jpg", [
        _link("espresso-machine-a", "naver", "네이버 최저가", "https://example.com/naver/espresso", 3900000),
    ]),
    _product("stool-bar", "바 스툴 (높이 650)", "chair", (380, 380, 650), 64000, 38000, "prod-chair.jpg", [
        _link("stool-bar-a", "coupang", "쿠팡", "https://example.com/coupang/stool", 64000),
    ]),
    _product("shelf-display", "진열 선반 (오픈형)", "shelf", (900, 350, 1800), 220000, None, "prod-counter.jpg", [
        _link("shelf-display-a", "partner", "마켓B", "https://example.com/market-b/shelf", 220000),
    ]),
    _product("reformer", "필라테스 리포머", "machine", (2400, 700, 400), 2300000, 1400000, "prod-counter.jpg", [
        _link("reformer-a", "naver", "네이버 최저가", "https://example.com/naver/reformer", 2300000),
        _link("reformer-b", "used", "폐업 매장 중고", "https://example.com/used/reformer", 1400000),
    ]),
    _product("mirror-wall", "전신 벽거울 1200", "mirror", (1200, 30, 1800), 180000, None, "prod-lamp.jpg", [
        _link("mirror-wall-a", "coupang", "쿠팡", "https://example.com/coupang/mirror", 180000),
    ]),
]

# 업종별 기본 배치. x, y는 이미지 안 위치(%)다.
TAGS_BY_USE = {
    "cafe": [
        {"n": 1, "x": 32, "y": 66, "productId": "chair-oak", "qty": 22, "similarity": 0.93},
        {"n": 2, "x": 52, "y": 70, "productId": "table-2p", "qty": 11, "similarity": 0.9},
        {"n": 3, "x": 70, "y": 46, "productId": "counter-bar", "qty": 1, "similarity": 0.88},
        {"n": 4, "x": 48, "y": 20, "productId": "lamp-pendant", "qty": 6, "similarity": 0.91},
        {"n": 5, "x": 80, "y": 60, "productId": "espresso-machine", "qty": 1, "similarity": 0.86},
        {"n": 6, "x": 86, "y": 38, "productId": "fridge-showcase", "qty": 1, "similarity": 0.87},
    ],
    "popup": [
        {"n": 1, "x": 40, "y": 60, "productId": "shelf-display", "qty": 6, "similarity": 0.89},
        {"n": 2, "x": 60, "y": 24, "productId": "lamp-pendant", "qty": 4, "similarity": 0.9},
        {"n": 3, "x": 72, "y": 66, "productId": "counter-bar", "qty": 1, "similarity": 0.85},
    ],
    "pilates": [
        {"n": 1, "x": 36, "y": 68, "productId": "reformer", "qty": 8, "similarity": 0.92},
        {"n": 2, "x": 78, "y": 40, "productId": "mirror-wall", "qty": 4, "similarity": 0.9},
        {"n": 3, "x": 50, "y": 18, "productId": "lamp-pendant", "qty": 5, "similarity": 0.88},
    ],
}

CHECKS_BY_USE = {
    "cafe": ["통로 폭 900mm 확보", "좌석 22석 배치", "바 카운터 동선 겹침 없음"],
    "popup": ["통로 폭 1,100mm 확보", "진열대 간격 800mm 이상"],
    "pilates": ["리포머 간격 700mm 확보", "거울 벽면 길이 충분"],
}


def make_render(listing_id: str, use_type: str) -> dict:
    return {
        "id": f"r-{listing_id}-{use_type}",
        "listingId": listing_id,
        "useType": use_type,
        "mode": "text",
        "style": None,
        "imageUrl": f"/images/render-{use_type}.jpg",
        "tags": TAGS_BY_USE.get(use_type, []),
        "checks": CHECKS_BY_USE.get(use_type, []),
    }


# 공실마다 업종별 렌더링이 하나씩 있다.
RENDERS = [make_render(listing["id"], use) for listing in LISTINGS for use in listing["costs"]]

# 입점 업체. 마켓B는 공급사, 나머지는 철거 업체다. 이름은 예시다.
VENDORS = [
    {"id": "vendor-market-b", "ownerId": "demo-user", "name": "마켓B", "type": "supplier", "commissionRate": 0.10},
    {"id": "vendor-demo-1", "ownerId": "demo-vendor-1", "name": "한솔철거", "type": "demolition", "commissionRate": None},
    {"id": "vendor-demo-2", "ownerId": "demo-vendor-2", "name": "대한철거", "type": "demolition", "commissionRate": None},
    {"id": "vendor-demo-3", "ownerId": "demo-vendor-3", "name": "새봄철거", "type": "demolition", "commissionRate": None},
]
