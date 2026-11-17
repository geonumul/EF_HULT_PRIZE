# functions

Firebase Cloud Functions 2세대(TypeScript) 코드다. AI 렌더링 작업, 상품 수집, 판매처 링크 점검을 처리한다. 전체 흐름은 [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)의 "데이터 흐름"을 따른다.

## 함수

| 함수 | 종류 | 하는 일 |
|---|---|---|
| `runRenderJob` | HTTP (Cloud Tasks 대상, `invoker: private`) | 7단계 렌더링 파이프라인을 실행한다 |
| `checkProductLinks` | 스케줄, 매일 04:00 (Asia/Seoul) | `product_links`의 상태와 가격을 다시 확인하고 대체안을 표시한다 |
| `collectProducts` | 스케줄, 매일 03:00 (Asia/Seoul) | 네이버 쇼핑과 쿠팡 파트너스에서 상품을 모아 정규화해 저장한다 |

리전은 `asia-northeast3`(서울)이다. 바꾸려면 `src/index.ts`의 `REGION`을 고친다.

### 렌더링 파이프라인 (`runRenderJob`)

| 단계 | 진행률 | 내용 |
|---|---|---|
| 시작 | 5 | `status`를 `running`으로 바꾼다 |
| 1 공간 정보 읽기 | 10 | 가로, 세로, 천장고를 읽는다 |
| 2 배치 생성 | 25 | `text`는 업종 템플릿과 상품 치수로, `products`는 고른 상품으로 배치한다 |
| 3 치수 검증 | 40 | 통로 850mm 이상, 테이블 간격 600mm, 기구 간격 100mm. 미달이면 최대 3번 다시 배치한다 |
| 4 이미지 생성 | 65 | 이미지 생성 어댑터를 부른다 |
| 5 상품 매칭 | 80 | `text`만 실행한다. 객체 검출, 임베딩 유사도 상위 3개. 0.85 이상은 "같은 상품", 미만은 "비슷한 상품", 맞는 상품이 없으면 태그 없음 |
| 6 견적 산출 | 90 | 상품 단가 x 수량을 합친다. 맞는 상품이 없는 집기는 "직접 찾기"로 남긴다 |
| 7 결과 저장 | 100 | 이미지를 Storage `renders` 버킷에, 결과를 `renders`와 `render_items`에 저장한다 |

재배치 규칙은 모드마다 다르다. `text`는 들어가지 않는 집기를 빼고 다시 배치한다. `products`는 사용자가 고른 상품이라 빼지 않고 큰 것부터 다시 채우며, 끝내 안 들어가면 어떤 상품이 문제인지 `render_jobs.error`에 적고 `failed`로 끝낸다.

배치와 검증 규칙의 수치는 `src/pipeline/rules.ts`에 모여 있다.

## 계약

Cloud Tasks 큐가 `runRenderJob`에 POST하는 본문이다.

```json
{ "jobId": "...", "listingId": "...", "useType": "cafe", "mode": "text", "prompt": "...", "productIds": [] }
```

- `mode`는 `text`(이미지 먼저) 또는 `products`(상품 먼저)다.
- `products` 모드에서 같은 상품 id를 여러 번 적으면 그 수량이다.
- 작업이 실패해도 함수는 200으로 답한다. 큐가 같은 작업을 다시 보내지 않게 하려는 것이다. 실패 이유는 `render_jobs.error`에 있다.

Supabase `render_jobs`가 작업 상태의 기준이다. 열은 `id`, `status`(`queued|running|done|failed`), `progress`(0~100), `mode`, `listing_id`, `use_type`, `prompt`, `product_ids`, `result_render_id`, `error`다.

Firestore `renderJobs/{jobId}`에는 `status`와 `progress`만 복사한다. 브라우저가 이 문서를 구독한다. `firestore.rules`는 읽기만 허용하고 쓰기를 모두 막는다. 함수는 관리자 권한으로 쓴다.

## 어댑터

외부 서비스는 `src/adapters/`의 인터페이스 뒤에 있다. 환경변수가 없으면 가짜 구현이 돌아서 에뮬레이터에서 파이프라인이 끝까지 돈다.

| 어댑터 | 파일 | 지금 상태 |
|---|---|---|
| `ImageGenerator` | `imageGenerator.ts` | 가짜 구현만 있다. 1x1 PNG를 돌려준다 |
| `ObjectDetector` | `objectDetector.ts` | 가짜 구현만 있다 |
| `ImageEmbedder` | `imageEmbedder.ts` | 가짜 구현만 있다 |
| `ShopSearch` | `shopSearch.ts` | 네이버, 쿠팡 모두 가짜 구현만 있다 |
| `LinkChecker` | `linkChecker.ts` | 가짜 구현만 있다 |
| `Database` (Supabase) | `supabaseClient.ts` | `SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY`가 있으면 `SupabaseDatabase`를 쓴다. `render_jobs` 갱신과 Storage 업로드만 구현했고 나머지는 스키마 확정 후 구현한다(`TODO`) |
| `ProgressPublisher` | `progressPublisher.ts` | Cloud Functions나 에뮬레이터 안에서는 Firestore에 쓰고, 그 밖에서는 가짜를 쓴다 |

실제 서비스 연결 지점은 `src/adapters/index.ts`의 `createAdapters`다. 각 파일 끝의 `TODO: 공식 문서 확인` 주석이 구현할 자리다.

## 환경변수

값은 저장소에 올리지 않는다. 로컬은 `functions/.env`(커밋하지 않는다), 배포는 Firebase 환경변수나 Secret Manager를 쓴다.

| 이름 | 쓰는 곳 |
|---|---|
| `SUPABASE_URL` | Supabase 프로젝트 주소 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 롤 키 |
| `IMAGE_GEN_API_KEY` | 외부 이미지 생성 API |
| `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` | 네이버 쇼핑 검색 |
| `COUPANG_ACCESS_KEY`, `COUPANG_SECRET_KEY` | 쿠팡 파트너스 |

## 로컬 실행

```bash
cd functions
npm install
npm test            # 빌드 후 단위 테스트와 가짜 어댑터 통합 테스트를 돌린다
npm run build       # tsc만 실행한다
npm run serve       # 빌드 후 함수와 Firestore 에뮬레이터를 켠다 (firebase-tools, Java 필요)
```

에뮬레이터에서 렌더링 작업을 직접 불러 볼 때는 함수 주소로 POST한다. `invoker: private`는 에뮬레이터에서 검사하지 않는다.

```bash
curl -X POST http://127.0.0.1:5001/shopportunity-demo/asia-northeast3/runRenderJob \
  -H "Content-Type: application/json" \
  -d '{"jobId":"job-1","listingId":"l-1","useType":"cafe","mode":"text","prompt":"따뜻한 카페","productIds":[]}'
```

## 배포

```bash
firebase deploy --only functions
firebase deploy --only firestore:rules,firestore:indexes
```

`.firebaserc`의 프로젝트 ID `shopportunity-demo`는 자리표시자다. 실제 프로젝트 ID로 바꾼다. Blaze 요금제가 필요하다.
