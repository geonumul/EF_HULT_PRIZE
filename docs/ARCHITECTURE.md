# 아키텍처

Figma의 "08 Backend · Data" 페이지는 FastAPI, Redis+Celery, GPU 서버, 직접 운영하는 PostgreSQL과 S3를 전제로 한다. 배포 대상이 Vercel, Supabase, Firebase로 정해졌으므로 서버를 직접 운영하지 않는 구성으로 바꿨다. 화면, API 경로, 데이터 모델은 Figma 그대로 둔다.

## 서비스별 역할

| 서비스 | 맡는 일 | Figma 구성에서 대체한 것 |
|---|---|---|
| Vercel | `frontend/`(Next.js)와 `backend/`(FastAPI, Python 함수) 호스팅 | API Server, Web Client 호스팅 |
| Supabase | Postgres(PostGIS, pgvector), 로그인, 파일 저장소 | PostgreSQL, JWT 자체 인증, Object Storage(S3) |
| Firebase | Cloud Functions 2세대로 렌더링 작업 실행, Cloud Tasks로 작업 대기열, Firestore로 진행률 전달 | Redis, Celery, Render Queue, GPU Worker |

## 데이터 흐름

1. 브라우저가 `frontend/`를 연다. 지도 데이터와 견적은 `backend/` API로 받는다.
2. `backend/`는 Supabase Postgres를 읽고 쓴다. 공실 지도 조회는 PostGIS 쿼리다.
3. 렌더링 요청(`POST /render-jobs`)이 오면 `backend/`가 `render_jobs` 행을 만들고 Cloud Tasks에 작업을 넣는다.
4. Firebase의 `functions/`가 작업을 받아 이미지를 만든다. 결과 이미지는 Supabase Storage에 저장한다.
5. 작업 상태는 Supabase의 `render_jobs`가 기준이다. 진행률만 Firestore 문서에 복사하고, 브라우저가 그 문서를 구독해 진행 막대를 그린다.
6. 렌더링이 끝나면 상품 매칭(CLIP + pgvector)과 견적 계산을 이어서 실행하고 결과를 Supabase에 저장한다.

## 시안에 없는 기능

렌더링을 상품 선택에서 시작하는 방식과, 철거 견적 및 철거 업체 매칭은 [FEATURES.md](FEATURES.md)에 따로 정리했다. 구조는 같고 테이블과 API만 늘어난다.

## 정한 것과 이유

**로그인은 Supabase Auth 하나만 쓴다.** Firebase Auth는 쓰지 않는다. 로그인 사용자를 DB의 행 단위 보안(RLS)에 바로 연결할 수 있어서다. 두 곳에 사용자를 두면 동기화 코드가 필요하다.

**Firestore는 진행률 전달에만 쓴다.** 데이터 원본은 모두 Supabase에 있다. Firestore 문서가 지워져도 잃는 데이터는 없다.

**GPU 서버를 두지 않는다.** Vercel과 Firebase 모두 GPU가 없다. MVP는 외부 이미지 생성 API를 호출한다. Figma 문서의 SDXL + ControlNet, Depth Anything, Grounding DINO를 직접 호스팅하는 방식은 MVP 이후로 미룬다. 외부 API를 고르는 일은 ROADMAP 6단계에서 한다. 이 선택은 아직 확정이 아니다.

**긴 작업은 Vercel 함수에서 돌리지 않는다.** Vercel 함수에는 플랜별 실행 시간 제한이 있다. 렌더링은 수십 초에서 수 분이 걸릴 수 있어서 Firebase로 넘긴다. 정확한 제한 시간은 배포 직전에 Vercel 문서에서 확인한다.

**Firebase 요금제는 Blaze가 필요하다.** Cloud Functions가 외부 API를 호출하려면 종량제 요금제여야 한다. 무료 사용량 안에서 쓰더라도 카드 등록이 필요하다.

**`backend/`는 Vercel의 Python 런타임에 올린다.** Figma 문서의 FastAPI를 그대로 쓰되 상시 실행 서버가 아니라 요청마다 실행되는 함수로 동작한다. 연결을 오래 붙들고 있는 기능은 넣지 않는다.

## 외부 API

Figma "09 API · 상품 연결" 페이지의 표를 따른다. 키는 모두 서버 환경변수에 둔다. 브라우저에 나가는 키는 카카오 JavaScript 키와 토스 클라이언트 키뿐이다. Supabase의 anon 키와 Firebase 웹 설정은 공개되도록 설계된 값이어서 브라우저에 두어도 된다.

## 폴더별 책임

- `frontend/`: 화면, 지도, 상태 관리. 비밀 키를 가지지 않는다.
- `backend/`: 인증 확인, 비즈니스 규칙(적합성 판정, 견적 계산), 외부 API 호출.
- `functions/`: 렌더링 작업, 상품 매칭, 배치 작업(상품 수집, 링크 점검).
- `supabase/`: 마이그레이션 SQL, 시드 데이터. 스키마의 기준은 이 폴더다.
