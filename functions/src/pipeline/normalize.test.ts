import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { categoryFromTitle, extractDimensions, normalizeItem } from "./normalize";

describe("extractDimensions", () => {
  it("W D H 표기를 읽는다", () => {
    assert.deepEqual(extractDimensions("오크 체어 W450 D520 H780"), { widthMm: 450, depthMm: 520, heightMm: 780 });
  });

  it("mm 곱셈 표기를 읽는다", () => {
    assert.deepEqual(extractDimensions("테이블 600x600x720mm"), { widthMm: 600, depthMm: 600, heightMm: 720 });
  });

  it("cm 표기는 mm로 바꾼다", () => {
    assert.deepEqual(extractDimensions("선반 90x40x180cm"), { widthMm: 900, depthMm: 400, heightMm: 1800 });
  });

  it("치수가 없으면 null이다", () => {
    assert.equal(extractDimensions("예쁜 의자"), null);
  });
});

describe("normalizeItem", () => {
  it("카테고리를 통일한다", () => {
    assert.equal(categoryFromTitle("원목 스툴"), "chair");
    assert.equal(categoryFromTitle("아무거나"), "etc");
  });

  it("치수가 없으면 공급사 입력 필수로 표시한다", () => {
    const item = normalizeItem({ source: "naver", title: "카페 의자", price: 1000, imageUrl: "", url: "", affiliateUrl: null });
    assert.equal(item.needsSupplierDimensions, true);
    assert.equal(item.dimensions, null);
  });
});
