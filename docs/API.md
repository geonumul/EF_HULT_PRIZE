# API

`backend/`의 REST API다. 필드 이름은 프론트 타입(`frontend/src/types/index.ts`)과 같은 camelCase다. 요청 본문은 snake_case도 받는다. 금액 단위는 공실(`deposit`, `rent`, `costs`)이 만원, 나머지(상품, 견적, 주문, 철거, 추가 설비비)가 원이다.

## 인증

Supabase JWT를 `Authorization: Bearer <토큰>`으로 보낸다. 서버에 `SUPABASE_JWT_SECRET`이 없으면 토큰 없이도 데모 사용자(`demo-user`, 역할 partner)로 통과한다. 데모 모드에서 `X-Demo-User: <id>` 헤더로 다른 사용자를 흉내 낼 수 있다. 파트너 API는 JWT의 `app_metadata.role`이 `partner`나 `admin`이어야 한다.

| 표시 | 뜻 |
|---|---|
| 공개 | 로그인 없이 호출 |
| 로그인 | JWT 필요 |
| 파트너 | 파트너 역할 필요 |

## 엔드포인트

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `/health` | 공개 | 상태 확인 |
| GET | `/listings?bbox&use&maxCost` | 공개 | 지도 영역 공실과 업종별 창업비 |
| GET | `/listings/{id}/preview` | 공개 | 빈 공간 사진, 업종별 창업비 요약 |
| GET | `/spaces/{id}/suitability` | 공개 | 업종별 가능, 조건부, 불가와 추가 설비비 |
| GET | `/spaces/{id}/renders?use&style` | 공개 | 렌더링 결과와 태그 좌표 |
| POST | `/render-jobs` | 로그인 | 렌더링 작업 생성 (`mode`: `text`, `products`) |
| GET | `/render-jobs/{id}` | 로그인 | 진행 상태, 결과 렌더링 id |
| GET | `/quotes/draft?renderId&used` | 공개 | 항목별 견적 (신품, 중고) |
| POST | `/quotes/{id}/confirm?used` | 로그인 | 견적 확정 |
| POST | `/orders` | 로그인 | 토스 결제 승인 검증 후 주문 생성 |
| GET | `/products?category` | 공개 | 상품 목록. 판매처 링크는 최저가 순 |
| GET | `/go/{link_id}` | 공개 | 클릭 기록 후 판매처로 302 |
| POST | `/partner/listings` | 파트너 | 공실 등록 |
| POST | `/partner/products` | 파트너 | 상품 등록 |
| POST | `/spaces/{id}/demolition-estimate` | 공개 | 철거비 추정 범위 |
| POST | `/demolition-requests` | 로그인 | 철거 견적 요청 |
| GET | `/demolition-requests/{id}/bids` | 로그인 | 받은 철거 견적 (싼 순) |
| POST | `/demolition-requests/{id}/accept` | 로그인 | 업체 선택 (`bid_id`) |
| GET | `/partner/demolition-requests` | 철거 업체 | 전달받은 요청 |
| POST | `/partner/demolition-requests/{id}/bids` | 철거 업체 | 견적 제출 |

공간 id는 공실 id와 같다. 견적 id는 렌더링 id와 같다. 없는 id는 404를 돌려준다.

## 공실

`GET /listings?bbox=127.03,37.54,127.06,37.55&use=cafe&maxCost=4500`

`bbox`는 `서쪽경도,남쪽위도,동쪽경도,북쪽위도`다. `use`를 주면 그 업종의 창업비가 있는 공실만, `maxCost`(만원)를 주면 창업비가 그 이하인 공실만 남는다. `use` 없이 `maxCost`만 주면 가장 싼 업종 기준이다. 응답은 `Listing[]`이다.

```json
[{ "id": "seongsu-2ga-1f", "tag": "1층 상가", "address": "성수동2가", "areaM2": 39.6, "floor": 1,
   "deposit": 3000, "rent": 180, "buildingUse": "제2종 근린생활시설", "condition": "vacant",
   "renderCount": 3, "position": { "lat": 37.5446, "lng": 127.0557 },
   "costs": { "cafe": 4200, "popup": 1900, "pilates": 5600 },
   "verdicts": { "cafe": "possible", "popup": "possible", "pilates": "conditional" } }]
```

`GET /listings/{id}/preview`는 `id, tag, address, areaM2, photos[], renderCount, costs, verdicts`를 돌려준다.

`POST /partner/listings`

