# frontend

Next.js 15(App Router)와 TypeScript로 만드는 웹 앱이다. Vercel에 올린다.

## 실행

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 http://localhost:3000 을 연다. `/`는 `/map`으로 이동한다.

## 폴더

```
src/
├─ app/                 주소 하나가 폴더 하나다. page.tsx가 그 주소의 화면이다.
├─ components/
│  ├─ layout/           Header, Footer
│  └─ common/           여러 화면에서 쓰는 작은 조각
└─ styles/
   ├─ tokens.css        Figma 디자인 토큰(색, 모서리, 그림자, 글자)
   └─ globals.css       기본 스타일
```

## 스타일 방식

Tailwind 대신 컴포넌트마다 CSS 파일(`Header.tsx`와 `Header.module.css`)을 짝으로 둔다. Figma에서 가져온 값을 CSS 그대로 읽을 수 있고 의존성이 적기 때문이다. 색과 크기는 `tokens.css`의 변수를 쓴다. 변수와 Figma 이름의 대응은 [docs/DESIGN_TOKENS.md](../docs/DESIGN_TOKENS.md)에 있다.

## 만든 화면

데이터는 `src/mocks/`의 가짜 데이터다. 환경변수(`.env.example` 참고)가 없어도 모든 화면이 동작한다.

| 주소 | 화면 | 비고 |
|---|---|---|
| `/map`, `/map?use=cafe` | S01·S02 공실 지도 | 카카오 키가 없으면 정적 지도 |
| `/space/[id]/studio`, `/space/[id]/studio/chat` | S03 공간 스튜디오, S04 텍스트 렌더링 | 이미지 먼저 / 상품 먼저 전환 |
| `/quote`, `/quote/[id]`, `/quote/[id]/done` | 견적 목록, S05 견적 확정·결제, S06 결제 완료 | 토스 키가 없으면 데모 결제 |
| `/market`, `/market/[category]` | S07 집기 마켓 | 렌더링 보드 담기 |
| `/guide` | S08 창업 가이드 | |
| `/login`, `/signup` | S09 로그인·회원가입 | Supabase 키가 없으면 데모 모드 |
| `/partner`, `/partner/apply`, `/partner/demolition` | S10 파트너 콘솔, S11 입점 문의, 철거 요청 | |
| `/space/[id]/demolition`, `/demolition/[requestId]` | 철거 견적 추정, 업체 견적 비교 | 시안 없는 추가 기능 |

## 폴더 추가 설명

- `src/types/`: 화면과 API가 함께 쓰는 데이터 모양
- `src/mocks/`: 가짜 데이터. 백엔드 연결 때 이 폴더를 API 호출로 바꾼다
- `src/lib/`: 금액 표시, 견적 계산, 세션, 렌더링 보드 같은 작은 함수 모음
- `src/components/ui/`: 버튼, 칩, 배지

단계별 계획은 [docs/ROADMAP.md](../docs/ROADMAP.md)에 있다.
