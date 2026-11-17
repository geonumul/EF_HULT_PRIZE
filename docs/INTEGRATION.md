# 화면과 서버 연결

지금 모든 화면은 `frontend/src/mocks/`의 가짜 데이터로 동작한다. 서버가 올라가면 이 데이터를 백엔드 API 호출로 바꾼다.

## 지금 상태

2026-11-18 자동 점검 결과다. 16개 페이지에서 버튼 265개를 눌렀다.

- 내부 링크 34개는 모두 열린다.
- 눌러도 화면이 바뀌지 않은 버튼 39개는 대부분 이미 선택된 상태의 버튼이다(기본으로 선택된 탭, 정렬, 업종 칩). 지도 묶음 핀 14개는 카카오 지도가 켜져 있으면 숨겨지는 정적 지도용 핀이다.
- 오류는 없었다.
- 판매처 링크의 주소는 `example.com` 자리표시자다.
- 결제, 로그인, 렌더링은 데모 동작이다. 버튼은 동작하지만 서버에 저장되지 않는다.

## 연결 현황

| 화면 | 데이터 | 상태 |
|---|---|---|
| 지도, 업종별 견적 목록 | `GET /listings` | 연결됨 |
| 집기 마켓 | `GET /products` | 연결됨 |
| 스튜디오, 견적서, 철거, 결제 | `mocks/`의 렌더링과 계산 | 아직 가짜 데이터. 같은 id의 시드 데이터라 값은 같다 |
| 로그인 | Supabase Auth | 키가 있으면 연결됨 |

목록 화면은 `frontend/src/lib/api/hooks.ts`의 `useListings`, `useProducts`가 읽는다. 처음에는 가짜 데이터로 바로 그리고, 백엔드 응답이 오면 그 데이터로 바꾼다. 백엔드가 꺼져 있어도 화면은 동작한다.

## 연결 방식

화면은 서버 주소만 안다. 데이터를 읽고 쓰는 함수는 한 폴더에 모은다.

```
frontend/src/lib/api/
  client.ts       fetch 공통 함수. 주소, 로그인 토큰, 오류 처리를 한 곳에서 한다.
  listings.ts     공실 조회
  renders.ts      렌더링 조회와 작업 생성
  quotes.ts       견적, 주문
  products.ts     상품, 판매처 링크
  demolition.ts   철거 요청과 견적
  partner.ts      파트너 등록
```

- `NEXT_PUBLIC_API_URL`이 비어 있으면 각 함수가 `mocks/`의 데이터를 돌려준다. 서버가 없어도 화면이 동작한다.
- 값이 있으면 백엔드를 호출한다. 응답 모양은 `frontend/src/types/`와 같다.
- 로그인 토큰은 Supabase 세션에서 읽어 `Authorization` 헤더에 붙인다.
- 모든 호출 결과는 `loading`, `error`, `empty` 세 상태를 화면에 보여 준다. 지금 화면은 `loading`과 `error`가 없다. 연결할 때 함께 넣는다.

## 버튼과 링크별 연결 대상

| 화면 | 동작 | 호출할 API |
|---|---|---|
| 지도 | 목록과 핀 불러오기, 업종·필터 | `GET /listings?bbox&use&maxCost` |
| 지도 | 미리보기 카드 | `GET /listings/{id}/preview` |
| 지도 | 북마크 | `POST /me/saved` (미구현, 로그인 필요) |
| 스튜디오 | 업종 탭, 렌더링 | `GET /spaces/{id}/renders?use&style` |
| 스튜디오 | 상품 먼저 렌더링 | `POST /render-jobs` (`mode: products`) 후 `GET /render-jobs/{id}` |
| 스튜디오 | 견적 패널, 중고 전환 | `GET /quotes/draft?renderId&used` |
| 채팅 | 요청 보내기 | `POST /render-jobs` (`mode: text`) |
| 견적 | 견적서 | `GET /quotes/draft` |
| 견적 | 발주·결제 | `POST /quotes/{id}/confirm`, 토스 승인 후 `POST /orders` |
| 마켓 | 상품 목록 | `GET /products?category` |
| 마켓 | 판매처 버튼 | `GET /go/{linkId}` (클릭 기록 후 이동) |
| 철거 | 추정, 요청, 비교, 선택 | `POST /spaces/{id}/demolition-estimate`, `POST /demolition-requests`, `GET .../bids`, `POST .../accept` |
| 파트너 | 공실·상품 등록 | `POST /partner/listings`, `POST /partner/products` |
| 파트너 | 철거 견적 제출 | `POST /partner/demolition-requests/{id}/bids` |
| 로그인 | 가입, 로그인 | Supabase Auth |

판매처 링크는 `example.com` 대신 `/go/{linkId}`로 보낸다. 서버가 클릭을 기록하고 실제 판매처로 이동시킨다. 제휴 수수료 정산의 근거가 이 기록이다.

## 연결 순서

1. 백엔드를 Vercel에 올리고 `NEXT_PUBLIC_API_URL`을 넣는다.
2. 읽기만 하는 화면부터 바꾼다: 지도, 마켓, 견적 조회.
3. 쓰기가 있는 화면을 바꾼다: 렌더링 작업, 주문, 철거 요청, 파트너 등록.
4. Firestore 구독으로 렌더링 진행률을 받는다.
5. 판매처 링크를 `/go/{linkId}`로 바꾼다.

한 화면을 바꿀 때마다 같은 점검 스크립트를 다시 돌려 버튼이 모두 동작하는지 확인한다.

## 미구현 API

- 북마크 저장(`/me/saved`), 내 견적 목록(`/me/quotes`)
- 공실에 시군구 열이 없어서 철거 업체의 지역 매칭을 못 한다. 공실 등록 때 주소를 카카오 로컬로 변환해 시군구와 법정동 코드를 저장하면 해결된다.
- 철거 견적서를 확정 금액으로 바꾸는 일은 프론트의 `localStorage`에만 있다. 서버에 `demolition_requests.selected_bid_id`가 있어서 `GET /quotes/draft`가 이 값을 읽도록 고친다.
