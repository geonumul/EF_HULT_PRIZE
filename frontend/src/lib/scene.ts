// 공간 상태(Scene)를 만들고 고치는 함수들. 모두 새 Scene을 돌려주고 원본은 건드리지 않는다.
// 평면도 드래그, 텍스트 수정, 견적 계산이 모두 여기를 거친다.
import { IMAGE_PLANS } from "@/lib/imagePlans";
import { checkScene, entryZone, overlaps } from "@/lib/sceneCheck";
import { planLayout, roomFromArea } from "@/lib/api/functions";
import type { PlanResult } from "@/lib/api/functions";
import type { Listing, RenderResult, RenderTag, UseType } from "@/types";
import type { Scene, SceneItem } from "@/types/scene";

// ---- 가구 종류 ----

export type Kind = "table" | "counter" | "shelf" | "lamp" | "reformer" | "showcase";

export const KIND_LABELS: Record<Kind, string> = {
  table: "테이블",
  counter: "카운터",
  shelf: "선반",
  lamp: "조명",
  reformer: "리포머",
  showcase: "쇼케이스",
};

/** 업종마다 추가할 수 있는 가구 */
export const KINDS_BY_USE: Partial<Record<UseType, Kind[]>> = {
  cafe: ["table", "counter", "showcase", "lamp"],
  popup: ["table", "shelf", "counter", "lamp"],
  pilates: ["reformer", "shelf", "lamp"],
};

export function kindOf(item: SceneItem): Kind | null {
  if (item.hanging) return "lamp";
  if (item.category === "counter") return "counter";
  if (item.category === "shelf") return "shelf";
  if (item.category === "reformer") return "reformer";
  if (item.category === "table") return "table";
  if (item.name.includes("쇼케이스")) return "showcase";
  return null;
}

let counter = 0;
function newId(): string {
  counter += 1;
  return `i${Date.now().toString(36)}${counter}`;
}

/** 새로 놓을 가구의 모양. 자리(x, y)는 따로 정한다. */
export function makeItem(kind: Kind, useType: UseType): SceneItem {
  const base = { id: newId(), chairs: 0, chairProductId: null } as const;
  if (kind === "table" && useType === "cafe") {
    // 지름 700mm 둥근 테이블과 의자 2개. 바닥 면적에는 의자 자리(위아래 450mm)를 더한다.
    return { ...base, productId: "table", name: "원형 테이블", category: "table", kind: "table", widthMm: 1600, depthMm: 1600, chairs: 2, x: 0, y: 0, round: true, tableDiaMm: 700, chairAngles: [180, 0] };
  }
  if (kind === "table") return { ...base, productId: "table", name: "전시 테이블", category: "table", kind: "fixture", widthMm: 1200, depthMm: 700, x: 0, y: 0 };
  if (kind === "counter") return { ...base, productId: "counter", name: useType === "popup" ? "계산대" : "바 카운터", category: "counter", kind: "fixture", widthMm: 2400, depthMm: 600, x: 0, y: 0 };
  if (kind === "shelf") return { ...base, productId: "shelf", name: "벽 선반", category: "shelf", kind: "fixture", widthMm: 1200, depthMm: 400, x: 0, y: 0 };
  if (kind === "reformer") return { ...base, productId: "reformer", name: "필라테스 리포머", category: "reformer", kind: "fixture", widthMm: 2400, depthMm: 700, x: 0, y: 0 };
  if (kind === "showcase") return { ...base, productId: "fixture", name: "디저트 쇼케이스", category: "fixture", kind: "fixture", widthMm: 900, depthMm: 600, x: 0, y: 0 };
  return { ...base, productId: "lamp", name: "조명", category: "lamp", kind: "fixture", widthMm: 300, depthMm: 300, x: 0, y: 0, hanging: true };
}

// ---- 처음 배치 ----