```json
{ "address": "서울 성동구 성수동2가 1", "areaM2": 30, "deposit": 1000, "rent": 100, "floor": 1, "condition": "vacant" }
```

`lat`, `lng`가 없으면 카카오 로컬로 주소에서 구하고, `buildingUse`가 없으면 건축HUB 표제부에서 가져온다. 응답은 만들어진 `Listing`(201)이다.

## 업종 적합성

`GET /spaces/seongsu-2ga-1f/suitability`

```json
{ "spaceId": "seongsu-2ga-1f",
  "inputs": { "buildingUse": "제2종 근린생활시설", "zoning": "준공업지역", "areaM2": 39.6 },
  "results": [
    { "useType": "cafe", "verdict": "possible", "reasons": ["휴게음식점 300m² 미만"], "extraCostWon": 4700000 },
    { "useType": "pilates", "verdict": "conditional", "reasons": ["층간 소음 확인"], "extraCostWon": 4400000 } ],
  "nearbyStores": { "cafe": 41, "pilates": 3 } }
```

저장된 판정(`suitability` 테이블)이 있으면 그것을 돌려주고, 없으면 `app/services/suitability.py`의 규칙표로 판정해 저장한다. 시드 공실은 프론트 목의 판정값이 저장돼 있다. 규칙표에 있는 규칙은 Figma "09 API · 상품 연결"의 예시 흐름(카페 휴게음식점 300m² 미만 가능, 팝업 가능, 필라테스 층간 소음 확인 조건부)뿐이다. 그 밖의 업종과 경우는 `conditional`이다. `nearbyStores`(반경 300m 동종 업소 수)는 참고 지표이고 판정에 쓰지 않는다.

## 렌더링

`GET /spaces/{id}/renders?use=cafe&style=modern`은 `RenderResult[]`를 돌려준다. `style`이 정해지지 않은 렌더링은 어느 스타일 요청에도 포함된다.

### 렌더링 작업 계약

`POST /render-jobs`

```json
{ "listingId": "seongsu-2ga-1f", "useType": "cafe", "mode": "text", "prompt": "따뜻한 느낌" }
```

상품 먼저 방식은 `"mode": "products"`와 `"items": [{ "productId": "chair-oak", "qty": 4 }]`를 보낸다. `items`가 비었거나, 없는 상품이거나, 살아 있는 판매처 링크가 없는 상품이면 422다. 응답은 201이다.

```json
{ "id": "c319df7e-...", "status": "queued", "progress": 0, "mode": "text", "listingId": "seongsu-2ga-1f",
  "useType": "cafe", "prompt": "따뜻한 느낌", "productIds": [], "resultRenderId": null, "error": null }
```

`GET /render-jobs/{id}`로 진행을 읽는다. `status`는 `queued`, `running`, `done`, `failed`, `progress`는 0~100이다. 끝나면 `resultRenderId`가 채워진다. 값은 `r-<공실id>-<업종>`이고 상품 먼저 방식은 뒤에 `-products`가 붙는다. 이 id로 `/quotes/draft`를 부른다. 작업은 만든 사용자만 읽는다.

작업은 `render_jobs` 행이다. 컬럼은 `id, status, progress, mode, listing_id, use_type, prompt, product_ids, items, result_render_id, error`다. `FIREBASE_SERVICE_ACCOUNT`가 있으면 Cloud Tasks에 다음 페이로드를 넣고 이후 갱신은 Firebase 함수가 `render_jobs`에 쓴다.

```json
{ "jobId": "c319df7e-...", "listingId": "seongsu-2ga-1f", "useType": "cafe", "mode": "text", "prompt": "따뜻한 느낌", "productIds": [] }
```

`items`(상품별 수량)는 페이로드에 없다. 함수가 필요하면 `render_jobs.items`를 읽는다. 설정이 없으면 큐 등록을 건너뛰고, 조회할 때 경과 시간으로 1.5초 뒤 완료되는 가짜 진행을 계산한다. 가짜 진행이 끝나면 결과 렌더링도 준비한다.

## 견적과 주문

`GET /quotes/draft?renderId=r-seongsu-2ga-1f-cafe&used=chair-oak,fridge-showcase`

`used`는 중고로 바꾼 상품 id를 쉼표로 이은 값이다. 응답은 `Quote`다. 계산 규칙과 예시 단가는 `frontend/src/lib/quote.ts`와 같다. 이 예시의 신품 합계는 33,886,000원(집기 11,366,000, 설비 4,700,000, 시공 17,820,000), `usedSaving`은 3,764,000원이다. 빈 공간이 아닌 공실에는 `demolition` 그룹이 붙는다. 견적은 철거 업체가 확정되어도 예시 철거 단가로 계산한다. 확정 철거비를 넣는 일은 아직 하지 않았다.

