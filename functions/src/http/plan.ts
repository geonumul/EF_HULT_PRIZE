// planLayout 본체. 공간과 업종과 상품 목록으로 배치를 계산하고 설계 기준을 점검한다. 이미지는 만들지 않는다.
// 응답 형식은 docs/RENDER_API.md가 정한다.
import { SEED_PRODUCTS } from "../adapters/supabaseClient";
import { ENTRY_CLEAR_MM, entryZone, ruleOf } from "../pipeline/knowledge";
import { buildLayout, type LayoutUnit, type PlacedItem } from "../pipeline/layout";
import { legalNotes, type DesignNote } from "../pipeline/legal";
import { CHAIR_DEPTH_MM, MIN_AISLE_MM } from "../pipeline/rules";
import { unitsFromTemplate } from "../pipeline/template";
import type { Room } from "../types";
import type { Violation } from "../pipeline/validate";
import { zonedPacker } from "../pipeline/zoning";

export interface PlanItem {
  productId: string;
  name: string;
  category: string;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  qty: number;
  imagePath?: string;
}

export interface PlanInput {
  room: Room;
  useType: string;
  items?: PlanItem[];
}

export interface Clearance {
  id: "counter_front" | "counter_back" | "wall_seat" | "aisle" | "entry";
  label: string;
  valueMm: number;
  requiredMm: number;
  ok: boolean;
}

export interface PlanResponse {
  room: Room;
  useType: string;
  placed: PlacedItem[];
  unplaced: Array<{ productId: string; name: string }>;
  violations: Violation[];
  notes: DesignNote[];
  entryZone: { left: number; right: number; top: number };
  clearances: Clearance[];
}

const MAX_UNITS = 80;
const COUNTER_FRONT_MM = ruleOf("counter.front").value as number;
const COUNTER_BACK_MM = ruleOf("counter.back").value as number;
const WALL_SEAT_MM = ruleOf("wall.seat").value as number;
const PILATES_GAP_MM = ruleOf("pilates.gap").value as number;

/** 입력이 올바른 크기와 종류인지 확인한다. 문제가 있으면 오류 문장을 돌려준다. */
export function validatePlanInput(body: unknown): { input: PlanInput } | { error: string } {
  if (typeof body !== "object" || body === null) return { error: "본문이 올바르지 않습니다." };
  const data = body as Partial<PlanInput>;
  const room = data.room;
  const inRange = (value: unknown, min: number, max: number) => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
  if (!room || !inRange(room.widthMm, 2000, 60000) || !inRange(room.depthMm, 2000, 60000) || !inRange(room.ceilingMm, 1800, 12000)) {
    return { error: "room의 widthMm, depthMm, ceilingMm가 올바르지 않습니다." };
  }
  if (typeof data.useType !== "string" || data.useType.length === 0 || data.useType.length > 20) return { error: "useType이 올바르지 않습니다." };
  if (data.items !== undefined) {
    if (!Array.isArray(data.items) || data.items.length > 40) return { error: "items가 올바르지 않습니다." };
    for (const item of data.items) {
      const ok =
        item && typeof item.productId === "string" && typeof item.name === "string" && typeof item.category === "string" &&
        inRange(item.widthMm, 50, 10000) && inRange(item.depthMm, 50, 10000) && inRange(item.heightMm, 10, 5000) && inRange(item.qty, 1, 80);
      if (!ok) return { error: "items 항목의 값이 올바르지 않습니다." };
    }
  }
  return { input: { room: room as Room, useType: data.useType, items: data.items } };
}

/** 상품 목록을 배치할 물건으로 바꾼다. 의자는 테이블에 딸린 수로 합치고, 조명은 바닥에 두지 않는다. */
export function unitsFromItems(items: PlanItem[], useType: string): LayoutUnit[] {
  const tableCount = items.filter((item) => item.category === "table").reduce((sum, item) => sum + item.qty, 0);
  const chairCount = items.filter((item) => item.category === "chair").reduce((sum, item) => sum + item.qty, 0);
  const chairsPerTable = tableCount > 0 ? Math.min(4, Math.round(chairCount / tableCount)) : 0;
  const units: LayoutUnit[] = [];

  for (const item of items) {
    if (item.category === "chair" && tableCount > 0) continue; // 테이블에 딸려 배치된다.
    for (let i = 0; i < item.qty && units.length < MAX_UNITS; i += 1) {
      const isTable = item.category === "table";
      const chairs = isTable ? chairsPerTable : 0;
      const clearance = item.category === "reformer" && useType === "pilates" ? PILATES_GAP_MM / 2 : 0;
      units.push({
        productId: item.productId,
        name: item.name,
        kind: isTable ? "table" : item.category === "chair" ? "chair" : "fixture",
        widthMm: item.widthMm + 2 * clearance,
        depthMm: item.depthMm + (chairs > 0 ? CHAIR_DEPTH_MM * 2 : 0) + 2 * clearance,
        chairs,
        chairProductId: null,
        heightMm: item.heightMm,
        clearanceMm: clearance || undefined,
        category: item.category,
      });
    }
  }
  return units;
}

