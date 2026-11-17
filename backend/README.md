# backend

FastAPI로 만든 REST API다. Vercel의 Python 런타임에 올린다. 엔드포인트는 [docs/API.md](../docs/API.md)에 있다. 맡는 일은 [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)의 "폴더별 책임"을 따른다.

## 구조

| 경로 | 역할 |
|---|---|
| `app/main.py` | 앱 생성, CORS, 라우터 등록 |
| `app/routers/` | 엔드포인트. `listings`, `products`, `render_jobs`, `quotes`, `demolition` |
| `app/services/` | 업무 규칙. `suitability`(적합성 규칙표), `quote`(견적 단가), `demolition`, `render_jobs`, `queue`(Cloud Tasks 등록) |
| `app/services/external/` | 외부 API 어댑터. 카카오 로컬, 브이월드, 건축HUB, 상가정보, 네이버 쇼핑, 쿠팡 파트너스, 토스 |
| `app/data.py` | 데이터 접근. 인메모리와 Postgres가 같은 메서드를 가진다 |
| `app/seed_data.py` | 인메모리 가짜 데이터. 프론트 mocks와 같은 값 |
| `app/auth.py` | Supabase JWT 검증 |
| `api/index.py` | Vercel 진입점 |

## 실행

```bash
cd backend
py -3.11 -m venv .venv
.venv/Scripts/python -m pip install -r requirements-dev.txt   # macOS, Linux는 .venv/bin/python
.venv/Scripts/python -m uvicorn app.main:app --port 3210 --reload
```

`http://localhost:3210/docs`에서 API 문서를 볼 수 있다.

## 테스트

```bash
.venv/Scripts/python -m pytest -q
```

환경변수 없이 인메모리 데이터로 돈다. 공실 조회, 적합성, 견적, 렌더링 작업, 주문, 철거 흐름, 인증을 검증한다.

## 환경변수

`.env.example`에 이름이 있다. 모두 비워 두면 가짜 데이터와 데모 동작으로 돈다.

| 이름 | 비어 있을 때 | 있을 때 |
|---|---|---|
| `SUPABASE_DB_URL` | 인메모리 가짜 데이터 | Supabase Postgres 사용. 서비스 권한 접속 문자열 |
| `SUPABASE_JWT_SECRET` | 데모 사용자로 통과 | JWT(HS256) 검증 |
| `CORS_ORIGINS` | `http://localhost:3000` | 쉼표로 이은 허용 주소 |
| `KAKAO_REST_KEY` | 예시 좌표와 법정동코드 | 카카오 로컬 호출 |
| `VWORLD_KEY` | 예시 용도지역(준공업지역) | 브이월드 호출 |
| `DATA_GO_KR_KEY` | 예시 건축물대장, 상가정보 | 건축HUB, 상가정보 호출 |
| `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` | 예시 상품 | 네이버 쇼핑 호출 |
| `COUPANG_ACCESS_KEY`, `COUPANG_SECRET_KEY` | 예시 상품, 원래 URL 그대로 | 쿠팡 검색과 딥링크 |
| `TOSS_SECRET_KEY` | 데모 승인 | 토스 결제 승인 호출 |
| `FIREBASE_SERVICE_ACCOUNT` | 가짜 진행(1.5초) | Cloud Tasks에 작업 등록. 서비스 계정 JSON 전체를 값으로 둔다 |
| `CLOUD_TASKS_LOCATION`, `CLOUD_TASKS_QUEUE`, `RENDER_WORKER_URL` | 위치 `asia-northeast3`, 큐 `render-jobs` | `RENDER_WORKER_URL`(렌더링 함수 주소)은 큐를 쓸 때 필수 |

## 확인해야 할 것

- 브이월드, 건축HUB, 상가정보, 네이버, 쿠팡의 응답 필드는 공식 문서로 확인하지 못했다. 해당 코드에 `TODO: 공식 문서 확인`이 있다. 키를 받으면 실제 응답과 맞춰 본다.
- Postgres 구현(`PostgresStore`)은 실제 DB 없이 작성했다. Supabase에 마이그레이션을 적용한 뒤 `SUPABASE_DB_URL`을 넣고 흐름을 한 번 돌려 본다.
- 소유자 확인은 라우터 코드가 한다. 서비스 권한 접속은 RLS를 지나간다.
- 시연용 철거 업체와 단가는 예시다. 단가를 `app/services/quote.py`, `app/services/demolition.py`에서 바꾼다.
