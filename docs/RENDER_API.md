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

## 시연용 렌더링을 도면에서 만드는 방법

화면의 미리 만든 렌더링 이미지는 도면이 먼저고 이미지가 나중이다. 이미지에서 가구 위치를 읽어 도면을 그리면 원근 때문에 맞지 않아서 순서를 바꿨다. 모두 `functions` 폴더에서 한다.

1. 사진에서 카메라를 구한다. 선분에서 깊이 방향과 가로 방향 소실점을 구하면 초점거리가 나온다. 결과는 `tools/calib/<사진 번호>.json`에 있다(`vp1`, `vp2`, `f`, 카메라 높이 `h`, 도면 좌표 기준점 `anchor`). 사진 08은 사진 속 벽과 바닥의 접합부와 바닥 줄눈 선도 소실점 계산에 썼다.
2. `python tools/build_plans.py`가 도면 5개를 `tools/plans-src/<사진 번호>-<업종>.json`에 쓴다. 가구는 설계 기준(카운터 앞 1200, 뒤 900, 줄 사이 850, 입구 앞 1200 비움)을 지키도록 직접 놓았다. 기둥과 계단 같은 구조물, 카메라 위치와 시야, 이미지 속 번호 위치(`pins`)도 같이 들어 있다.
3. `python tools/guide_render.py <사진> tools/calib/<번호>.json tools/plans-src/<키>.json tools/guides/<키>-guide.png --crop-aspect 1.5`로 가이드를 그린다. 사진에서 뽑은 건축 선화 위에, 도면의 가구를 같은 원근의 색 상자로 얹은 그림이다. 사진 08은 3:2(`1.5`), 사진 02는 4:3(`1.3333`)으로 자른다. 자른 사진은 `<키>-guide-photo.jpg`로 같이 저장된다.
4. `bash tools/make_guided_renders.sh`가 우드톤 기준 이미지를 가이드로 만든다(`--structure-kind guide`, 검수와 재시도 최대 2번). 화이트 미니멀과 인더스트리얼은 기준 이미지를 고쳐서 같은 구도로 만든다. 결과는 `tools/guides/out/<키>-<스타일>/`에 쌓인다. 장당 약 $0.034다.
5. `python tools/collect_renders.py --raw functions/tools/guides/out --keep 09-cafe-wood 09-cafe-white 09-cafe-industrial`가 결과를 `frontend/public/images/renders`로 옮기고 목록을 새로 쓴다. 이번에 만들지 않은 사진 09의 항목은 `--keep`으로 남긴다.
6. `node lib/scripts/imagePlans.js`가 `plans-src`의 도면에서 간격과 법령 항목을 다시 재서 `frontend/src/lib/imagePlans.ts`를 만든다.

도면을 바꾸면 3번부터 다시 한다. 이미지는 도면에 맞춰 새로 만들어야 한다.

`pregenerate.js`에는 `--layout <도면.json>`(도면의 방 크기와 가구 위치를 그대로 쓴다), `--structure-kind guide`, `--aspect 3:2`가 있다. 

한계: 사진 속 방은 목록의 면적(89㎡ 안팎)과 같지 않을 수 있어서, 도면의 방 크기는 면적에 맞춰 정했다. 사진 08은 공간이 훨씬 넓고 안쪽 벽이 없다. 그래서 도면의 안쪽 벽은 사진 속 바닥 위에 정한 가상의 선이다. 이미지는 가이드의 상자 자리를 대체로 따르지만 위치가 조금 어긋나거나 가구가 더 그려질 수 있다.
