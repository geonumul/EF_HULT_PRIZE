// 한국어 문장으로 배치를 고친다. "테이블 2개 더 놔줘", "의자 하나 빼줘", "카운터를 입구 쪽으로".
// 문장은 규칙으로 읽는다(AI 호출 없음). 자리는 lib/scene.ts의 빈자리 찾기가 정하고, 설계 기준은 그 자리에서 지켜진다.
import { KIND_LABELS, addItem, kindOf, moveNear, removeItem, setCount } from "@/lib/scene";
import type { Kind } from "@/lib/scene";
import type { Scene, SceneItem } from "@/types/scene";

export type TextResult = { scene: Scene; message: string; changed: boolean };

const KIND_WORDS: [RegExp, Kind][] = [
  [/테이블|탁자|전시대/, "table"],
  [/카운터|계산대|바\s*테이블/, "counter"],
  [/선반|진열대|진열장/, "shelf"],
  [/조명|램프|펜던트/, "lamp"],
  [/리포머|기구|머신/, "reformer"],
  [/쇼케이스/, "showcase"],
];

const KOREAN_NUMBERS: [RegExp, number][] = [
  [/한\s*개|하나/, 1],
  [/두\s*개|둘/, 2],
  [/세\s*개|셋/, 3],
  [/네\s*개|넷/, 4],
  [/다섯/, 5],
  [/여섯/, 6],
  [/일곱/, 7],
  [/여덟/, 8],
];

/** 문장에서 개수를 읽는다. 없으면 null */
function readCount(text: string): number | null {
  const digits = text.match(/(\d+)\s*(개|대|명|석)?/);
  if (digits) return Number(digits[1]);
  for (const [pattern, value] of KOREAN_NUMBERS) if (pattern.test(text)) return value;
  return null;
}

const ADD_WORDS = /더|추가|놔|놓아|놓고|늘려|넣어|만들어/;
const REMOVE_WORDS = /빼|줄여|지워|삭제|없애|치워|제거/;
const ALL_WORDS = /모두|전부|다\s*(빼|지워|삭제|없애|치워)/;

const PLACES: { pattern: RegExp; label: string; anchor: (scene: Scene) => { x: number; y: number } }[] = [
  { pattern: /창가|창쪽|창\s*쪽/, label: "창가", anchor: (s) => ({ x: (s.structures.find((st) => st.kind === "window")?.x ?? 0) + 1200, y: s.room.depthMm / 2 }) },
  { pattern: /입구/, label: "입구 쪽", anchor: (s) => ({ x: s.room.widthMm / 2, y: s.room.depthMm - 2600 }) },
  { pattern: /안쪽|뒤쪽|뒤로|깊은/, label: "안쪽", anchor: (s) => ({ x: s.room.widthMm / 2, y: 1500 }) },
  { pattern: /왼쪽|좌측/, label: "왼쪽", anchor: (s) => ({ x: 1800, y: s.room.depthMm / 2 }) },
  { pattern: /오른쪽|우측/, label: "오른쪽", anchor: (s) => ({ x: s.room.widthMm - 1800, y: s.room.depthMm / 2 }) },
  { pattern: /가운데|중앙|한가운데/, label: "가운데", anchor: (s) => ({ x: s.room.widthMm / 2, y: s.room.depthMm / 2 }) },
];

const CHAIR_ANGLES = [180, 0, 270, 90];

function findKind(text: string): Kind | null {
  for (const [pattern, kind] of KIND_WORDS) if (pattern.test(text)) return kind;
  return null;
}

