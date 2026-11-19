// 업종별 구역 배치. 줄 단위로 채우기만 하던 배치에 설계 규칙을 더한다.
//   카페: 카운터를 안쪽 벽에 두고 카운터 뒤 직원 통로와 앞 손님 공간을 확보한 뒤, 나머지 공간에 테이블을 놓는다. 조명은 테이블 위에 단다.
//   팝업: 진열 줄을 안쪽 벽에서 계산대 쪽까지 고르게 펼치고, 계산대는 입구 옆 앞쪽에 둔다.
// 값은 기준표(knowledge.ts)에서 읽는다. 기준은 docs/DESIGN_KNOWLEDGE.md에 있다.
import { entryZone, ruleOf } from "./knowledge";
import { Layout, LayoutUnit, Packer, PlacedItem, packLayout } from "./layout";
import { LAYOUT_AISLE_MM, WALL_MARGIN_MM, requiredGapMm } from "./rules";

const COUNTER_FRONT_MM = ruleOf("counter.front").value as number; // 카운터 앞 손님 공간
const COUNTER_BACK_MM = ruleOf("counter.back").value as number; // 카운터 뒤 직원 통로
const POPUP_AISLE_MAX_MM = ruleOf("popup.aisle").max as number; // 진열 줄 사이 통로의 상한
export const SEAT_WALL_MM = ruleOf("wall.seat").value as number; // 앉는 자리와 벽 사이 간격

type Room = { widthMm: number; depthMm: number; ceilingMm: number };

const isCounter = (unit: LayoutUnit) => unit.category === "counter";
const isLamp = (unit: LayoutUnit) => unit.category === "lamp";

export function zonedPacker(useType: string): Packer {
  if (useType === "cafe") return packCafe;
  if (useType === "popup") return packPopup;
  // 필라테스 같은 이용자가 움직이는 자리도 벽에서 띄운다.
  return (room, units) => packLayout(room, units, SEAT_WALL_MM);
}

/** 카페. 카운터는 안쪽 벽에, 테이블은 카운터 앞 손님 공간 너머에 놓는다. */
export function packCafe(room: Room, units: LayoutUnit[]): Layout {
  const counters = units.filter(isCounter);
  const lamps = units.filter(isLamp);
  const rest = units.filter((unit) => !isCounter(unit) && !isLamp(unit));
  const placed: PlacedItem[] = [];
  const unplaced: LayoutUnit[] = [];

  // 카운터: 안쪽 벽에서 직원 통로만큼 떼어 가로로 나란히
  let x = WALL_MARGIN_MM;
  let counterBottom = 0;
  for (const counter of counters) {
    if (x + counter.widthMm > room.widthMm - WALL_MARGIN_MM) {
      unplaced.push(counter);
      continue;
    }
    placed.push({ ...counter, x, y: COUNTER_BACK_MM });
    x += counter.widthMm + requiredGapMm("fixture", "fixture");
    counterBottom = Math.max(counterBottom, COUNTER_BACK_MM + counter.depthMm);
  }

  // 테이블: 카운터 앞 손님 공간을 비운 아래쪽 공간에 줄 단위로
  const seatTop = counterBottom > 0 ? counterBottom + COUNTER_FRONT_MM : SEAT_WALL_MM;
  const shift = seatTop - SEAT_WALL_MM;
  const sub = packLayout({ ...room, depthMm: room.depthMm - shift }, rest, SEAT_WALL_MM); // 의자가 벽에 붙지 않게 벽에서 띄운다.
  placed.push(...sub.placed.map((item) => ({ ...item, y: item.y + shift })));
  unplaced.push(...sub.unplaced);

  // 조명: 바닥을 차지하지 않고 테이블 위에 단다.
  const tables = placed.filter((item) => item.kind === "table");
  lamps.forEach((lamp, index) => {
    const table = tables[index % Math.max(tables.length, 1)];
    if (!table) {
      unplaced.push(lamp);
      return;
    }
    placed.push({
      ...lamp,
      x: table.x + (table.widthMm - lamp.widthMm) / 2,
      y: table.y + (table.depthMm - lamp.depthMm) / 2,
      hanging: true,
    });
  });

  return { placed, unplaced };
}

/** 팝업. 진열 줄을 안쪽 벽에서 계산대 앞까지 고르게 펼치고, 계산대는 입구 옆 앞쪽에 둔다. */
export function packPopup(room: Room, units: LayoutUnit[]): Layout {
  const counters = units.filter(isCounter);
  const rest = units.filter((unit) => !isCounter(unit));
  const placed: PlacedItem[] = [];
  const unplaced: LayoutUnit[] = [];
  const zone = entryZone(room);

  // 계산대: 앞쪽 왼쪽 벽 쪽. 입구 앞 비움 구역에 걸리면 구역 오른쪽으로 옮긴다.
  let counterTop = room.depthMm - WALL_MARGIN_MM;
  let x = WALL_MARGIN_MM;
  for (const counter of counters) {
    if (x < zone.right && x + counter.widthMm > zone.left) x = zone.right;
    const y = room.depthMm - WALL_MARGIN_MM - counter.depthMm;
    if (x + counter.widthMm > room.widthMm - WALL_MARGIN_MM || y < WALL_MARGIN_MM) {
      unplaced.push(counter);
      continue;
    }
    placed.push({ ...counter, x, y });
    x += counter.widthMm + requiredGapMm("fixture", "fixture");
    counterTop = Math.min(counterTop, y);
  }

  // 진열: 계산대 앞 손님 공간 위쪽 영역에 줄을 나눠 놓는다.
  const regionBottom = counters.length > 0 ? counterTop - COUNTER_FRONT_MM : room.depthMm - WALL_MARGIN_MM;
  const usableWidth = room.widthMm - 2 * WALL_MARGIN_MM;
  const gap = requiredGapMm("fixture", "fixture");
  const widest = Math.max(...rest.map((unit) => unit.widthMm), 1);
  const perRowMax = Math.max(1, Math.floor((usableWidth + gap) / (widest + gap)));
  const rowCount = rest.length <= 1 ? 1 : Math.max(2, Math.ceil(rest.length / perRowMax));
  const perRow = Math.ceil(rest.length / rowCount);

  const rows: LayoutUnit[][] = [];
  for (let i = 0; i < rest.length; i += perRow) rows.push(rest.slice(i, i + perRow));

  const rowDepths = rows.map((row) => Math.max(...row.map((unit) => unit.depthMm)));
  const available = regionBottom - WALL_MARGIN_MM;
  const extra = available - rowDepths.reduce((sum, depth) => sum + depth, 0);
  const aisle = rows.length > 1 ? Math.min(POPUP_AISLE_MAX_MM, Math.max(LAYOUT_AISLE_MM, extra / (rows.length - 1))) : 0;

  let y = WALL_MARGIN_MM;
  rows.forEach((row, rowIndex) => {
    const rowWidth = row.reduce((sum, unit) => sum + unit.widthMm, 0) + gap * (row.length - 1);
    let rowX = WALL_MARGIN_MM + Math.max(0, (usableWidth - rowWidth) / 2); // 줄을 가운데로 모은다.
    for (const unit of row) {
      if (y + unit.depthMm > regionBottom || rowX + unit.widthMm > room.widthMm - WALL_MARGIN_MM) {
        unplaced.push(unit);
      } else {
        placed.push({ ...unit, x: rowX, y });
      }
      rowX += unit.widthMm + gap;
    }
    y += rowDepths[rowIndex] + aisle;
  });

  return { placed, unplaced };
}
