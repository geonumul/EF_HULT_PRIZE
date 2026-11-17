import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLayout, LayoutUnit, packLayout } from "./layout";
import { MIN_AISLE_MM } from "./rules";
import { validateLayout } from "./validate";

const room = { widthMm: 6600, depthMm: 6000, ceilingMm: 2700 };

function unit(name: string, widthMm: number, depthMm: number, kind: LayoutUnit["kind"] = "fixture"): LayoutUnit {
  return { productId: name, name, kind, widthMm, depthMm, chairs: 0, chairProductId: null };
}

describe("packLayout", () => {
  it("줄이 차면 통로 900mm를 두고 다음 줄에 놓는다", () => {
    const units = [unit("a", 2900, 1000), unit("b", 2900, 1000), unit("c", 2900, 1000)];
    const { placed } = packLayout(room, units);
    assert.equal(placed.length, 3);
    assert.equal(placed[2].y, placed[0].y + 1000 + 900);
  });

  it("방보다 큰 물건은 놓지 못한 목록에 넣는다", () => {
    const { placed, unplaced } = packLayout(room, [unit("huge", 9000, 1000)]);
    assert.equal(placed.length, 0);
    assert.equal(unplaced.length, 1);
  });
});

describe("buildLayout", () => {
  it("들어가는 배치는 다시 배치하지 않는다", () => {
    const result = buildLayout(room, [unit("a", 1000, 1000)], "text");
    assert.equal(result.relayoutCount, 0);
    assert.deepEqual(result.violations, []);
  });

  it("text 모드는 들어가지 않는 물건을 빼고 다시 배치해서 통과시킨다", () => {
    const result = buildLayout(room, [unit("a", 1000, 1000), unit("huge", 9000, 1000)], "text");
    assert.equal(result.relayoutCount, 1);
    assert.deepEqual(result.violations, []);
    assert.equal(result.layout.placed.length, 1);
  });

  it("products 모드는 물건을 빼지 않고 최대 3번까지 다시 배치한 뒤 위반을 돌려준다", () => {
    const result = buildLayout(room, [unit("a", 1000, 1000), unit("huge", 9000, 1000)], "products");
    assert.equal(result.relayoutCount, 3);
    assert.equal(result.violations.length, 1);
    assert.deepEqual(result.violations[0].productIds, ["huge"]);
  });

  it("만든 배치는 통로 규칙을 만족한다", () => {
    const units = Array.from({ length: 12 }, (_, i) => unit(`t${i}`, 1200, 1200, "table"));
    const { layout } = buildLayout(room, units, "text");
    assert.deepEqual(validateLayout(room, layout), []);
    const rows = new Set(layout.placed.map((item) => item.y));
    const ys = [...rows].sort((a, b) => a - b);
    for (let i = 1; i < ys.length; i += 1) {
      assert.ok(ys[i] - ys[i - 1] - 1200 >= MIN_AISLE_MM);
    }
  });
});