`POST /quotes/{id}/confirm?used=chair-oak`는 확정 시점의 견적을 저장하고 `status: "confirmed"`가 붙은 `Quote`를 돌려준다.

`POST /orders`

```json
{ "quote_id": "r-seongsu-2ga-1f-cafe", "payment_key": "tgen_20260101abcd", "order_id": "order-123456", "amount": 33886000 }
```

순서대로 검증한다. 확정된 견적이 없으면 409. `amount`가 확정 견적 합계와 다르면 400. 같은 `order_id`가 이미 있으면 409. 토스 승인이 `DONE`이 아니거나 `totalAmount`가 다르면 402. `TOSS_SECRET_KEY`가 없으면 데모 승인(`"demo": true`)으로 통과한다. `order_id`는 영문, 숫자, `-`, `_`, `=` 6~64자다. 응답은 201이다.

```json
{ "id": "a54a44a4-...", "quoteId": "r-seongsu-2ga-1f-cafe", "orderId": "order-123456", "amount": 33886000,
  "status": "paid", "receiptUrl": null, "demo": true, "paidAt": "2026-11-17T14:30:34+00:00" }
```

## 상품과 판매처 링크

`GET /products?category=chair`는 `Product[]`를 돌려준다. `links`는 최저가 순이다.

`GET /go/{link_id}`는 `link_clicks`에 기록하고 `affiliateUrl`(없으면 `url`)로 302 이동한다. 없는 링크는 404, `dead` 링크는 410이다.

`POST /partner/products`는 공급사 업체(`vendors.type`이 `supplier`나 `used`)를 가진 파트너만 쓴다. 판매처 링크가 하나도 없으면 422다. `source`가 `coupang`인 링크는 쿠팡 딥링크로 제휴 URL을 만든다.

```json
{ "name": "새 의자", "category": "chair", "widthMm": 400, "depthMm": 400, "heightMm": 800, "price": 50000,
  "links": [{ "source": "partner", "label": "마켓B", "url": "https://example.com/new", "price": 50000 }] }
```

## 철거

`POST /spaces/{id}/demolition-estimate`의 본문은 선택이다. `{ "ceiling": true, "floor": true, "walls": false, "equipment": false, "signage": false }`.

```json
{ "spaceId": "seongsu-stn-2f", "condition": "occupied", "areaM2": 105.8, "scope": { "ceiling": true },
  "lowWon": 10156800, "highWon": 15235200, "checklist": ["건물주 동의 여부", "..."], "note": "예시 단가 기준 추정입니다. 업체 견적으로 확정됩니다." }
```

범위는 예시 단가(㎡당 12만 원, 부분 철거는 절반)의 0.8~1.2배다. 철거 부위는 금액에 반영하지 않는다. 실제 단가표를 받으면 `app/services/demolition.py`를 바꾼다. 빈 공간은 0원이다.

흐름은 다음과 같다.

1. `POST /demolition-requests` 본문 `{ "spaceId": "seongsu-stn-2f", "scope": { "walls": true }, "note": "주말 작업" }`. 빈 공간이면 422. 철거 업체 최대 3곳에 전달된다. 응답은 `status: "open"`인 요청이다.
2. `GET /partner/demolition-requests`로 업체가 받은 요청을 본다. 요청자의 계정 정보는 빠진다.
3. `POST /partner/demolition-requests/{id}/bids` 본문 `{ "amount": 9500000, "startDate": "2026-12-01", "scopeNote": "전체 철거 포함" }`. 업체당 한 번만 보낼 수 있고, 마감된 요청에는 409다.
4. `GET /demolition-requests/{id}/bids`로 싼 순 목록을 본다. 요청한 사용자만 읽는다.
5. `POST /demolition-requests/{id}/accept` 본문 `{ "bid_id": "..." }`. 선택한 견적은 `accepted`, 나머지는 `rejected`가 되고 요청은 `accepted`가 된다. 다시 선택하면 409다.

데모 모드의 철거 업체 사용자는 `demo-vendor-1`, `demo-vendor-2`, `demo-vendor-3`이다. `X-Demo-User` 헤더로 고른다.

## 오류 형식

```json
{ "detail": "결제 금액이 견적 합계와 다릅니다." }
```

본문 검증 오류는 422이고 `detail`이 배열이다.