function sceneFromPlan(plan: PlanResult, spaceId: string, useType: UseType, source: Scene["source"]): Scene {
  return {
    version: 1,
    spaceId,
    useType,
    room: plan.room,
    items: plan.placed.map((item) => ({ ...item, id: newId() })),
    structures: plan.structures ?? [],
    notes: plan.notes,
    camera: plan.camera,
    source,
    updatedAt: Date.now(),
  };
}

/** 공간 사진 번호("08")를 listing의 썸네일에서 꺼낸다. */
function photoNumberOf(listing: Listing): string | null {
  return listing.thumbnail.match(/\/images\/spaces\/space-(\d\d)\.jpg$/)?.[1] ?? null;
}

/**
 * 공간과 업종의 처음 배치. 사진에서 보정한 도면이 있으면 그것을 쓰고, 없으면 서버의 배치 계산(planLayout)을 쓴다.
 * 서버가 응답하지 않으면 null이다.
 */
export async function seedScene(listing: Listing, useType: UseType): Promise<Scene | null> {
  const number = photoNumberOf(listing);
  const fromImage = number ? IMAGE_PLANS[`${number}-${useType}`] : undefined;
  if (fromImage) return sceneFromPlan(fromImage, listing.id, useType, "image-plan");
  const room = listing.roomMm ? { ...listing.roomMm, ceilingMm: Math.round(listing.ceilingHeightM * 1000) } : roomFromArea(listing.areaM2, listing.ceilingHeightM);
  const result = await planLayout({ room, useType });
  return result.ok ? sceneFromPlan(result.data, listing.id, useType, "auto-layout") : null;
}

// ---- 저장 ----

const KEY_PREFIX = "shopportunity-scene:";

