// 주변 건물 프록시: 좌표 검증, 서버 순서 시도, 저장
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { clearNeighborCache, fetchNeighborElements, validateNeighborQuery, type FetchLike } from "./neighbors";

beforeEach(() => clearNeighborCache());

test("한국 안의 좌표만 받는다", () => {
  assert.deepEqual(validateNeighborQuery({ lat: "37.5446", lng: "127.0557" }), { lat: 37.5446, lng: 127.0557 });
  assert.ok("error" in validateNeighborQuery({ lat: 40.7, lng: -74 }));
  assert.ok("error" in validateNeighborQuery({ lat: "abc", lng: 127 }));
  assert.ok("error" in validateNeighborQuery({}));
});

test("첫 서버가 막히면 다음 서버를 시도하고, 같은 좌표는 저장한 것을 쓴다", async () => {
  const urls: string[] = [];
  const fake: FetchLike = async (url) => {
    urls.push(url);
    if (urls.length === 1) return { ok: false, status: 406, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => ({ elements: [{ id: 1 }, { id: 2 }] }) };
  };
  const first = await fetchNeighborElements(37.5446, 127.0557, fake);
  assert.equal(first.length, 2);
  assert.equal(urls.length, 2);
  const second = await fetchNeighborElements(37.5446, 127.0557, fake);
  assert.equal(second.length, 2);
  assert.equal(urls.length, 2); // 두 번째는 저장된 값
});

test("모든 서버가 실패하면 오류다", async () => {
  const fake: FetchLike = async () => ({ ok: false, status: 504, json: async () => ({}) });
  await assert.rejects(fetchNeighborElements(37.5, 127.0, fake));
});
