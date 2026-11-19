# 배치 계획과 렌더링 API

화면(frontend)이 부르는 Firebase 함수 두 개의 약속이다. 구현은 `functions/src/http/`에 있다. 길이는 모두 mm, 비율은 0~100이다.

주소 기본값(환경변수로 바꿀 수 있다)

| 함수 | 기본 주소 | 환경변수 |
|---|---|---|
| planLayout | https://asia-northeast3-shopportunity-8e794.cloudfunctions.net/planLayout | NEXT_PUBLIC_PLAN_URL |
| generateRender | https://asia-northeast3-shopportunity-8e794.cloudfunctions.net/generateRender | NEXT_PUBLIC_GENERATE_URL |

두 함수 모두 POST, JSON, CORS 허용이다.

## 공통 입력

```
room:    { widthMm, depthMm, ceilingMm }
useType: "cafe" | "popup" | "pilates" | 그 밖의 업종 문자열
items?:  [{ productId, name, category, widthMm, depthMm, heightMm, qty, imagePath? }]
```

- room은 화면에서 공간 면적으로 계산한다. 가로 = 면적 / 깊이, 깊이 = sqrt(면적 × 1.4). 실측을 알면 그 값을 쓴다.
- category는 chair, table, counter, lamp, shelf, reformer, locker 중 하나이면 업종 배치 규칙이 적용된다. 그 밖에는 일반 집기로 본다.
- items가 없으면 업종 기본 구성(템플릿)으로 배치한다.
- imagePath는 상품 사진 경로(`/images/...jpg`). 생성할 때 참고 이미지로 쓴다.

## POST planLayout (비용 없음, 인증 없음)

배치를 계산하고 설계 기준을 점검한다. 이미지는 만들지 않는다.

응답

```
{
  room, useType,
  placed:   [{ productId, name, category, kind: "table"|"chair"|"fixture", x, y, widthMm, depthMm,
               heightMm?, chairs, hanging?: boolean }],
  unplaced: [{ productId, name }],
  violations: [{ rule: "not_fit"|"overlap"|"aisle"|"gap"|"entry"|"wall", message, productIds }],
  notes:    [{ level: "error"|"check", text, source }],          // 법령 점검 항목
  entryZone: { left, right, top },                                 // 입구 앞 비움 구역. 입구는 앞쪽 벽(y = depthMm) 가운데
  clearances: [{ id, label, valueMm, requiredMm, ok }]             // 계산된 간격
}
```

- 좌표 원점은 안쪽 벽의 왼쪽 위 모서리다. x는 오른쪽, y는 입구 쪽(아래)으로 늘어난다.
- hanging이 true인 물건(조명)은 바닥을 차지하지 않는다. 평면도에서는 점선 원으로 그린다.
- clearances.id: `counter_front`(카운터 앞), `counter_back`(카운터 뒤 직원 통로), `wall_seat`(벽과 의자 뒤), `aisle`(줄 사이 통로), `entry`(입구 앞 비움). 해당 없으면 목록에 없다.

## POST generateRender (비용 있음, 접근 코드 필요)

공간 사진과 배치로 렌더링 이미지를 만들고, 이미지 속 가구 위치를 찾아 상품과 연결한다. 20~90초 걸린다.

요청: 공통 입력에 아래를 더한다.

```
code:        접근 코드(문자열). 틀리면 401
spaceNumber: "01" ~ "12"   // 예시 사진 번호. /images/spaces/space-NN.jpg
style:       "wood" | "white" | "industrial"
attempts?:   1 | 2          // 검수에 실패하면 다시 만드는 최대 횟수. 기본 2
```

응답 200

```
{
  imageDataUrl: "data:image/jpeg;base64,...",
  tags:   [{ n, x, y, productId, qty }],        // x, y는 이미지 안 위치(%). 상품과 이미지 속 가구를 잇는다.
  plan:   (planLayout 응답과 같다),
  critique: { passed, score, total, failed: [{ id, note }] },
  attempts: 1 | 2
}
```

오류: `{ error: "메시지" }` — 400 입력 오류, 401 접근 코드 틀림, 429 일일 한도, 500 생성 실패.

## 화면에서 지켜야 할 것

- 생성한 이미지는 "AI 생성 예시이며 실제 공간과 다를 수 있음"을 반드시 표시한다.
- 접근 코드는 사용자가 한 번 입력하면 localStorage에 저장한다(키 이름 `shopportunity-render-code`).
- 함수가 실패하거나 응답이 없으면 화면은 기존 동작(미리 만든 이미지)으로 돌아간다.