/** 카페 밖의 업종에서 조명을 방 전체에 고르게 매단다. 바닥을 차지하지 않는다. */
function hangLamps(room: Room, lamps: LayoutUnit[]): PlacedItem[] {
  if (lamps.length === 0) return [];
  const columns = Math.max(1, Math.round(Math.sqrt((lamps.length * room.widthMm) / room.depthMm)));
  const rows = Math.ceil(lamps.length / columns);
  return lamps.map((lamp, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const cx = ((column + 0.5) / columns) * room.widthMm;
    const cy = ((row + 0.5) / rows) * room.depthMm;
    return { ...lamp, x: cx - lamp.widthMm / 2, y: cy - lamp.depthMm / 2, hanging: true };
  });
}

/** 계산한 배치에서 설계 기준 간격을 잰다. */
export function measureClearances(room: Room, placed: PlacedItem[]): Clearance[] {
  const floor = placed.filter((item) => !item.hanging);
  const result: Clearance[] = [];
  const counters = floor.filter((item) => item.category === "counter");

  for (const counter of counters.slice(0, 1)) {
    const bottom = counter.y + counter.depthMm;
    const below = floor.filter((item) => item !== counter && item.y >= bottom);
    if (below.length > 0) {
      const overlapping = below.filter((item) => item.x < counter.x + counter.widthMm && counter.x < item.x + item.widthMm);
      const nearest = Math.min(...(overlapping.length > 0 ? overlapping : below).map((item) => item.y - bottom));
      result.push({ id: "counter_front", label: "카운터 앞 손님 공간", valueMm: Math.round(nearest), requiredMm: COUNTER_FRONT_MM, ok: nearest >= COUNTER_FRONT_MM });
    }
    if (counter.y < room.depthMm / 2) {
      result.push({ id: "counter_back", label: "카운터 뒤 직원 통로", valueMm: Math.round(counter.y), requiredMm: COUNTER_BACK_MM, ok: counter.y >= COUNTER_BACK_MM });
    }
  }

  const seating = floor.filter((item) => item.chairs > 0);
  if (seating.length > 0) {
    const nearest = Math.min(...seating.map((item) => Math.min(item.x, room.widthMm - (item.x + item.widthMm), room.depthMm - (item.y + item.depthMm))));
    result.push({ id: "wall_seat", label: "벽과 의자 뒤 간격", valueMm: Math.round(nearest), requiredMm: WALL_SEAT_MM, ok: nearest >= WALL_SEAT_MM });
  }

  let narrowest = Infinity;
  for (let i = 0; i < floor.length; i += 1) {
    for (let j = i + 1; j < floor.length; j += 1) {
      const a = floor[i];
      const b = floor[j];
      if (a.category === "counter" || b.category === "counter") continue;
      const overlapX = a.x < b.x + b.widthMm && b.x < a.x + a.widthMm;
      if (!overlapX) continue;
      const gap = Math.max(a.y - (b.y + b.depthMm), b.y - (a.y + a.depthMm));
      if (gap > 0) narrowest = Math.min(narrowest, gap);
    }
  }
  if (Number.isFinite(narrowest)) result.push({ id: "aisle", label: "줄 사이 통로", valueMm: Math.round(narrowest), requiredMm: MIN_AISLE_MM, ok: narrowest >= MIN_AISLE_MM });

  const zone = entryZone(room);
  const blocked = floor.some((item) => item.x < zone.right && item.x + item.widthMm > zone.left && item.y + item.depthMm > zone.top);
  result.push({ id: "entry", label: "입구 앞 비움", valueMm: blocked ? 0 : ENTRY_CLEAR_MM, requiredMm: ENTRY_CLEAR_MM, ok: !blocked });
  return result;
}

export function computePlan(input: PlanInput): PlanResponse {
  const { room, useType } = input;
  let units: LayoutUnit[];
  if (input.items && input.items.length > 0) {
    units = unitsFromItems(input.items, useType);
  } else {
    units = unitsFromTemplate(useType, room, SEED_PRODUCTS).units;
  }

  // 카페는 조명을 테이블 위에 다는 배치기가 처리한다. 다른 업종은 따로 매단다.
  const lamps = units.filter((unit) => unit.category === "lamp");
  const floorUnits = useType === "cafe" ? units : units.filter((unit) => unit.category !== "lamp");
  const { layout, violations } = buildLayout(room, floorUnits, "text", zonedPacker(useType));
  const placed = useType === "cafe" ? layout.placed : [...layout.placed, ...hangLamps(room, lamps)];

  return {
    room,
    useType,
    placed,
    unplaced: layout.unplaced.map((unit) => ({ productId: unit.productId, name: unit.name })),
    violations,
    notes: legalNotes(room, useType),
    entryZone: entryZone(room),
    clearances: measureClearances(room, placed),
  };
}
