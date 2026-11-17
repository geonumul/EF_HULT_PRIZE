# 배포

## 환경변수

값은 저장소에 올리지 않는다. 각 폴더의 `.env.example`에 이름만 적고, 실제 값은 로컬 `.env`와 각 서비스 대시보드에 넣는다.

| 이름 | 쓰는 곳 | 브라우저 노출 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | frontend | 가능 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | frontend | 가능 |
| `NEXT_PUBLIC_KAKAO_JS_KEY` | frontend | 가능. 카카오 콘솔에 도메인 등록 |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | frontend | 가능 |
| `NEXT_PUBLIC_FIREBASE_CONFIG` | frontend | 가능. Firestore 읽기 전용 규칙 필요 |
| `SUPABASE_SERVICE_ROLE_KEY` | backend, functions | 불가 |
| `SUPABASE_DB_URL` | backend, functions | 불가 |
| `KAKAO_REST_KEY` | backend | 불가 |
| `VWORLD_KEY` | backend | 불가 |
| `DATA_GO_KR_KEY` | backend | 불가. 건축HUB, 상가정보 공용 |
| `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` | functions | 불가 |
| `COUPANG_ACCESS_KEY`, `COUPANG_SECRET_KEY` | functions | 불가 |
| `TOSS_SECRET_KEY` | backend | 불가 |
| `IMAGE_GEN_API_KEY` | functions | 불가. 외부 이미지 생성 API |
| `FIREBASE_SERVICE_ACCOUNT` | backend | 불가. Cloud Tasks 등록용 |

## 배포 순서

1. **Supabase 프로젝트를 만든다.** `postgis`, `vector` 확장을 켠다. `supabase/migrations/`의 SQL을 순서대로 적용한다.
2. **Supabase Storage 버킷을 만든다.** `listing-photos`, `renders`, `quote-pdfs` 세 개다.
3. **Firebase 프로젝트를 만든다.** Blaze 요금제로 올리고 Firestore, Cloud Functions, Cloud Tasks를 켠다.
4. **`functions/`를 배포한다.** `firebase deploy --only functions`.
5. **Vercel에 프로젝트 두 개를 연결한다.** 같은 저장소에서 Root Directory를 `frontend`, `backend`로 각각 지정한다.
6. **환경변수를 넣는다.** 위 표의 값을 Vercel과 Firebase에 각각 넣는다.
7. **카카오 개발자 콘솔에 Vercel 도메인을 등록한다.** 등록하지 않으면 지도가 뜨지 않는다.

## 확인할 것

- Vercel 함수 실행 시간 제한을 현재 플랜 기준으로 확인한다.
- Supabase 무료 플랜은 일정 기간 접속이 없으면 프로젝트가 일시 중지된다. 시연 전에 깨워 둔다.
- 이미지 생성 API의 요금과 호출 제한을 6단계 시작 전에 확인한다.
