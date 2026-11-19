// planLayout 본체: 입력 검증, 상품 목록에서 배치, 간격 측정
import assert from "node:assert/strict";
import { test } from "node:test";
import { computePlan, measureClearances, unitsFromItems, validatePlanInput, type PlanItem } from "./plan";

const room = { widthMm: 8000, depthMm: 11200, ceilingMm: 3000 };

const cafeItems: PlanItem[] = [
  { productId: "table", name: "2인 테이블", category: "table", widthMm: 600, depthMm: 600, heightMm: 720, qty: 8 },
  { productId: "chair", name: "의자", category: "chair", widthMm: 450, depthMm: 450, heightMm: 780, qty: 16 },
  { productId: "counter", name: "바 카운터", category: "counter", widthMm: 2400, depthMm: 600, heightMm: 1000, qty: 1 },
  { productId: "lamp", name: "펜던트", category: "lamp", widthMm: 300, depthMm: 300, heightMm: 400, qty: 4 },
];

test("입력이 올바르지 않으면 오류 문장을 돌려준다", () => {
  assert.ok("error" in validatePlanInput(null));
  assert.ok("error" in validatePlanInput({ room: { widthMm: 10, depthMm: 5000, ceilingMm: 3000 }, useType: "cafe" }));
  assert.ok("error" in validatePlanInput({ room, useType: "cafe", items: [{ productId: "x" }] }));
  assert.ok("input" in validatePlanInput({ room, useType: "cafe" }));
});

test("의자는 테이블에 딸린 수로 합치고 따로 놓지 않는다", () => {
  const units = unitsFromItems(cafeItems, "cafe");
  assert.equal(units.filter((unit) => unit.category === "chair").length, 0);
  const tables = units.filter((unit) => unit.category === "table");
  assert.equal(tables.length, 8);
  assert.ok(tables.every((unit) => unit.chairs === 2));
  assert.equal(tables[0].depthMm, 600 + 900); // 의자 깊이 450을 양쪽에 더한다.
});

test("카페 배치는 카운터 앞뒤 간격과 벽 간격 기준을 모두 충족한다", () => {
  const plan = computePlan({ room, useType: "cafe", items: cafeItems });
  assert.deepEqual(plan.violations, []);
  assert.deepEqual(plan.unplaced, []);
  const byId = Object.fromEntries(plan.clearances.map((entry) => [entry.id, entry]));
  assert.equal(byId.counter_back.valueMm, 900);
  assert.ok(byId.counter_front.ok && byId.counter_front.valueMm >= 1200);
  assert.ok(byId.wall_seat.ok);
  assert.ok(byId.entry.ok);
  assert.equal(plan.placed.filter((item) => item.hanging).length, 4);
});

test("items가 없으면 업종 기본 구성으로 배치한다", () => {
  const plan = computePlan({ room: { widthMm: 6000, depthMm: 6600, ceilingMm: 3000 }, useType: "popup" });
  assert.ok(plan.placed.length > 0);
  assert.ok(plan.entryZone.top > 0);
});

test("팝업의 조명은 바닥을 차지하지 않고 천장에 매달린다", () => {
  const items: PlanItem[] = [
    { productId: "shelf", name: "선반", category: "shelf", widthMm: 900, depthMm: 400, heightMm: 1800, qty: 4 },
    { productId: "lamp", name: "조명", category: "lamp", widthMm: 300, depthMm: 300, heightMm: 400, qty: 3 },
  ];
  const plan = computePlan({ room, useType: "popup", items });
  const lamps = plan.placed.filter((item) => item.category === "lamp");
  assert.equal(lamps.length, 3);
  assert.ok(lamps.every((lamp) => lamp.hanging));
});

test("천장이 낮으면 점검 항목에 오류가 담긴다", () => {
  const plan = computePlan({ room: { ...room, ceilingMm: 2000 }, useType: "cafe", items: cafeItems });
  assert.ok(plan.notes.some((note) => note.level === "error"));
});

test("카운터와 테이블이 가까우면 카운터 앞 간격이 미달로 나온다", () => {
  const placed = [
    { productId: "c", name: "카운터", category: "counter", kind: "fixture" as const, widthMm: 1800, depthMm: 600, chairs: 0, chairProductId: null, x: 300, y: 900 },
    { productId: "t", name: "테이블", category: "table", kind: "table" as const, widthMm: 600, depthMm: 600, chairs: 0, chairProductId: null, x: 300, y: 1500 + 700 },
  ];
  const counterFront = measureClearances(room, placed).find((entry) => entry.id === "counter_front")!;
  assert.equal(counterFront.valueMm, 700);
  assert.equal(counterFront.ok, false);
});

test("필라테스: 분류가 machine인 리포머는 기구 여유를 받고, 벽거울은 바닥에 놓지 않는다", () => {
  const items: PlanItem[] = [
    { productId: "reformer", name: "필라테스 리포머", category: "machine", widthMm: 2400, depthMm: 700, heightMm: 400, qty: 4 },
    { productId: "mirror", name: "전신 벽거울 1200", category: "mirror", widthMm: 1200, depthMm: 30, heightMm: 1800, qty: 4 },
  ];
  assert.ok("input" in validatePlanInput({ room, useType: "pilates", items })); // 두께 30mm도 받는다.
  const plan = computePlan({ room, useType: "pilates", items });
  const reformers = plan.placed.filter((item) => item.category === "reformer");
  assert.equal(reformers.length, 4);
  assert.ok(reformers.every((item) => item.clearanceMm === 450));
  assert.equal(plan.placed.some((item) => item.category === "mirror"), false);
  assert.deepEqual(plan.violations, []);
});
