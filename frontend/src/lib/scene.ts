// 공간 상태(Scene)를 만들고 고치는 함수들. 모두 새 Scene을 돌려주고 원본은 건드리지 않는다.
// 평면도 드래그, 텍스트 수정, 견적 계산이 모두 여기를 거친다.
import { IMAGE_PLANS } from "@/lib/imagePlans";
import { checkScene, entryZone, overlaps } from "@/lib/sceneCheck";
import { planLayout, roomFromArea } from "@/lib/api/functions";
import type { PlanResult, PlanStructure } from "@/lib/api/functions";
import { PRODUCTS } from "@/mocks/products";
import type { Listing, Product, RenderResult, RenderTag, UseType } from "@/types";
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

type Spot = { x: number; y: number };

/** 이 자리에 놓으면 다른 가구, 기둥, 계단과 겹치는지. 매달린 조명은 바닥을 차지하지 않는다. */
function blockedAt(scene: Scene, item: SceneItem, spot: Spot, size = { widthMm: item.widthMm, depthMm: item.depthMm }): boolean {
  if (item.hanging) return false;
  const box = { x: spot.x, y: spot.y, ...size };
  if (scene.items.some((other) => other.id !== item.id && !other.hanging && overlaps(box, other))) return true;
  return scene.structures.some((s) => (s.kind === "column" || s.kind === "stairs") && overlaps(box, s));
}

function clampToRoom(scene: Scene, item: SceneItem, x: number, y: number): Spot {
  const nx = Math.min(Math.max(0, x), Math.max(0, scene.room.widthMm - item.widthMm));
  const ny = Math.min(Math.max(0, y), Math.max(0, scene.room.depthMm - item.depthMm));
  return { x: Math.round(nx / SNAP_MM) * SNAP_MM, y: Math.round(ny / SNAP_MM) * SNAP_MM };
}

/**
 * 가구를 목표 자리로 옮긴다. 다른 가구와 기둥, 계단과 겹치는 자리에는 놓지 않는다.
 * 목표가 막혀 있으면 가로만, 세로만, 지금 자리에서 목표로 가는 선 위의 가장 먼 빈자리 중 목표에 가장 가까운 곳으로 옮긴다.
 */
export function placeNear(scene: Scene, item: SceneItem, x: number, y: number): Spot {
  const target = clampToRoom(scene, item, x, y);
  if (!blockedAt(scene, item, target)) return target;
  const candidates: Spot[] = [];
  const slideX = clampToRoom(scene, item, target.x, item.y);
  const slideY = clampToRoom(scene, item, item.x, target.y);
  candidates.push(slideX, slideY);
  // 지금 자리에서 목표까지 선 위를 이분 탐색한다.
  let low = 0;
  let high = 1;
  for (let step = 0; step < 12; step += 1) {
    const mid = (low + high) / 2;
    const spot = clampToRoom(scene, item, item.x + (target.x - item.x) * mid, item.y + (target.y - item.y) * mid);
    if (blockedAt(scene, item, spot)) high = mid;
    else low = mid;
  }
  candidates.push(clampToRoom(scene, item, item.x + (target.x - item.x) * low, item.y + (target.y - item.y) * low));
  const free = candidates.filter((spot) => !blockedAt(scene, item, spot));
  if (free.length === 0) return { x: item.x, y: item.y };
  return free.reduce((best, spot) => (Math.hypot(spot.x - target.x, spot.y - target.y) < Math.hypot(best.x - target.x, best.y - target.y) ? spot : best));
}

export function moveItem(scene: Scene, id: string, x: number, y: number): Scene {
  return touch(
    scene,
    scene.items.map((item) => (item.id === id ? { ...item, ...placeNear(scene, item, x, y) } : item)),
  );
}

