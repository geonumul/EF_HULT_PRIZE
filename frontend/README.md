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

| 주소 | 상태 |
|---|---|
| 공통 Header, Footer | 완료 |
| `/map`, `/quote`, `/market`, `/guide`, `/login`, `/signup`, `/partner` | 안내 페이지만 있음 |

단계별 계획은 [docs/ROADMAP.md](../docs/ROADMAP.md)에 있다.
