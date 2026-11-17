# 디자인 토큰

출처는 Figma "07 Frontend Handoff" 페이지와 S01 프레임의 변수 정의다. 코드는 [frontend/src/styles/tokens.css](../frontend/src/styles/tokens.css)에 있고, 이름은 Figma 변수와 맞췄다.

## 색

| Figma 변수 | CSS 변수 | 값 |
|---|---|---|
| z/brand-600 | `--brand-600` | `#00A862` |
| (핸드오프 표) | `--brand-500` | `#00B368` |
| z/brand-50 | `--brand-50` | `#EDFAF4` |
| z/gray-900 | `--gray-900` | `#191F28` |
| z/gray-700 | `--gray-700` | `#4E5968` |
| z/gray-500 | `--gray-500` | `#8B95A1` |
| z/gray-300 | `--gray-300` | `#D1D6DB` |
| z/gray-200 | `--gray-200` | `#E5E8EB` |
| z/gray-100 | `--gray-100` | `#F1F3F5` |
| z/gray-50 | `--gray-50` | `#F7F8FA` |
| z/gray-0 | `--gray-0` | `#FFFFFF` |

그라데이션 `--gradient-brand`는 주요 버튼, 선택 핀, 진행 바에만 쓴다.

## 모서리

| Figma | CSS | 값 |
|---|---|---|
| radius/xs | `--radius-xs` | 3px |
| radius/sm | `--radius-sm` | 4px |
| radius/md | `--radius-md` | 6px |
| (핸드오프 표) | `--radius-lg` | 8px |
| (핸드오프 표) | `--radius-xl` | 10px |
| radius/full | `--radius-full` | 9999px |

## 그림자와 효과

| Figma | CSS | 쓰는 곳 |
|---|---|---|
| elevation/1 | `--elevation-1` | 칩, 세그먼트 선택 항목 |
| elevation/2 | `--elevation-2` | 지도 컨트롤, 툴팁, 결제 카드 |
| elevation/3 | `--elevation-3` | 지도 미리보기 카드, 태그 팝오버 |
| glass | `.glass` 클래스 | 지도 위 검색창, 렌더링 위 배지 |
| brand-glow | `--brand-glow` | 그라데이션 버튼 |

## 글자

글꼴은 현재 시안이 Noto Sans KR이고, 개발은 Pretendard로 간다. `--font-sans`에서 한 줄로 바꾼다. 자간은 Figma 값이 퍼센트라서 `em`으로 옮겼다(-2% → -0.02em).

| Figma 스타일 | 클래스 | 크기 / 굵기 / 행간 / 자간 | 쓰는 곳 |
|---|---|---|---|
| heading/20 | `.text-heading-20` | 17 / 700 / 140% / -2% | 패널 제목 |
| nav/16 | `.text-nav-16` | 14 / 700 / 140% / -1% | GNB |
| price/20 | `.text-price-20` | 17 / 700 / 130% / -2.5% | 목록 창업비 |
| title/15 | `.text-title-15` | 13 / 700 / 140% / -1% | 카드 제목, 버튼 |
| body/14 | `.text-body-14` | 13 / 500 / 150% / -0.5% | 본문 |
| body/13 | `.text-body-13` | 12 / 500 / 150% / -0.3% | 임대 조건 |
| caption/12 | `.text-caption-12` | 11 / 500 / 150% / -0.2% | 보조 설명 |
| meta/12 | `.text-meta-12` | 11 / 400 / 150% / 0 | 면적, 위치 |
| label/11 | `.text-label-11` | 10 / 700 / 140% / 0 | 배지 |

스타일 이름의 숫자(heading/20)와 실제 크기(17)가 다르다. Figma 쪽 이름이 예전 크기로 남은 것으로 보인다. 코드는 실제 크기를 따른다.
