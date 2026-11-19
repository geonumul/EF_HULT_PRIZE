// 업종별 구역 배치: 카운터 간격, 조명, 팝업 진열 분포
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildLayout, LayoutUnit } from "./layout";
import { validateLayout } from "./validate";
import { zonedPacker } from "./zoning";

const room = { widthMm: 6000, depthMm: 6600, ceilingMm: 3000 };

function unit(name: string, category: string, widthMm: number, depthMm: number, kind: LayoutUnit["kind"] = "fixture"): LayoutUnit {
  return { productId: name, name, kind, category, widthMm, depthMm, chairs: 0, chairProductId: null };
}

const cafeUnits = (): LayoutUnit[] => [
  ...Array.from({ length: 8 }, (_, i) => ({ ...unit(`t${i}`, "table", 600, 1500, "table"), chairs: 2 })),
  unit("카운터", "counter", 1800, 600),
  unit("조명1", "lamp", 300, 300),
  unit("조명2", "lamp", 300, 300),
];

test("카페: 카운터는 안쪽 벽에서 직원 통로 900을 띄우고, 앞 손님 공간 1200 뒤에 테이블이 놓인다", () => {
  const { layout, violations } = buildLayout(room, cafeUnits(), "text", zonedPacker("cafe"));
  const counter = layout.placed.find((item) => item.category === "counter")!;
  assert.equal(counter.y, 900);
  const tables = layout.placed.filter((item) => item.kind === "table");
  assert.ok(tables.length > 0);
  for (const table of tables) assert.ok(table.y >= counter.y + counter.depthMm + 1200, `${table.name} y=${table.y}`);
  assert.deepEqual(violations, []);
});

test("카페: 조명은 테이블 위에 매달려 바닥 규칙을 보지 않는다", () => {
  const { layout } = buildLayout(room, cafeUnits(), "text", zonedPacker("cafe"));
  const lamps = layout.placed.filter((item) => item.category === "lamp");
  assert.equal(lamps.length, 2);
  assert.ok(lamps.every((lamp) => lamp.hanging));
  assert.deepEqual(validateLayout(room, layout), []);
});

test("카운터와 테이블 사이가 1200 미만이면 위반이다", () => {
  const layout = {
    placed: [
      { ...unit("카운터", "counter", 1800, 600), x: 300, y: 900 },
      { ...unit("테이블", "table", 600, 600, "table"), x: 300, y: 1500 + 800 },
    ],
    unplaced: [],
  };
  assert.ok(validateLayout(room, layout).some((violation) => violation.rule === "aisle"));
});

test("팝업: 진열 줄이 안쪽 벽에서 계산대 쪽까지 퍼지고 앞쪽이 비지 않는다", () => {
  const units = [...Array.from({ length: 6 }, (_, i) => unit(`선반${i}`, "shelf", 900, 400)), unit("계산대", "counter", 1800, 600)];
  const { layout, violations } = buildLayout(room, units, "text", zonedPacker("popup"));
  const shelves = layout.placed.filter((item) => item.category === "shelf");
  const counter = layout.placed.find((item) => item.category === "counter")!;
  const rows = [...new Set(shelves.map((item) => item.y))].sort((a, b) => a - b);
  assert.ok(rows.length >= 2, "진열 줄이 둘 이상이어야 한다");
  const lastRowBottom = rows[rows.length - 1] + 400;
  assert.ok(counter.y - lastRowBottom >= 1200, "계산대 앞 손님 공간 1200");
  assert.ok(rows[rows.length - 1] - rows[0] >= 1300, "줄 사이가 벌어져 있어야 한다");
  assert.deepEqual(violations, []);
});

test("다른 업종은 기존 줄 배치를 쓴다", () => {
  const units = [unit("리포머", "reformer", 2400, 700), unit("리포머2", "reformer", 2400, 700)];
  const { layout } = buildLayout(room, units, "text", zonedPacker("pilates"));
  assert.equal(layout.placed.length, 2);
});