/** 의자 수를 고친다. 의자는 둥근 테이블에 딸려 있어서 자리가 적은 테이블부터 채우고, 많은 테이블부터 뺀다. */
function changeChairs(scene: Scene, delta: number): TextResult {
  let items = scene.items;
  let done = 0;
  for (let i = 0; i < Math.abs(delta); i += 1) {
    const tables = items.filter((item) => item.round);
    if (tables.length === 0) break;
    const pick: SceneItem = delta > 0
      ? tables.reduce((a, b) => ((a.chairAngles?.length ?? 0) <= (b.chairAngles?.length ?? 0) ? a : b))
      : tables.reduce((a, b) => ((a.chairAngles?.length ?? 0) >= (b.chairAngles?.length ?? 0) ? a : b));
    const angles = pick.chairAngles ?? [];
    let next = angles;
    if (delta > 0) {
      const free = CHAIR_ANGLES.find((deg) => !angles.includes(deg));
      if (free === undefined) break;
      next = [...angles, free];
    } else {
      if (angles.length === 0) break;
      next = angles.slice(0, -1);
    }
    items = items.map((item) => (item.id === pick.id ? { ...item, chairAngles: next, chairs: next.length } : item));
    done += 1;
  }
  if (done === 0) return { scene, changed: false, message: delta > 0 ? "의자를 더 놓을 수 있는 테이블이 없어요." : "뺄 의자가 없어요." };
  return { scene: { ...scene, items, updatedAt: Date.now(), edited: true }, changed: true, message: `의자 ${done}개를 ${delta > 0 ? "더했어요" : "뺐어요"}.` };
}

export function applyText(scene: Scene, rawText: string): TextResult {
  const text = rawText.trim();
  if (!text) return { scene, changed: false, message: "고치고 싶은 내용을 적어 주세요." };

  // 의자
  if (/의자/.test(text) && !findKind(text)) {
    const n = readCount(text) ?? 1;
    if (REMOVE_WORDS.test(text)) return changeChairs(scene, -n);
    if (ADD_WORDS.test(text)) return changeChairs(scene, n);
  }

  const kind = findKind(text);
  if (!kind) return { scene, changed: false, message: "무엇을 고칠지 못 알아들었어요. 예: 테이블 2개 더 놔줘, 선반 하나 빼줘, 카운터를 입구 쪽으로." };
  const label = KIND_LABELS[kind];
  const same = scene.items.filter((item) => kindOf(item) === kind);

  // 이동
  const place = PLACES.find((p) => p.pattern.test(text));
  if (place && /(으로|로|쪽)/.test(text) && !ADD_WORDS.test(text.replace(/옮|이동/g, "")) && same.length > 0) {
    const target = same[0];
    const moved = moveNear(scene, target.id, place.anchor(scene));
    if (!moved.ok) return { scene, changed: false, message: `${label}을(를) ${place.label}으로 옮길 자리가 없어요.` };
    return { scene: moved.scene, changed: true, message: `${label} 1개를 ${place.label}으로 옮겼어요.` };
  }

  const n = readCount(text);

  // "테이블 6개로" 처럼 개수를 맞춘다.
  if (n !== null && /(개|대)\s*(로|으로)\s*(맞|해|늘|줄|바꿔)?/.test(text) && /(로|으로)/.test(text)) {
    const result = setCount(scene, kind, n);
    const shortage = result.missing > 0 ? ` 자리가 모자라 ${result.missing}개는 못 놓았어요.` : "";
    return { scene: result.scene, changed: true, message: `${label}을(를) ${n - result.missing}개로 맞췄어요.${shortage}` };
  }

  if (REMOVE_WORDS.test(text)) {
    if (same.length === 0) return { scene, changed: false, message: `뺄 ${label}이(가) 없어요.` };
    const count = ALL_WORDS.test(text) ? same.length : Math.min(n ?? 1, same.length);
    let current = scene;
    for (const item of same.slice(-count)) current = removeItem(current, item.id);
    return { scene: current, changed: true, message: `${label} ${count}개를 뺐어요.` };
  }

  if (ADD_WORDS.test(text)) {
    const count = n ?? 1;
    let current = scene;
    let added = 0;
    for (let i = 0; i < count; i += 1) {
      const result = addItem(current, kind);
      if (!result.ok) break;
      current = result.scene;
      added += 1;
    }
    if (added === 0) return { scene, changed: false, message: `${label}을(를) 놓을 자리가 없어요. 설계 기준을 지키면서 들어갈 빈자리가 없습니다.` };
    const shortage = added < count ? ` 자리가 모자라 ${count - added}개는 못 놓았어요.` : "";
    return { scene: current, changed: true, message: `${label} ${added}개를 더했어요.${shortage}` };
  }

  return { scene, changed: false, message: `${label}을(를) 어떻게 할지 못 알아들었어요. 예: ${label} 2개 더 놔줘, ${label} 하나 빼줘.` };
}
