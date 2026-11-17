// 줄 단위로 집기를 채워 넣는 평면 배치. 좌표와 크기는 모두 mm다.
import type { Room } from "../types";
import { ItemKind, LAYOUT_AISLE_MM, MAX_RELAYOUT_COUNT, WALL_MARGIN_MM, requiredGapMm } from "./rules";
import { Violation, validateLayout } from "./validate";

/** 배치할 물건 한 개. 테이블에 딸린 의자는 chairs로 묶고, 의자 깊이는 depthMm에 이미 더해 둔다. */
export interface LayoutUnit {
  productId: string;
  name: string;
  kind: ItemKind;
  widthMm: number;
  depthMm: number;
  chairs: number;
  chairProductId: string | null;
}

export interface PlacedItem extends LayoutUnit {
  x: number;
  y: number;
}

export interface Layout {
  placed: PlacedItem[];
  unplaced: LayoutUnit[];
}

export function packLayout(room: Room, units: LayoutUnit[]): Layout {
  const placed: PlacedItem[] = [];
  const unplaced: LayoutUnit[] = [];
  const maxX = room.widthMm - WALL_MARGIN_MM;
  const maxY = room.depthMm - WALL_MARGIN_MM;

  let x = WALL_MARGIN_MM;
  let y = WALL_MARGIN_MM;
  let rowDepth = 0;
  let previous: LayoutUnit | null = null;

  for (const unit of units) {
    const gap = previous ? requiredGapMm(previous.kind, unit.kind) : 0;
    let startX = x + gap;

    // 줄 끝에 닿으면 통로를 두고 다음 줄로 내려간다.
    if (previous && startX + unit.widthMm > maxX) {
      y += rowDepth + LAYOUT_AISLE_MM;
      x = WALL_MARGIN_MM;
      startX = x;
      rowDepth = 0;
      previous = null;
    }

    const fits = startX + unit.widthMm <= maxX && y + unit.depthMm <= maxY;
    if (!fits) {
      unplaced.push(unit);
      continue;
    }

    placed.push({ ...unit, x: startX, y });
    x = startX + unit.widthMm;
    rowDepth = Math.max(rowDepth, unit.depthMm);
    previous = unit;
  }

  return { placed, unplaced };
}

export interface BuildLayoutResult {
  layout: Layout;
  violations: Violation[];
  /** 처음 배치를 빼고 다시 배치한 횟수 */
  relayoutCount: number;
}

/**
 * 배치 후 검증하고, 미달이면 최대 3번 다시 배치한다.
 * text 모드는 들어가지 않은 물건을 빼고 다시 배치한다. 사용자가 개수를 정하지 않았기 때문이다.
 * products 모드는 사용자가 고른 상품이라 빼지 않고 큰 것부터 다시 채운다.
 */
export function buildLayout(room: Room, units: LayoutUnit[], mode: "text" | "products"): BuildLayoutResult {
  let currentUnits = units;
  let layout = packLayout(room, currentUnits);
  let violations = validateLayout(room, layout);
  let relayoutCount = 0;

  while (violations.length > 0 && relayoutCount < MAX_RELAYOUT_COUNT) {
    relayoutCount += 1;
    currentUnits = mode === "text" ? removeUnplaced(currentUnits, layout) : sortByAreaDesc(currentUnits);
    layout = packLayout(room, currentUnits);
    violations = validateLayout(room, layout);
  }

  return { layout, violations, relayoutCount };
}

function removeUnplaced(units: LayoutUnit[], layout: Layout): LayoutUnit[] {
  return units.filter((unit) => !layout.unplaced.includes(unit));
}

function sortByAreaDesc(units: LayoutUnit[]): LayoutUnit[] {
  return [...units].sort((a, b) => b.widthMm * b.depthMm - a.widthMm * a.depthMm);
}
