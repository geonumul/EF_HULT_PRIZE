// generateRender와 HTTP 처리: 접근 코드, 한도, 입력 검증, 태그 연결, 재시도
import assert from "node:assert/strict";
import { test } from "node:test";
import type { CritiqueResult } from "../adapters/geminiCritic";
import type { ImageGenerationRequest } from "../adapters/imageGenerator";
import { generateRender, isAllowedAssetPath, validateGenerateInput, type GenerateDeps } from "./generate";
import { DailyLimiter, handleGenerate, handlePlan, siteAssetFetcher } from "./handlers";
import type { PlanItem } from "./plan";

const room = { widthMm: 8000, depthMm: 11200, ceilingMm: 3000 };
const items: PlanItem[] = [
  { productId: "table", name: "2인 테이블", category: "table", widthMm: 600, depthMm: 600, heightMm: 720, qty: 6, imagePath: "/images/prod-table.jpg" },
  { productId: "chair", name: "의자", category: "chair", widthMm: 450, depthMm: 450, heightMm: 780, qty: 12, imagePath: "/images/prod-chair.jpg" },
  { productId: "counter", name: "바 카운터", category: "counter", widthMm: 2400, depthMm: 600, heightMm: 1000, qty: 1, imagePath: "/images/prod-counter.jpg" },
];

const png = { bytes: new Uint8Array([1, 2, 3]), contentType: "image/jpeg" };
const passing: CritiqueResult = { items: [{ id: "scale", pass: true, note: "" }], passed: true, score: 1, failed: [] };
const failing: CritiqueResult = { items: [{ id: "counter_back", pass: false, note: "벽에 붙음" }], passed: false, score: 0, failed: [{ id: "counter_back", pass: false, note: "벽에 붙음" }] };

function makeDeps(results: CritiqueResult[], seen: { requests: ImageGenerationRequest[]; assets: string[] } = { requests: [], assets: [] }): GenerateDeps {
  let call = 0;
  return {
    generator: { generate: async (request) => { seen.requests.push(request); return png; } },
    critic: { critique: async () => results[Math.min(call++, results.length - 1)] },
    locator: { locate: async (_image, targets) => targets.filter((target) => target.id !== "chair").map((target, index) => ({ id: target.id, x: 20 + index * 30, y: 60 })) },
    fetchAsset: async (path) => { seen.assets.push(path); return png; },
  };
}

const body = { room, useType: "cafe", items, code: "abc12345", spaceNumber: "02", style: "wood" };

test("허용된 이미지 경로만 받는다", () => {
  assert.ok(isAllowedAssetPath("/images/spaces/space-02.jpg"));
  assert.ok(!isAllowedAssetPath("/api/secret.json"));
  assert.ok(!isAllowedAssetPath("/images/../secret.jpg"));
  assert.ok(!isAllowedAssetPath("https://evil.example/a.jpg"));
});

test("입력 검증: 공간 번호, 스타일, 시도 횟수, 이미지 경로", () => {
  assert.ok("input" in validateGenerateInput(body));
  assert.ok("error" in validateGenerateInput({ ...body, spaceNumber: "13" }));
  assert.ok("error" in validateGenerateInput({ ...body, style: "neon" }));
  assert.ok("error" in validateGenerateInput({ ...body, attempts: 5 }));
  assert.ok("error" in validateGenerateInput({ ...body, items: [{ ...items[0], imagePath: "/etc/passwd" }] }));
});

