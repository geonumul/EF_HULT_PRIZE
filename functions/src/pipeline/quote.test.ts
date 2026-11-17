import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildQuote } from "./quote";
import type { Product, RenderItem } from "../types";

const chair: Product = {
  id: "p1", name: "오크 체어", category: "chair", widthMm: 450, depthMm: 520, heightMm: 780, price: 89000, imageUrl: "", embedding: [],
};

function item(productId: string | null, qty: number): RenderItem {
  return { productId, label: "의자", category: "chair", matchType: "same", similarity: 0.9, qty, tag: null, candidates: [] };
}

describe("buildQuote", () => {
  it("단가 x 수량을 합친다", () => {
    const quote = buildQuote([item("p1", 22)], [chair]);
    assert.equal(quote.productsTotal, 89000 * 22);
    assert.equal(quote.findYourselfCount, 0);
  });

  it("맞는 상품이 없으면 직접 찾기로 남기고 합계에 넣지 않는다", () => {
    const quote = buildQuote([item("p1", 1), item(null, 3)], [chair]);
    assert.equal(quote.productsTotal, 89000);
    assert.equal(quote.findYourselfCount, 1);
    assert.equal(quote.lines[1].amount, null);
  });
});
