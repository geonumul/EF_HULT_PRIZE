# supabase

DB 스키마의 기준이 되는 폴더다. Figma "08 Backend · Data"의 데이터 모델과 [docs/FEATURES.md](../docs/FEATURES.md)의 데이터 변경(렌더링 방식, 철거)을 SQL로 옮겼다.

## 파일

| 파일 | 내용 |
|---|---|
| `migrations/0001_extensions.sql` | `postgis`, `vector` 확장 |
| `migrations/0002_tables.sql` | 테이블 18개와 가입 시 `users` 행을 만드는 트리거 |
| `migrations/0003_rls.sql` | 모든 테이블의 행 단위 보안(RLS) 정책 |
| `seed.sql` | 공실 4곳, 상품 10개, 판매처 링크, 렌더링과 태그, 적합성, 업체. 프론트 `mocks/`와 같은 값 |

테이블: users, vendors, listings, spaces, suitability, products, product_links, renders, render_items, quotes, orders, render_jobs, render_boards, render_board_items, demolition_requests, demolition_bids, reviews, link_clicks.

## 적용

Supabase 대시보드의 SQL Editor에서 `0001`, `0002`, `0003`, `seed.sql` 순서로 실행한다. Supabase CLI를 쓰면 `supabase db push` 뒤에 `seed.sql`을 실행한다.

## 정한 것

- 공실, 공간, 상품, 판매처 링크, 렌더링, 업체의 id는 text다. 프론트 가짜 데이터(`seongsu-2ga-1f`, `chair-oak`)와 id를 맞추려는 것이다. 사용자 소유 데이터(견적, 주문, 작업, 철거 요청)의 id는 uuid다.
- 공간은 공실마다 하나이고 `spaces.id`가 `listings.id`와 같다. `spaces.condition`이 철거 필요 여부를 가른다.
- 금액 단위는 `listings`의 `deposit`, `rent`, `costs`가 만원이고 나머지는 원이다.
- `products.embedding`은 CLIP 이미지 임베딩이고 차원은 512다. 쓰는 모델을 바꾸면 `0002_tables.sql`의 차원도 바꾼다.
- `render_jobs.items`는 상품 먼저 방식의 상품별 수량이다. Cloud Tasks 페이로드에는 상품 id만 들어가므로 함수가 수량이 필요하면 이 열을 읽는다.
- `quotes.breakdown`에 견적서 전체(집기, 설비, 시공, 철거 그룹)를 JSON으로 저장한다.
- `demolition_requests.vendor_ids`는 요청을 전달받은 업체 목록이다.

## RLS

모든 테이블이 켜져 있다. 공실, 공간, 적합성, 렌더링, 상품, 판매처 링크, 후기는 누구나 읽는다. 견적, 주문, 렌더링 작업, 렌더링 보드, 철거 요청은 본인 것만 읽고 쓴다. 파트너 업체는 자기 상품과 자기 철거 견적을 쓰고, 전달받은 철거 요청을 읽는다. 주문, 적합성, 렌더링, `link_clicks`의 쓰기와 철거 견적 선택은 서비스 권한(`backend/`, `functions/`)만 한다.

## 확인하지 못한 것

로컬에 Postgres가 없어 SQL을 실제로 실행해 보지 못했다. Supabase 프로젝트에 적용하면서 오류를 확인한다.
