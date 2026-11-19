// 4단계 치수 검증. 통로, 좌석 간격, 기구 간격, 겹침, 공간 밖 배치를 확인한다.
import type { Room } from "../types";
import type { Layout, PlacedItem } from "./layout";
import { ENTRY_CLEAR_MM, entryZone } from "./knowledge";
import { MIN_AISLE_MM, requiredGapMm } from "./rules";

export type ViolationRule = "not_fit" | "overlap" | "aisle" | "gap" | "entry";

export interface Violation {
  rule: ViolationRule;
  message: string;
  productIds: string[];
}

export function validateLayout(room: Room, layout: Layout): Violation[] {
  const violations: Violation[] = [];

  for (const unit of layout.unplaced) {
    violations.push({
      rule: "not_fit",
      message: `${unit.name}이(가) 공간에 들어가지 않습니다.`,
      productIds: [unit.productId],
    });
  }

  for (const item of layout.placed) {
    if (isOutsideRoom(room, item)) {
      violations.push({ rule: "not_fit", message: `${item.name}이(가) 공간 밖에 놓입니다.`, productIds: [item.productId] });
    }
  }

  // 입구는 앞쪽 벽(깊이 끝) 가운데에 있다고 보고, 그 앞은 비워 둔다.
  for (const item of layout.placed) {
    if (isInEntryZone(room, item)) {
      violations.push({ rule: "entry", message: `${item.name}이(가) 입구 앞 비움 구역(${ENTRY_CLEAR_MM}mm)에 놓입니다.`, productIds: [item.productId] });
    }
  }

  const items = layout.placed;
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const violation = checkPair(items[i], items[j]);
      if (violation) violations.push(violation);
    }
  }

  return violations;
}

function isInEntryZone(room: Room, item: PlacedItem): boolean {
  const zone = entryZone(room);
  return item.x < zone.right && item.x + item.widthMm > zone.left && item.y + item.depthMm > zone.top;
}

function isOutsideRoom(room: Room, item: PlacedItem): boolean {
  return item.x < 0 || item.y < 0 || item.x + item.widthMm > room.widthMm || item.y + item.depthMm > room.depthMm;
}

function checkPair(a: PlacedItem, b: PlacedItem): Violation | null {
  const overlapX = a.x < b.x + b.widthMm && b.x < a.x + a.widthMm;
  const overlapY = a.y < b.y + b.depthMm && b.y < a.y + a.depthMm;
  const productIds = [a.productId, b.productId];

  if (overlapX && overlapY) {
    return { rule: "overlap", message: `${a.name}과(와) ${b.name}이(가) 겹칩니다.`, productIds };
  }

  // 위아래로 마주 보면 통로 규칙을 본다.
  if (overlapX) {
    const gap = Math.max(a.y - (b.y + b.depthMm), b.y - (a.y + a.depthMm));
    if (gap < MIN_AISLE_MM) {
      return {
        rule: "aisle",
        message: `${a.name}과(와) ${b.name} 사이 통로가 ${gap}mm입니다. ${MIN_AISLE_MM}mm 이상이어야 합니다.`,
        productIds,
      };
    }
    return null;
  }

  // 좌우로 나란하면 좌석 간격과 기구 간격 규칙을 본다.
  if (overlapY) {
    const gap = Math.max(a.x - (b.x + b.widthMm), b.x - (a.x + a.widthMm));
    const required = requiredGapMm(a.kind, b.kind);
    if (gap < required) {
      return {
        rule: "gap",
        message: `${a.name}과(와) ${b.name} 간격이 ${gap}mm입니다. ${required}mm 이상이어야 합니다.`,
        productIds,
      };
    }
  }

  return null;
}