/** 90도 돌린다. 둥근 테이블은 의자 방향을 돌리고, 나머지는 가로 세로를 바꾼다(가운데는 그대로). */
export function rotateItem(scene: Scene, id: string): Scene {
  const target = scene.items.find((item) => item.id === id);
  if (!target) return scene;
  if (target.hanging) return scene;
  if (target.round) {
    return touch(scene, scene.items.map((item) => (item.id === id ? { ...item, chairAngles: (item.chairAngles ?? []).map((deg) => (deg + 90) % 360) } : item)));
  }
  const cx = target.x + target.widthMm / 2;
  const cy = target.y + target.depthMm / 2;
  const turned = { ...target, widthMm: target.depthMm, depthMm: target.widthMm, x: Math.round(cx - target.depthMm / 2), y: Math.round(cy - target.widthMm / 2) };
  // 돌린 모양이 방 밖이거나 다른 것과 겹치면 돌리지 않는다.
  const inside = turned.x >= 0 && turned.y >= 0 && turned.x + turned.widthMm <= scene.room.widthMm && turned.y + turned.depthMm <= scene.room.depthMm;
  if (!inside || blockedAt(scene, turned, { x: turned.x, y: turned.y })) return scene;
  return touch(scene, scene.items.map((item) => (item.id === id ? turned : item)));
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

  const zone = entryZone(room, scene.entryX);
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

/** 평면도 그림(LayoutPlan)이 읽는 모양. 지금 배치와 설계 점검 결과를 담는다. */
export function scenePlanResult(scene: Scene): PlanResult {
  return {
    room: scene.room,
    useType: scene.useType,
    placed: scene.items,
    unplaced: [],
    violations: [],
    notes: [],
    entryZone: entryZone(scene.room, scene.entryX),
    clearances: checkScene(scene).clearances,
    structures: scene.structures,
  };
}

// ---- 실측 ----

export const ROOM_LIMITS = { minMm: 2000, maxMm: 40000, minCeilingMm: 2000, maxCeilingMm: 8000 };

const isSolid = (s: PlanStructure) => s.kind === "column" || s.kind === "stairs";

/** 구조물을 방 안으로 맞춘다. 방보다 큰 것은 방 크기로 줄인다. */
function fitStructure(room: Scene["room"], s: PlanStructure): PlanStructure {
  const widthMm = Math.min(s.widthMm, room.widthMm);
  const depthMm = Math.min(s.depthMm, room.depthMm);
  return { ...s, widthMm, depthMm, x: Math.min(Math.max(0, s.x), room.widthMm - widthMm), y: Math.min(Math.max(0, s.y), room.depthMm - depthMm) };
}

/** 방과 구조물이 바뀐 뒤 가구를 방 안으로 넣고, 기둥이나 계단, 다른 가구와 겹치면 가까운 빈자리로 옮긴다. */
function refitItems(scene: Scene): Scene {
  let current: Scene = scene;
  for (const original of scene.items) {
    const item = current.items.find((other) => other.id === original.id);
    if (!item) continue;
    const others = { ...current, items: current.items.filter((other) => other.id !== item.id) };
    const spot = placeNear(others, item, item.x, item.y);
    const moved = { ...item, x: spot.x, y: spot.y };
    // 놓을 곳이 없으면 원래 자리를 방 안으로만 맞춰 두고, 설계 점검이 겹침을 알린다.
    const fallback = clampToRoom(current, item, item.x, item.y);
    const next = blockedAt(others, moved, spot) ? { ...item, ...fallback } : moved;
    current = { ...current, items: current.items.map((other) => (other.id === item.id ? next : other)) };
  }
  return current;
}

/** 실측한 방 크기와 입구 위치를 적용한다. 범위를 벗어나면 ok가 false다. */
export function applyRoom(scene: Scene, next: { widthMm: number; depthMm: number; ceilingMm: number; entryX?: number }): { scene: Scene; ok: boolean; message: string } {
  const { widthMm, depthMm, ceilingMm } = next;
  const bad = (value: number) => !Number.isFinite(value);
  if (bad(widthMm) || bad(depthMm) || bad(ceilingMm)) return { scene, ok: false, message: "숫자로 입력해 주세요." };
  if (widthMm < ROOM_LIMITS.minMm || depthMm < ROOM_LIMITS.minMm || widthMm > ROOM_LIMITS.maxMm || depthMm > ROOM_LIMITS.maxMm) {
    return { scene, ok: false, message: `가로와 깊이는 ${ROOM_LIMITS.minMm / 1000}m에서 ${ROOM_LIMITS.maxMm / 1000}m 사이로 입력해 주세요.` };
  }
  if (ceilingMm < ROOM_LIMITS.minCeilingMm || ceilingMm > ROOM_LIMITS.maxCeilingMm) {
    return { scene, ok: false, message: `천장 높이는 ${ROOM_LIMITS.minCeilingMm / 1000}m에서 ${ROOM_LIMITS.maxCeilingMm / 1000}m 사이로 입력해 주세요.` };
  }
  const room = { widthMm: Math.round(widthMm), depthMm: Math.round(depthMm), ceilingMm: Math.round(ceilingMm) };
  const entryX = next.entryX === undefined ? scene.entryX : Math.min(Math.max(600, Math.round(next.entryX)), Math.max(600, room.widthMm - 600));
  const base: Scene = { ...scene, room, entryX, structures: scene.structures.map((s) => fitStructure(room, s)), measured: true, updatedAt: Date.now(), edited: true };
  return { scene: refitItems(base), ok: true, message: `방을 ${(room.widthMm / 1000).toFixed(2)} x ${(room.depthMm / 1000).toFixed(2)}m, 천장 ${(room.ceilingMm / 1000).toFixed(2)}m로 바꿨어요. 가구는 새 크기에 맞춰 옮겼어요.` };
}

/** 기둥, 창, 문, 계단 하나의 위치와 크기를 고친다. */
export function setStructure(scene: Scene, index: number, patch: Partial<Pick<PlanStructure, "x" | "y" | "widthMm" | "depthMm">>): Scene {
  const target = scene.structures[index];
  if (!target) return scene;
  const merged = fitStructure(scene.room, { ...target, ...patch });
  const base: Scene = { ...scene, structures: scene.structures.map((s, i) => (i === index ? merged : s)), measured: true, updatedAt: Date.now(), edited: true };
  return isSolid(merged) ? refitItems(base) : base;
}

const STRUCTURE_LABELS: Record<PlanStructure["kind"], string> = { column: "기둥", stairs: "계단", window: "창", door: "문", ring: "천장 구조물" };

/** 구조물을 방 가운데(문과 창은 벽)에 더한다. 위치와 크기는 입력 칸에서 고친다. */
export function addStructure(scene: Scene, kind: PlanStructure["kind"]): Scene {
  const { room } = scene;
  const count = scene.structures.filter((s) => s.kind === kind).length + 1;
  const label = `${STRUCTURE_LABELS[kind]} ${count}`;
  let s: PlanStructure;
  if (kind === "column") s = { kind, label, x: Math.round(room.widthMm / 2 - 200), y: Math.round(room.depthMm / 2 - 200), widthMm: 400, depthMm: 400 };
  else if (kind === "stairs") s = { kind, label, x: 0, y: 0, widthMm: 1200, depthMm: 3000 };
  else if (kind === "window") s = { kind, label, x: 0, y: Math.round(room.depthMm / 2 - 1500), widthMm: 100, depthMm: 3000 };
  else if (kind === "door") s = { kind, label, x: Math.round((scene.entryX ?? room.widthMm / 2) - 450), y: room.depthMm - 100, widthMm: 900, depthMm: 100 };
  else s = { kind, label, x: Math.round(room.widthMm / 2 - 1000), y: Math.round(room.depthMm / 2 - 1000), widthMm: 2000, depthMm: 2000 };
  const base: Scene = { ...scene, structures: [...scene.structures, fitStructure(room, s)], measured: true, updatedAt: Date.now(), edited: true };
  return isSolid(s) ? refitItems(base) : base;
}

export function removeStructure(scene: Scene, index: number): Scene {
  if (!scene.structures[index]) return scene;
  return { ...scene, structures: scene.structures.filter((_, i) => i !== index), measured: true, updatedAt: Date.now(), edited: true };
}

// ---- 창과 방위 ----

export type Wall = "left" | "right" | "back" | "front";
export const WALL_LABELS: Record<Wall, string> = { left: "왼쪽 벽", right: "오른쪽 벽", back: "안쪽 벽", front: "입구 쪽 벽" };

/** 창이나 문이 어느 벽에 있는지. 벽에서 50mm 안에 붙어 있으면 그 벽이다. 아니면 null. */
export function wallOf(room: Scene["room"], s: PlanStructure): Wall | null {
  if (s.kind !== "window" && s.kind !== "door") return null;
  const edge = 50;
  if (s.x <= edge && s.widthMm <= s.depthMm) return "left";
  if (s.x + s.widthMm >= room.widthMm - edge && s.widthMm <= s.depthMm) return "right";
  if (s.y <= edge && s.depthMm <= s.widthMm) return "back";
  if (s.y + s.depthMm >= room.depthMm - edge && s.depthMm <= s.widthMm) return "front";
  return null;
}

/** 창이나 문을 다른 벽의 가운데로 옮긴다. 길이는 그대로다. */
export function setStructureWall(scene: Scene, index: number, wall: Wall): Scene {
  const s = scene.structures[index];
  if (!s || (s.kind !== "window" && s.kind !== "door")) return scene;
  const { room } = scene;
  const length = Math.max(s.widthMm, s.depthMm);
  const thickness = s.kind === "window" ? 100 : 100;
  let next: PlanStructure;
  if (wall === "left") next = { ...s, x: 0, widthMm: thickness, y: Math.round(room.depthMm / 2 - length / 2), depthMm: length };
  else if (wall === "right") next = { ...s, x: room.widthMm - thickness, widthMm: thickness, y: Math.round(room.depthMm / 2 - length / 2), depthMm: length };
  else if (wall === "back") next = { ...s, y: 0, depthMm: thickness, x: Math.round(room.widthMm / 2 - length / 2), widthMm: length };
  else next = { ...s, y: room.depthMm - thickness, depthMm: thickness, x: Math.round(room.widthMm / 2 - length / 2), widthMm: length };
  const fitted = fitStructure(room, next);
  return { ...scene, structures: scene.structures.map((other, i) => (i === index ? fitted : other)), measured: true, updatedAt: Date.now(), edited: true };
}

/** 입구에서 안쪽 벽을 볼 때 바라보는 방위를 정한다. 해와 주변 건물에만 영향을 주고 가구 배치는 그대로라서 edited로 치지 않는다. */
export function setFacing(scene: Scene, deg: number): Scene {
  if (!Number.isFinite(deg)) return scene;
  return { ...scene, facingDeg: ((Math.round(deg) % 360) + 360) % 360, updatedAt: Date.now() };
}

// ---- 주변 건물(직접 입력) ----

export type SceneBuilding = NonNullable<Scene["buildings"]>[number];

/** 주변 건물 상자 하나를 왼쪽 맞은편에 더한다. 위치와 크기는 입력 칸에서 고친다. */
export function addBuilding(scene: Scene): Scene {
  const count = scene.buildings?.length ?? 0;
  const building: SceneBuilding = {
    id: `b${Date.now().toString(36)}${count}`,
    x: -(6000 + 8000),
    y: Math.round(scene.room.depthMm / 2 - 4000 + count * 9000),
    widthMm: 8000,
    depthMm: 8000,
    heightMm: 12000,
  };
  return { ...scene, buildings: [...(scene.buildings ?? []), building], updatedAt: Date.now() };
}

export function setBuilding(scene: Scene, id: string, patch: Partial<Omit<SceneBuilding, "id">>): Scene {
  const limits = { widthMm: [1000, 100000], depthMm: [1000, 100000], heightMm: [2000, 250000] } as const;
  const clean: Partial<Omit<SceneBuilding, "id">> = {};
  for (const [key, value] of Object.entries(patch) as [keyof Omit<SceneBuilding, "id">, number][]) {
    if (!Number.isFinite(value)) continue;
    const range = key === "x" || key === "y" ? [-200000, 200000] : limits[key as "widthMm" | "depthMm" | "heightMm"];
    clean[key] = Math.round(Math.min(Math.max(value, range[0]), range[1]));
  }
  return { ...scene, buildings: (scene.buildings ?? []).map((b) => (b.id === id ? { ...b, ...clean } : b)), updatedAt: Date.now() };
}

export function removeBuilding(scene: Scene, id: string): Scene {
  return { ...scene, buildings: (scene.buildings ?? []).filter((b) => b.id !== id), updatedAt: Date.now() };
}

// ---- 다른 배치안 ----

/** 가구를 좌우로 뒤집는다. 기둥과 창은 그대로라서 겹치는 가구는 가까운 빈자리로 옮긴다. */
function mirrorItems(scene: Scene): Scene {
  let current = scene;
  for (const original of scene.items) {
    if (original.hanging) continue;
    const item = current.items.find((other) => other.id === original.id);
    if (!item) continue;
    const spot = placeNear({ ...current, items: current.items.filter((other) => other.id !== item.id) }, item, scene.room.widthMm - item.x - item.widthMm, item.y);
    current = { ...current, items: current.items.map((other) => (other.id === item.id ? { ...other, x: spot.x, y: spot.y, chairAngles: other.chairAngles?.map((deg) => (180 - deg + 360) % 360) } : other)) };
  }
  return touch(scene, current.items);
}

/** 테이블을 카운터 앞에서 입구 앞까지 줄과 칸으로 다시 놓는다. 자리가 없는 테이블은 원래 자리를 유지한다. */
function gridTables(scene: Scene): Scene {
  const tables = scene.items.filter((item) => kindOf(item) === "table" && !item.hanging);
  if (tables.length === 0) return scene;
  const { room } = scene;
  const fixedBottoms = scene.items.filter((item) => (item.category === "counter" || kindOf(item) === "showcase") && !item.hanging).map((item) => item.y + item.depthMm);
  const top = (fixedBottoms.length > 0 ? Math.max(...fixedBottoms) + 1200 : 1500);
  const bottom = room.depthMm - 2600;
  const left = 600;
  const right = room.widthMm - 600;
  const cellW = tables[0].widthMm + 300;
  const cols = Math.max(1, Math.floor((right - left) / cellW));
  const rows = Math.max(1, Math.ceil(tables.length / cols));
  let current: Scene = { ...scene, items: scene.items.filter((item) => !tables.some((table) => table.id === item.id)) };
  tables.forEach((table, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const inRow = Math.min(cols, tables.length - row * cols);
    const anchor = { x: left + ((col + 0.5) * (right - left)) / inRow, y: top + ((row + 0.5) * Math.max(1, bottom - top)) / rows };
    const spot = findSpot(current, table, anchor) ?? (blockedAt(current, table, { x: table.x, y: table.y }) ? null : { x: table.x, y: table.y });
    if (spot) current = { ...current, items: [...current.items, { ...table, x: spot.x, y: spot.y }] };
  });
  // 못 놓은 테이블이 있으면 이전 배치를 그대로 둔다.
  const placedCount = current.items.filter((item) => kindOf(item) === "table").length;
  return placedCount === tables.length ? touch(scene, current.items) : scene;
}

/** 같은 가구로 다른 배치안을 만든다. round가 짝수면 좌우 뒤집기, 홀수면 줄과 칸 정렬이다. */
export function rearrangeLayout(scene: Scene, round: number): { scene: Scene; message: string } {
  if (round % 2 === 0) return { scene: mirrorItems(scene), message: "가구를 좌우로 뒤집은 배치안이에요." };
  const next = gridTables(scene);
  if (next === scene) return { scene: mirrorItems(scene), message: "줄 정렬 자리가 모자라 좌우로 뒤집은 배치안으로 바꿨어요." };
  return { scene: next, message: "테이블을 줄과 칸으로 다시 정렬한 배치안이에요." };
}

// ---- 종류 교체 ----

/** 이 가구가 어느 묶음에 속하는지. 같은 묶음의 상품끼리 서로 바꿀 수 있다. */
export function familyOf(item: SceneItem): string | null {
  const fromProduct = item.catalogId ? PRODUCTS.find((product) => product.id === item.catalogId)?.family : undefined;
  if (fromProduct) return fromProduct;
  if (item.category === "chair") return item.name.includes("스툴") ? "stool" : "chair";
  const kind = kindOf(item);
  if (kind === "table") return "table";
  if (kind === "counter") return "counter";
  if (kind === "lamp") return "lamp";
  if (kind === "shelf") return "shelf";
  if (kind === "showcase") return "showcase";
  if (kind === "reformer") return "reformer";
  return null;
}

/** 이 가구를 바꿀 수 있는 상품들 */
export function variantsOf(item: SceneItem): Product[] {
  const family = familyOf(item);
  return family ? PRODUCTS.filter((product) => product.family === family) : [];
}

/** 둥근 테이블에 딸린 의자로 고를 수 있는 상품들 */
export function chairVariants(): Product[] {
  return PRODUCTS.filter((product) => product.family === "chair");
}

/** 상품의 이름, 치수, 높이를 가구에 입힌다. 둥근 테이블은 지름만 바뀌고 바닥 면적은 지름에 의자 자리(위아래 450mm)를 더한다. */
function shapeFor(item: SceneItem, product: Product): SceneItem {
  if (item.round && item.tableDiaMm) {
    const dia = Math.min(product.widthMm, product.depthMm);
    const footprint = dia + (item.chairs > 0 ? 900 : 100);
    return { ...item, name: product.name, catalogId: product.id, tableDiaMm: dia, widthMm: footprint, depthMm: footprint, heightMm: product.heightMm };
  }
  if (item.hanging) return { ...item, name: product.name, catalogId: product.id };
  return { ...item, name: product.name, catalogId: product.id, widthMm: product.widthMm, depthMm: product.depthMm, heightMm: product.heightMm };
}

/** 가구 하나를 같은 묶음의 다른 상품으로 바꾼다. 크기가 달라지면 그 자리에서 다시 맞추고, 들어갈 자리가 없으면 바꾸지 않는다. */
export function swapProduct(scene: Scene, id: string, product: Product): { scene: Scene; ok: boolean; message: string } {
  const item = scene.items.find((other) => other.id === id);
  if (!item) return { scene, ok: false, message: "바꿀 가구를 찾지 못했어요." };
  const cx = item.x + item.widthMm / 2;
  const cy = item.y + item.depthMm / 2;
  const next = shapeFor(item, product);
  const resized = next.widthMm !== item.widthMm || next.depthMm !== item.depthMm;
  const centered = { ...next, x: Math.round(cx - next.widthMm / 2), y: Math.round(cy - next.depthMm / 2) };
  const inside = centered.x >= 0 && centered.y >= 0 && centered.x + centered.widthMm <= scene.room.widthMm && centered.y + centered.depthMm <= scene.room.depthMm;
  let placed: SceneItem | null = null;
  if (!resized) placed = { ...next };
  else if (inside && !blockedAt(scene, centered, { x: centered.x, y: centered.y })) placed = centered;
  else {
    const spot = placeNear(scene, centered, centered.x, centered.y);
    const moved = { ...centered, x: spot.x, y: spot.y };
    if (!blockedAt(scene, moved, spot) && moved.x >= 0 && moved.y >= 0 && moved.x + moved.widthMm <= scene.room.widthMm && moved.y + moved.depthMm <= scene.room.depthMm) placed = moved;
  }
  if (!placed) return { scene, ok: false, message: `${product.name}은(는) 크기가 커서 이 자리에 들어가지 않아요.` };
  const result = placed;
  return { scene: touch(scene, scene.items.map((other) => (other.id === id ? result : other))), ok: true, message: `${product.name}(으)로 바꿨어요.` };
}

/** 둥근 테이블에 딸린 의자 종류를 바꾼다. */
export function swapChairs(scene: Scene, id: string, product: Product): Scene {
  return touch(scene, scene.items.map((item) => (item.id === id ? { ...item, chairCatalogId: product.id } : item)));
}

// ---- 상품 추가 ----

/** 도면에 놓을 수 있는 상품. 에스프레소 머신은 카운터마다 하나, 벽거울은 필라테스에서 자동으로 세므로 고르지 않는다. */
const NOT_PLACEABLE = new Set(["espresso-machine", "mirror-wall"]);

/** 상품 id로 가구 종류를 정한다. 종류가 있으면 그 종류의 기본 모양을 쓰고, 없으면 상품 치수 그대로 놓는다. */
const KIND_OF_FAMILY: Record<string, Kind> = {
  table: "table",
  counter: "counter",
  lamp: "lamp",
  showcase: "showcase",
  shelf: "shelf",
  reformer: "reformer",
};

/** 업종마다 먼저 보여 줄 상품 */
const FIRST_BY_USE: Record<UseType, string[]> = {
  cafe: ["table-2p", "chair-oak", "counter-bar", "fridge-showcase", "lamp-pendant", "stool-bar"],
  popup: ["shelf-display", "table-2p", "counter-bar", "lamp-pendant"],
  pilates: ["reformer", "locker-steel", "shelf-display", "lamp-pendant"],
} as Record<UseType, string[]>;

/** 상품 추가 목록. 이 업종에 어울리는 것을 앞에 둔다. */
export function placeableProducts(useType: UseType): Product[] {
  const first = FIRST_BY_USE[useType] ?? [];
  const list = PRODUCTS.filter((product) => !NOT_PLACEABLE.has(product.id));
  return [...list].sort((a, b) => {
    const ia = first.indexOf(a.id);
    const ib = first.indexOf(b.id);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

/** 상품 하나를 도면에 놓는다. 설계 기준을 지키는 빈자리가 없으면 ok가 false다. */
export function addProduct(scene: Scene, product: Product): { scene: Scene; ok: boolean; item?: SceneItem } {
  const kind = product.family ? KIND_OF_FAMILY[product.family] : undefined;
  let proto: SceneItem;
  if (kind) {
    proto = shapeFor(makeItem(kind, scene.useType), product);
  } else {
    proto = {
      id: newId(),
      productId: product.id,
      name: product.name,
      category: product.category,
      kind: product.category === "chair" ? "chair" : "fixture",
      widthMm: product.widthMm,
      depthMm: product.depthMm,
      heightMm: product.heightMm,
      chairs: 0,
      chairProductId: null,
      x: 0,
      y: 0,
    } as SceneItem;
  }
  proto = { ...proto, catalogId: product.id };
  const anchor = kind ? anchorFor(scene, kind) : { x: scene.room.widthMm / 2, y: scene.room.depthMm / 2 };
  const spot = findSpot(scene, proto, anchor);
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
    const id = item.catalogId ?? catalogIdOf(item);
    if (id) add(id, 1);
    if (item.chairs > 0) add(item.chairCatalogId ?? "chair-oak", item.chairs);
  }
  if (scene.useType === "cafe" && qty["counter-bar"]) add("espresso-machine", qty["counter-bar"]);
  if (scene.useType === "pilates") add("mirror-wall", 4); // 벽에 붙이는 거울은 도면 바닥에 없어서 기본 4개로 둔다.
  return qty;
}

/** 견적 패널과 견적 확정 화면이 읽는 렌더링 결과. 이미지 위치(x, y)는 쓰지 않는다. */
export function sceneToRender(scene: Scene, listingId: string, imageUrl: string): RenderResult {
  const qty = quantitiesOf(scene);
  const tags: RenderTag[] = Object.entries(qty).map(([productId, count], index) => ({ n: index + 1, x: 50, y: 50, productId, qty: count }));
  const areaM2 = scene.measured ? Math.round(((scene.room.widthMm * scene.room.depthMm) / 1_000_000) * 10) / 10 : undefined;
  return { id: `r-${listingId}-${scene.useType}`, listingId, useType: scene.useType, mode: "text", imageUrl, tags, checks: [], ...(areaM2 ? { areaM2 } : {}) };
}
