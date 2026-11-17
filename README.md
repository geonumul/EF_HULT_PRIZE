# Shopportunity

빈 상가에 들어올 수 있는 업종을 판정하고, 그 업종의 매장 렌더링과 확정 견적을 보여주는 창업 공간 플랫폼이다. 가톨릭대학교 글로벌 창업경진대회 출품작이다.

## 폴더 구조

| 폴더 | 내용 | 배포 |
|---|---|---|
| [frontend/](frontend/) | Next.js 웹 앱 | Vercel |
| [backend/](backend/) | FastAPI REST API | Vercel (Python 함수) |
| [functions/](functions/) | AI 렌더링 작업 처리 | Firebase Cloud Functions |
| [supabase/](supabase/) | DB 스키마와 시드 데이터 | Supabase |
| [docs/](docs/) | 설계 문서 | 없음 |

## 문서

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): 서비스별 역할과 데이터 흐름
- [docs/DEPLOY.md](docs/DEPLOY.md): 환경변수와 배포 순서
- [docs/ROADMAP.md](docs/ROADMAP.md): 개발 단계와 진행 상태
- [docs/DESIGN_TOKENS.md](docs/DESIGN_TOKENS.md): Figma 디자인 토큰과 CSS 변수 대응표
- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md): 브랜치와 커밋 규칙

## 디자인

Figma 파일 `f1SFaV1DwLkSJAeDOGfkok`의 화면 S01~S11을 코드로 옮긴다. 화면별 Figma 프레임 ID는 [docs/ROADMAP.md](docs/ROADMAP.md)에 있다.
