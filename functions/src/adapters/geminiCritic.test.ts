// 자동 검수: 체크리스트 구성, 요청 모양, 판정 요약
import assert from "node:assert/strict";
import { test } from "node:test";
import { GeminiCritic, checklistFor, summarize } from "./geminiCritic";

const image = (value: number) => ({ bytes: new Uint8Array([value]), contentType: "image/jpeg" });

test("카페 체크리스트에는 카운터 앞뒤 간격이 필수로 들어 있고 기준표 값을 쓴다", () => {
  const list = checklistFor("cafe", true);
  const front = list.find((entry) => entry.id === "counter_front")!;
  const back = list.find((entry) => entry.id === "counter_back")!;
  assert.ok(front.critical && front.question.includes("1.2m"));
  assert.ok(back.critical && back.question.includes("0.9m"));
  assert.ok(list.some((entry) => entry.id === "matches_photo"));
  assert.ok(!checklistFor("cafe", false).some((entry) => entry.id === "matches_photo"));
});

test("필수 항목이 하나라도 실패하면 통과가 아니다", () => {
  const list = checklistFor("cafe", false);
  const items = list.map((entry) => ({ id: entry.id, pass: true, note: "" }));
  assert.equal(summarize(items, list).passed, true);
  const broken = items.map((item) => (item.id === "counter_front" ? { ...item, pass: false } : item));
  const result = summarize(broken, list);
  assert.equal(result.passed, false);
  assert.equal(result.failed[0].id, "counter_front");
});

test("선택 항목만 실패하면 통과로 본다", () => {
  const list = checklistFor("cafe", false);
  const items = list.map((entry) => ({ id: entry.id, pass: entry.critical, note: "" }));
  assert.equal(summarize(items, list).passed, true);
});

test("원본과 결과 이미지를 함께 보내고, 응답에서 빠진 항목은 실패로 본다", async () => {
  let body: any = null;
  const fakeFetch = (async (_url: string, init: any) => {
    body = JSON.parse(init.body);
    const items = [{ id: "scale", pass: true, note: "문제 없음" }];
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ items }) }] } }] }) };
  }) as unknown as typeof fetch;

  const result = await new GeminiCritic("k", "m", fakeFetch).critique({ image: image(2), original: image(1), useType: "popup" });
  const parts = body.contents[0].parts;
  assert.equal(parts.filter((part: any) => part.inlineData).length, 2);
  assert.equal(body.generationConfig.responseMimeType, "application/json");
  assert.equal(result.passed, false); // 필수 항목 대부분이 응답에 없다.
  assert.ok(result.failed.some((item) => item.note === "응답에 없음"));
});

test("검수 요청이 실패하면 상태 코드를 담아 오류를 낸다", async () => {
  const failing = (async () => ({ ok: false, status: 500, text: async () => "boom" })) as unknown as typeof fetch;
  await assert.rejects(new GeminiCritic("k", "m", failing).critique({ image: image(1), useType: "cafe" }), /500/);
});

import { judgeMeasurements } from "./geminiCritic";

test("추정 길이가 기준표 값보다 작으면 모델이 통과라고 해도 실패로 판정한다", () => {
  const items = judgeMeasurements({ counter_front_m: 0.8, counter_back_m: 0.5, main_aisle_m: 1.3, front_empty_percent: 70 }, "cafe");
  const byId = Object.fromEntries(items.map((item) => [item.id, item]));
  assert.equal(byId.counter_front.pass, false);
  assert.equal(byId.counter_back.pass, false);
  assert.equal(byId.aisle_main.pass, true);
  assert.equal(byId.empty_zone.pass, false);
  assert.match(byId.counter_front.note, /1.2m 이상/);
});

test("업종에 맞지 않는 측정값은 판정하지 않는다", () => {
  const ids = judgeMeasurements({ counter_front_m: 1.5, counter_back_m: 0.2, main_aisle_m: 1.5, front_empty_percent: 10 }, "popup").map((item) => item.id);
  assert.ok(!ids.includes("counter_back")); // 카운터 뒤 통로는 카페만 본다.
});

test("측정값이 없으면 모델의 판단을 그대로 쓴다", () => {
  assert.deepEqual(judgeMeasurements(undefined, "cafe"), []);
});
