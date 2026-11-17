import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PlacedItem } from "./layout";
import { validateLayout } from "./validate";

const room = { widthMm: 6000, depthMm: 6000, ceilingMm: 2700 };

function item(name: string, x: number, y: number, kind: PlacedItem["kind"] = "table", size = 600): PlacedItem {
  return { productId: name, name, kind, widthMm: size, depthMm: size, chairs: 0, chairProductId: null, x, y };
}

function check(placed: PlacedItem[]) {
  return validateLayout(room, { placed, unplaced: [] });
}

describe("validateLayout", () => {
  it("통로가 850mm이면 통과한다", () => {
    assert.deepEqual(check([item("a", 0, 0), item("b", 0, 600 + 850)]), []);
  });

  it("통로가 849mm이면 통로 위반이다", () => {
    const violations = check([item("a", 0, 0), item("b", 0, 600 + 849)]);
    assert.equal(violations[0].rule, "aisle");
  });

  it("테이블끼리 좌우 간격이 600mm 미만이면 간격 위반이다", () => {
    const violations = check([item("a", 0, 0), item("b", 600 + 599, 0)]);
    assert.equal(violations[0].rule, "gap");
  });

  it("테이블끼리 좌우 간격이 600mm이면 통과한다", () => {
    assert.deepEqual(check([item("a", 0, 0), item("b", 600 + 600, 0)]), []);
  });

  it("기구는 100mm 미만이면 간격 위반이다", () => {
    const violations = check([item("a", 0, 0, "fixture"), item("b", 600 + 99, 0, "table")]);
    assert.equal(violations[0].rule, "gap");
  });

  it("겹치면 겹침 위반이다", () => {
    assert.equal(check([item("a", 0, 0), item("b", 300, 300)])[0].rule, "overlap");
  });

  it("공간 밖에 놓이면 위반이다", () => {
    assert.equal(check([item("a", 5800, 0)])[0].rule, "not_fit");
  });

  it("놓지 못한 물건은 어떤 상품인지 알려 준다", () => {
    const unit = { productId: "p1", name: "큰 선반", kind: "fixture" as const, widthMm: 9000, depthMm: 500, chairs: 0, chairProductId: null };
    const violations = validateLayout(room, { placed: [], unplaced: [unit] });
    assert.deepEqual(violations[0].productIds, ["p1"]);
  });
});
