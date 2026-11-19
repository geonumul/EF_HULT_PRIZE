// 법령 점검 항목
import assert from "node:assert/strict";
import { test } from "node:test";
import { areaM2, legalNotes } from "./legal";

const room = (widthMm: number, depthMm: number, ceilingMm = 3000) => ({ widthMm, depthMm, ceilingMm });

test("면적을 ㎡로 계산한다", () => {
  assert.equal(areaM2(room(6000, 6600)), 39.6);
});

test("천장이 2100mm보다 낮으면 문제로 알린다", () => {
  const notes = legalNotes(room(5000, 5000, 2000), "cafe");
  assert.ok(notes.some((note) => note.level === "error" && note.text.includes("2100")));
  assert.equal(legalNotes(room(5000, 5000, 2400), "cafe").filter((note) => note.level === "error").length, 0);
});

test("카페 39.6㎡는 조리장 점검만 있고 50㎡ 이상 항목은 없다", () => {
  const texts = legalNotes(room(6000, 6600), "cafe").map((note) => note.text);
  assert.ok(texts.some((text) => text.includes("조리장")));
  assert.ok(!texts.some((text) => text.includes("장애인 편의시설")));
  assert.ok(!texts.some((text) => text.includes("다중이용업소")));
});

test("50㎡ 이상은 장애인 편의시설, 100㎡ 이상 음식점은 소방을 확인하라고 알린다", () => {
  const texts = legalNotes(room(10000, 10500), "cafe").map((note) => note.text);
  assert.ok(texts.some((text) => text.includes("장애인 편의시설")));
  assert.ok(texts.some((text) => text.includes("다중이용업소")));
  const retail = legalNotes(room(10000, 10500), "popup").map((note) => note.text);
  assert.ok(!retail.some((text) => text.includes("다중이용업소")));
});

test("필라테스는 천장 권장 높이와 분류 확인을 알린다", () => {
  const texts = legalNotes(room(6000, 6600, 2500), "pilates").map((note) => note.text);
  assert.ok(texts.some((text) => text.includes("2740")));
  assert.ok(texts.some((text) => text.includes("학원")));
});

test("모든 점검 항목에는 출처가 있다", () => {
  assert.ok(legalNotes(room(10000, 10500, 2000), "cafe").every((note) => note.source.length > 0));
});
