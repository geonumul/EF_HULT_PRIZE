// 줄 단위로 집기를 채워 넣는 평면 배치. 좌표와 크기는 모두 mm다.
import type { Room } from "../types";
import { entryZone } from "./knowledge";
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
  /** 상품의 실제 높이(mm). 구조 그림을 실제 크기로 그리는 데 쓴다. */
  heightMm?: number;
  chairHeightMm?: number;
  /** 기구 둘레에 두는 여유(mm, 한쪽). 발자국(widthMm, depthMm)에 이미 더해져 있다. 구조 그림은 이만큼 안쪽에 기구를 그린다. */
  clearanceMm?: number;
  /** 상품 분류(counter, lamp, table 등). 업종별 배치가 카운터와 조명을 따로 다룬다. */
  category?: string;
  /** 천장에 매다는 물건. 바닥을 차지하지 않아 다른 물건과 겹쳐도 위반이 아니다. */
  hanging?: boolean;
}

export interface PlacedItem extends LayoutUnit {
  x: number;
  y: number;
}

export interface Layout {
  placed: PlacedItem[];
  unplaced: LayoutUnit[];
}

/** 물건 목록을 공간에 놓는 방법. 업종마다 다른 배치기를 쓸 수 있다. */
export type Packer = (room: Room, units: LayoutUnit[]) => Layout;

export function packLayout(room: Room, units: LayoutUnit[], margin: number = WALL_MARGIN_MM): Layout {
  const placed: PlacedItem[] = [];
  const unplaced: LayoutUnit[] = [];
  const maxX = room.widthMm - margin;
  const maxY = room.depthMm - margin;

  const zone = entryZone(room);
  let x = margin;
  let y = margin;
  let rowDepth = 0;
  let previous: LayoutUnit | null = null;

  for (const unit of units) {
    const gap = previous ? requiredGapMm(previous.kind, unit.kind) : 0;
    let startX = x + gap;

    // 입구 앞 비움 구역에 걸리면 그 구역 오른쪽으로 옮긴다.
    if (startX < zone.right && startX + unit.widthMm > zone.left && y + unit.depthMm > zone.top) startX = zone.right;

    // 줄 끝에 닿으면 통로를 두고 다음 줄로 내려간다.
    if (previous && startX + unit.widthMm > maxX) {
      y += rowDepth + LAYOUT_AISLE_MM;
      x = margin;
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
export function buildLayout(room: Room, units: LayoutUnit[], mode: "text" | "products", pack: Packer = packLayout): BuildLayoutResult {
  let currentUnits = units;
  let layout = pack(room, currentUnits);
  let violations = validateLayout(room, layout);
  let relayoutCount = 0;

  while (violations.length > 0 && relayoutCount < MAX_RELAYOUT_COUNT) {
    relayoutCount += 1;
    currentUnits = mode === "text" ? removeUnplaced(currentUnits, layout) : sortByAreaDesc(currentUnits);
    layout = pack(room, currentUnits);
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
