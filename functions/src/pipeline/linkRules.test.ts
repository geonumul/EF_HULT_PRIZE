import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideLinkUpdate } from "./linkRules";
import type { ProductLink } from "../types";

const link: ProductLink = {
  id: "l1",
  productId: "p1",
  source: "naver",
  url: "https://example.com",
  affiliateUrl: null,
  price: 10000,
  status: "live",
};

describe("decideLinkUpdate", () => {
  it("404는 dead이고 대체안이 필요하다", () => {
    const update = decideLinkUpdate(link, { statusCode: 404, soldOut: false, price: null });
    assert.equal(update.status, "dead");
    assert.equal(update.needsAlternatives, true);
  });

  it("품절이면 soldout이다", () => {
    assert.equal(decideLinkUpdate(link, { statusCode: 200, soldOut: true, price: 10000 }).status, "soldout");
  });

  it("정상이면 live이다", () => {
    assert.equal(decideLinkUpdate(link, { statusCode: 200, soldOut: false, price: 10000 }).status, "live");
  });

  it("가격이 5%를 넘게 바뀌면 알림 대상이다", () => {
    assert.equal(decideLinkUpdate(link, { statusCode: 200, soldOut: false, price: 10600 }).priceAlert, true);
  });

  it("정확히 5% 변동은 알림 대상이 아니다", () => {
    assert.equal(decideLinkUpdate(link, { statusCode: 200, soldOut: false, price: 10500 }).priceAlert, false);
  });

  it("가격을 읽지 못하면 기존 가격을 유지한다", () => {
    assert.equal(decideLinkUpdate(link, { statusCode: 200, soldOut: false, price: null }).price, 10000);
  });
});