export function loadScene(spaceId: string, useType: UseType): Scene | null {
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${spaceId}:${useType}`);
    const parsed = raw ? (JSON.parse(raw) as Scene) : null;
    return parsed && parsed.version === 1 && Array.isArray(parsed.items) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveScene(scene: Scene): void {
  try {
    localStorage.setItem(`${KEY_PREFIX}${scene.spaceId}:${scene.useType}`, JSON.stringify(scene));
  } catch {
    // 저장소를 못 쓰면 이번 화면에서만 유지된다.
  }
}

export function clearScene(spaceId: string, useType: UseType): void {
  try {
    localStorage.removeItem(`${KEY_PREFIX}${spaceId}:${useType}`);
  } catch {
    // 무시한다.
  }
}

// ---- 고치기 ----

const touch = (scene: Scene, items: SceneItem[]): Scene => ({ ...scene, items, updatedAt: Date.now(), edited: true });
const SNAP_MM = 50;

export function moveItem(scene: Scene, id: string, x: number, y: number): Scene {
  return touch(
    scene,
    scene.items.map((item) => {
      if (item.id !== id) return item;
      const nx = Math.min(Math.max(0, x), Math.max(0, scene.room.widthMm - item.widthMm));
      const ny = Math.min(Math.max(0, y), Math.max(0, scene.room.depthMm - item.depthMm));
      return { ...item, x: Math.round(nx / SNAP_MM) * SNAP_MM, y: Math.round(ny / SNAP_MM) * SNAP_MM };
    }),
  );
}

/** 90도 돌린다. 둥근 테이블은 의자 방향을 돌리고, 나머지는 가로 세로를 바꾼다(가운데는 그대로). */
export function rotateItem(scene: Scene, id: string): Scene {
  return touch(
    scene,
    scene.items.map((item) => {
      if (item.id !== id) return item;
      if (item.round) return { ...item, chairAngles: (item.chairAngles ?? []).map((deg) => (deg + 90) % 360) };
      if (item.hanging) return item;
      const cx = item.x + item.widthMm / 2;
      const cy = item.y + item.depthMm / 2;
      return { ...item, widthMm: item.depthMm, depthMm: item.widthMm, x: Math.round(cx - item.depthMm / 2), y: Math.round(cy - item.widthMm / 2) };
    }),
  );
}

export function removeItem(scene: Scene, id: string): Scene {
  return touch(scene, scene.items.filter((item) => item.id !== id));
}

// ---- 빈자리 찾기 ----

export type Anchor = { x: number; y: number };

/** 가구 종류마다 먼저 놓아 보는 자리의 중심. 기존 배치를 보고 정한다. */
export function anchorFor(scene: Scene, kind: Kind): Anchor {
  const { room } = scene;
  const same = scene.items.filter((item) => kindOf(item) === kind && !item.hanging);
  if (kind === "counter") return { x: room.widthMm / 2, y: 1500 };
  if (kind === "shelf") return { x: room.widthMm / 2, y: 300 };
  if (kind === "showcase") {
    const counter = scene.items.find((item) => item.category === "counter");
    return counter ? { x: counter.x + counter.widthMm + 600, y: counter.y + counter.depthMm / 2 } : { x: room.widthMm / 2, y: 1500 };
  }
  if (same.length > 0) {
    return { x: same.reduce((sum, item) => sum + item.x + item.widthMm / 2, 0) / same.length, y: same.reduce((sum, item) => sum + item.y + item.depthMm / 2, 0) / same.length };
  }
  return { x: room.widthMm / 2, y: room.depthMm / 2 };
}

const SCAN_STEP_MM = 100;

/**
 * 가구 하나를 놓을 자리를 찾는다. anchor에 가까운 자리부터 보고, 설계 기준을 하나도 새로 어기지 않는 첫 자리를 돌려준다.
 * 이미 어기고 있던 기준은 그대로 두어도 된다(새로 늘어나지만 않으면 된다).
 */
export function findSpot(scene: Scene, item: SceneItem, anchor: Anchor): { x: number; y: number } | null {
  const before = checkScene(scene);
  const beforeFailed = before.failed;
  const { room } = scene;

  if (item.hanging) {
    // 조명은 바닥을 차지하지 않는다. 조명이 없는 테이블이나 앵커에 가장 가까운 테이블 위에 단다.
    const lamps = scene.items.filter((other) => other.hanging);
    const tables = scene.items.filter((other) => !other.hanging && other.category === "table");
    const free = tables.find((table) => !lamps.some((lamp) => Math.abs(lamp.x + 150 - (table.x + table.widthMm / 2)) < 400 && Math.abs(lamp.y + 150 - (table.y + table.depthMm / 2)) < 400));
    const target = free ?? tables[0];
    if (target) return { x: Math.round(target.x + target.widthMm / 2 - 150), y: Math.round(target.y + target.depthMm / 2 - 150) };
    return { x: Math.round(anchor.x - 150), y: Math.round(anchor.y - 150) };
  }

  const zone = entryZone(room);
  const candidates: { x: number; y: number; d: number }[] = [];
  for (let x = 0; x + item.widthMm <= room.widthMm; x += SCAN_STEP_MM) {
    for (let y = 0; y + item.depthMm <= room.depthMm; y += SCAN_STEP_MM) {
      const cx = x + item.widthMm / 2;
      const cy = y + item.depthMm / 2;
      candidates.push({ x, y, d: Math.hypot(cx - anchor.x, cy - anchor.y) });
    }
  }
  candidates.sort((a, b) => a.d - b.d);

  for (const spot of candidates) {
    const box = { x: spot.x, y: spot.y, widthMm: item.widthMm, depthMm: item.depthMm };
    // 입구 앞과 기존 가구, 구조물은 먼저 빠르게 걸러 낸다.
    if (box.x < zone.right && box.x + box.widthMm > zone.left && box.y + box.depthMm > zone.top) continue;
    if (scene.items.some((other) => !other.hanging && overlaps(box, other))) continue;
    if (scene.structures.some((s) => (s.kind === "column" || s.kind === "stairs") && overlaps(box, s))) continue;
    const next = checkScene({ ...scene, items: [...scene.items, { ...item, x: spot.x, y: spot.y }] });
    if (next.failed <= beforeFailed) return { x: spot.x, y: spot.y };
  }
  return null;
}

/** 가구 하나를 더한다. 놓을 자리가 없으면 scene을 그대로 돌려주고 ok는 false다. */
export function addItem(scene: Scene, kind: Kind): { scene: Scene; ok: boolean; item?: SceneItem } {
  const proto = makeItem(kind, scene.useType);
  const spot = findSpot(scene, proto, anchorFor(scene, kind));
  if (!spot) return { scene, ok: false };
  const item = { ...proto, x: spot.x, y: spot.y };
  return { scene: touch(scene, [...scene.items, item]), ok: true, item };
}

/** 종류 하나의 개수를 count로 맞춘다. 더할 때 자리가 모자라면 놓은 만큼만 더하고 모자란 수를 돌려준다. */
export function setCount(scene: Scene, kind: Kind, count: number): { scene: Scene; missing: number } {
  let current = scene;
  const have = () => current.items.filter((item) => kindOf(item) === kind);
  while (have().length > count) {
    // 가장 나중에 더한 것(목록 끝)부터 뺀다.
    const last = have()[have().length - 1];
    current = removeItem(current, last.id);
  }
  let missing = 0;
  while (have().length < count) {
    const added = addItem(current, kind);
    if (!added.ok) {
      missing = count - have().length;
      break;
    }
    current = added.scene;
  }
  return { scene: current, missing };
}

/** 가구 하나를 anchor 가까이로 옮긴다. 자리가 없으면 그대로 두고 ok는 false다. */
export function moveNear(scene: Scene, id: string, anchor: Anchor): { scene: Scene; ok: boolean } {
  const item = scene.items.find((other) => other.id === id);
  if (!item) return { scene, ok: false };
  const without = touch(scene, scene.items.filter((other) => other.id !== id));
  const spot = findSpot(without, item, anchor);
  if (!spot) return { scene, ok: false };
  return { scene: touch(scene, scene.items.map((other) => (other.id === id ? { ...other, x: spot.x, y: spot.y } : other))), ok: true };
}

// ---- 견적 ----

/** 도면의 가구 종류를 상품 카탈로그 id로 잇는다. 연결이 없으면 null이고 견적에 들어가지 않는다. */
function catalogIdOf(item: SceneItem): string | null {
  const kind = kindOf(item);
  if (kind === "table") return "table-2p";
  if (kind === "counter") return "counter-bar";
  if (kind === "lamp") return "lamp-pendant";
  if (kind === "shelf") return "shelf-display";
  if (kind === "reformer") return "reformer";
  if (kind === "showcase") return "fridge-showcase";
  return null;
}

/** 도면에서 상품별 수량을 센다. 의자는 테이블에 딸린 수, 에스프레소 머신은 카페 카운터 하나에 하나다. */
export function quantitiesOf(scene: Scene): Record<string, number> {
  const qty: Record<string, number> = {};
  const add = (id: string, n: number) => {
    if (n > 0) qty[id] = (qty[id] ?? 0) + n;
  };
  for (const item of scene.items) {
    const id = catalogIdOf(item);
    if (id) add(id, 1);
    if (item.chairs > 0) add("chair-oak", item.chairs);
  }
  if (scene.useType === "cafe" && qty["counter-bar"]) add("espresso-machine", qty["counter-bar"]);
  if (scene.useType === "pilates") add("mirror-wall", 4); // 벽에 붙이는 거울은 도면 바닥에 없어서 기본 4개로 둔다.
  return qty;
}

/** 견적 패널과 견적 확정 화면이 읽는 렌더링 결과. 이미지 위치(x, y)는 쓰지 않는다. */
export function sceneToRender(scene: Scene, listingId: string, imageUrl: string): RenderResult {
  const qty = quantitiesOf(scene);
  const tags: RenderTag[] = Object.entries(qty).map(([productId, count], index) => ({ n: index + 1, x: 50, y: 50, productId, qty: count }));
  return { id: `r-${listingId}-${scene.useType}`, listingId, useType: scene.useType, mode: "text", imageUrl, tags, checks: [] };
}
