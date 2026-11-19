// 기준표와 입구 비움 검증
import assert from "node:assert/strict";
import { test } from "node:test";
import { DESIGN_RULES, ENTRY_CLEAR_MM, ruleOf } from "./knowledge";
import type { Layout, PlacedItem } from "./layout";
import { validateLayout } from "./validate";

const room = { widthMm: 6000, depthMm: 6600, ceilingMm: 3200 };

function item(x: number, y: number): PlacedItem {
  return { productId: "p", name: "카운터", kind: "fixture", widthMm: 600, depthMm: 600, chairs: 0, chairProductId: null, x, y };
}

test("기준 id는 중복되지 않고 모든 값에 상태가 있다", () => {
  const ids = DESIGN_RULES.map((rule) => rule.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(DESIGN_RULES.every((rule) => rule.status && rule.label));
  assert.equal(ruleOf("entry.clear").value, ENTRY_CLEAR_MM);
  assert.ok(DESIGN_RULES.every((rule) => rule.source));
});

test("입구 앞 비움 구역에 놓으면 위반이다", () => {
  const blocked: Layout = { placed: [item(2700, 5700)], unplaced: [] };
  assert.ok(validateLayout(room, blocked).some((violation) => violation.rule === "entry"));
});

test("비움 구역 밖이면 위반이 아니다", () => {
  const free: Layout = { placed: [item(300, 5700), item(2700, 300)], unplaced: [] };
  assert.equal(validateLayout(room, free).filter((violation) => violation.rule === "entry").length, 0);
});
