// 배치의 설계 점검. functions/src/http/plan.ts의 measureClearances와 같은 기준과 같은 계산이다.
// 드래그할 때마다 바로 돌려야 해서 서버를 거치지 않고 브라우저에서 계산한다. 기준 값을 바꾸면 functions/src/pipeline/knowledge.ts와 함께 바꾼다.
import type { Clearance, PlanStructure } from "@/lib/api/functions";
import type { Scene, SceneItem } from "@/types/scene";

export const COUNTER_FRONT_MM = 1200;
export const COUNTER_BACK_MM = 900;
export const WALL_SEAT_MM = 600;
export const MIN_AISLE_MM = 850;
export const ENTRY_CLEAR_MM = 1200;

type Box = { x: number; y: number; widthMm: number; depthMm: number };

export type SceneCheck = {
  clearances: Clearance[];
  /** 겹치거나 방 밖으로 나간 가구의 id */
  badIds: Set<string>;
  /** 기준을 어긴 항목 수와 전체 항목 수 */
  failed: number;
  total: number;
  /** 겹침과 방 밖을 사람이 읽을 문장으로 */
  problems: string[];
};

export function entryZone(room: { widthMm: number; depthMm: number }) {
  const left = (room.widthMm - ENTRY_CLEAR_MM) / 2;
  return { left, right: left + ENTRY_CLEAR_MM, top: room.depthMm - ENTRY_CLEAR_MM };
}

export function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.widthMm && b.x < a.x + a.widthMm && a.y < b.y + b.depthMm && b.y < a.y + a.depthMm;
}

const isSolid = (s: PlanStructure) => s.kind === "column" || s.kind === "stairs";

/** 바닥에 놓인 가구(매달린 조명 제외) */
export function floorItems(items: SceneItem[]): SceneItem[] {
  return items.filter((item) => !item.hanging);
}

export function checkScene(scene: Pick<Scene, "room" | "items" | "structures">): SceneCheck {
  const { room, items, structures } = scene;
  const floor = floorItems(items);
  const clearances: Clearance[] = [];

  const counter = floor.find((item) => item.category === "counter");
  if (counter) {
    const bottom = counter.y + counter.depthMm;
    const below = floor.filter((item) => item !== counter && item.y >= bottom);
    if (below.length > 0) {
      const overlapping = below.filter((item) => item.x < counter.x + counter.widthMm && counter.x < item.x + item.widthMm);
      const nearest = Math.min(...(overlapping.length > 0 ? overlapping : below).map((item) => item.y - bottom));
      clearances.push({ id: "counter_front", label: "카운터 앞 손님 공간", valueMm: Math.round(nearest), requiredMm: COUNTER_FRONT_MM, ok: nearest >= COUNTER_FRONT_MM });
    }
    if (counter.y < room.depthMm / 2) {
      clearances.push({ id: "counter_back", label: "카운터 뒤 직원 통로", valueMm: Math.round(counter.y), requiredMm: COUNTER_BACK_MM, ok: counter.y >= COUNTER_BACK_MM });
    }
  }

  const seating = floor.filter((item) => item.chairs > 0);
  if (seating.length > 0) {
    const nearest = Math.min(...seating.map((item) => Math.min(item.x, room.widthMm - (item.x + item.widthMm), room.depthMm - (item.y + item.depthMm))));
    clearances.push({ id: "wall_seat", label: "벽과 의자 뒤 간격", valueMm: Math.round(nearest), requiredMm: WALL_SEAT_MM, ok: nearest >= WALL_SEAT_MM });
  }

  let narrowest = Infinity;
  for (let i = 0; i < floor.length; i += 1) {
    for (let j = i + 1; j < floor.length; j += 1) {
      const a = floor[i];
      const b = floor[j];
      if (a.category === "counter" || b.category === "counter") continue;
      if (!(a.x < b.x + b.widthMm && b.x < a.x + a.widthMm)) continue;
      const gap = Math.max(a.y - (b.y + b.depthMm), b.y - (a.y + a.depthMm));
      if (gap > 0) narrowest = Math.min(narrowest, gap);
    }
  }
  if (Number.isFinite(narrowest)) clearances.push({ id: "aisle", label: "줄 사이 통로", valueMm: Math.round(narrowest), requiredMm: MIN_AISLE_MM, ok: narrowest >= MIN_AISLE_MM });

  const zone = entryZone(room);
  const blocked = floor.some((item) => item.x < zone.right && item.x + item.widthMm > zone.left && item.y + item.depthMm > zone.top);
  clearances.push({ id: "entry", label: "입구 앞 비움", valueMm: blocked ? 0 : ENTRY_CLEAR_MM, requiredMm: ENTRY_CLEAR_MM, ok: !blocked });

  // 겹침, 구조물과 충돌, 방 밖
  const badIds = new Set<string>();
  const problems: string[] = [];
  const nameOf = (item: SceneItem) => item.name;
  for (let i = 0; i < floor.length; i += 1) {
    const a = floor[i];
    if (a.x < 0 || a.y < 0 || a.x + a.widthMm > room.widthMm || a.y + a.depthMm > room.depthMm) {
      badIds.add(a.id);
      problems.push(`${nameOf(a)}이(가) 방 밖으로 나갔습니다.`);
    }
    for (let j = i + 1; j < floor.length; j += 1) {
      if (overlaps(a, floor[j])) {
        badIds.add(a.id);
        badIds.add(floor[j].id);
        problems.push(`${nameOf(a)}과(와) ${nameOf(floor[j])}이(가) 겹칩니다.`);
      }
    }
    for (const s of structures.filter(isSolid)) {
      if (overlaps(a, { x: s.x, y: s.y, widthMm: s.widthMm, depthMm: s.depthMm })) {
        badIds.add(a.id);
        problems.push(`${nameOf(a)}이(가) ${s.label}과(와) 겹칩니다.`);
      }
    }
  }

  const failed = clearances.filter((c) => !c.ok).length + badIds.size;
  return { clearances, badIds, failed, total: clearances.length, problems: [...new Set(problems)] };
}