test("generateRender: 검수에 통과하면 한 번에 끝나고 태그가 상품과 이어진다", async () => {
  const checked = validateGenerateInput(body);
  assert.ok("input" in checked);
  const seen = { requests: [] as ImageGenerationRequest[], assets: [] as string[] };
  const response = await generateRender((checked as { input: never }).input, makeDeps([passing], seen));
  assert.equal(response.attempts, 1);
  assert.equal(response.critique.passed, true);
  assert.ok(response.imageDataUrl.startsWith("data:image/jpeg;base64,"));
  assert.deepEqual(response.tags.map((tag) => tag.productId), ["table", "counter"]); // 의자는 위치를 못 찾았다.
  assert.deepEqual(response.tags.map((tag) => tag.n), [1, 2]);
  assert.equal(seen.requests[0].structureKind, "edges");
  assert.ok(seen.requests[0].spacePhoto && seen.requests[0].structureImage);
  assert.equal(seen.requests[0].referenceImages?.length, 3);
  assert.ok(seen.assets.includes("/images/spaces/space-02.jpg") && seen.assets.includes("/images/spaces/edges/space-02.png"));
  assert.equal(response.plan.violations.length, 0);
});

test("generateRender: 검수에 실패하면 한 번 더 만들고 둘 다 실패하면 그래도 하나를 돌려준다", async () => {
  const checked = validateGenerateInput(body) as { input: never };
  const response = await generateRender(checked.input, makeDeps([failing, failing]));
  assert.equal(response.attempts, 2);
  assert.equal(response.critique.passed, false);
  assert.equal(response.critique.failed[0].id, "counter_back");
});

test("generateRender: 이미지 생성이 계속 실패하면 오류를 낸다", async () => {
  const checked = validateGenerateInput(body) as { input: never };
  const deps = makeDeps([passing]);
  deps.generator = { generate: async () => { throw new Error("할당량 초과"); } };
  await assert.rejects(generateRender(checked.input, deps), /할당량/);
});

const context = (overrides: Partial<Parameters<typeof handleGenerate>[1]> = {}) => ({
  accessCode: "abc12345",
  apiKey: "key",
  siteOrigin: "https://example.test",
  limiter: new DailyLimiter(2),
  deps: makeDeps([passing]),
  ...overrides,
});

test("HTTP: 코드가 없거나 틀리면 거절한다", async () => {
  assert.equal((await handleGenerate(body, context({ accessCode: undefined }))).status, 503);
  assert.equal((await handleGenerate({ ...body, code: "wrong" }, context())).status, 401);
  assert.equal((await handleGenerate({ ...body, spaceNumber: "99" }, context())).status, 400);
});

test("HTTP: 하루 한도를 넘으면 429", async () => {
  const shared = context();
  assert.equal((await handleGenerate(body, shared)).status, 200);
  assert.equal((await handleGenerate(body, shared)).status, 200);
  assert.equal((await handleGenerate(body, shared)).status, 429);
});

test("HTTP: 한도는 날짜가 바뀌면 다시 센다", () => {
  const limiter = new DailyLimiter(1);
  assert.equal(limiter.take(new Date("2026-11-19T10:00:00Z")), true);
  assert.equal(limiter.take(new Date("2026-11-19T11:00:00Z")), false);
  assert.equal(limiter.take(new Date("2026-11-20T00:10:00Z")), true);
});

test("HTTP: planLayout은 입력 오류를 400으로 알리고 올바르면 배치를 돌려준다", () => {
  assert.equal(handlePlan({ room: { widthMm: 1 } }).status, 400);
  const ok = handlePlan({ room, useType: "cafe", items });
  assert.equal(ok.status, 200);
  assert.ok((ok.body as { placed: unknown[] }).placed.length > 0);
});

test("사이트 이미지 읽기는 허용 경로만 받고 오류 상태를 오류로 바꾼다", async () => {
  const fetcher = siteAssetFetcher("https://example.test", (async (url: string) => (url.endsWith("missing.jpg") ? { ok: false, status: 404 } : { ok: true, arrayBuffer: async () => new Uint8Array([9]).buffer })) as unknown as typeof fetch);
  assert.equal((await fetcher("/images/a.png")).contentType, "image/png");
  await assert.rejects(fetcher("/images/missing.jpg"), /404/);
  await assert.rejects(fetcher("/secret.json"), /허용되지 않은/);
});
