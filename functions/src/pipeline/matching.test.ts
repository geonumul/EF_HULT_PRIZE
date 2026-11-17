import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyMatch, cosineSimilarity } from "./matching";

describe("classifyMatch", () => {
  it("0.85 이상이면 같은 상품이다", () => {
    const result = classifyMatch([{ productId: "a", similarity: 0.85 }]);
    assert.equal(result.matchType, "same");
    assert.equal(result.productId, "a");
  });

  it("0.85 미만이면 비슷한 상품이다", () => {
    assert.equal(classifyMatch([{ productId: "a", similarity: 0.84 }]).matchType, "similar");
  });

  it("후보가 없으면 태그를 달지 않는다", () => {
    const result = classifyMatch([]);
    assert.equal(result.matchType, "none");
    assert.equal(result.productId, null);
  });

  it("유사도가 너무 낮으면 태그를 달지 않는다", () => {
    assert.equal(classifyMatch([{ productId: "a", similarity: 0.3 }]).matchType, "none");
  });

  it("유사도 높은 순 상위 3개만 남긴다", () => {
    const found = [0.5, 0.9, 0.7, 0.95, 0.6].map((similarity, i) => ({ productId: `p${i}`, similarity }));
    const result = classifyMatch(found);
    assert.deepEqual(result.candidates.map((c) => c.productId), ["p3", "p1", "p2"]);
    assert.equal(result.productId, "p3");
  });
});

describe("cosineSimilarity", () => {
  it("같은 방향이면 1이다", () => {
    assert.ok(Math.abs(cosineSimilarity([1, 2, 3], [2, 4, 6]) - 1) < 1e-9);
  });

  it("영벡터는 0이다", () => {
    assert.equal(cosineSimilarity([0, 0], [1, 1]), 0);
  });
});
