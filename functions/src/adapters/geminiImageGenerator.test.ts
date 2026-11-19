// Gemini 이미지 어댑터. 실제 호출 없이 가짜 fetch로 요청 모양과 응답 읽기를 검사한다.
import assert from "node:assert/strict";
import { test } from "node:test";
import { GeminiImageGenerator, buildPrompt, describeItems, extractImage } from "./geminiImageGenerator";
import type { ImageGenerationRequest } from "./imageGenerator";

const request: ImageGenerationRequest = {
  prompt: "조명 더 밝게",
  useType: "cafe",
  room: { widthMm: 6000, depthMm: 6600, ceilingMm: 3200 },
  placed: [
    { productId: "t1", name: "원목 테이블", kind: "table", widthMm: 600, depthMm: 600, chairs: 2, chairProductId: null, x: 500, y: 5500 },
    { productId: "c1", name: "바 카운터", kind: "fixture", widthMm: 1800, depthMm: 600, chairs: 0, chairProductId: null, x: 4000, y: 300 },
  ],
  referenceImageUrls: [],
};

test("배치를 방향이 있는 문장으로 설명한다", () => {
  const text = describeItems(request);
  assert.match(text, /원목 테이블 x 1, mostly left, near the camera/);
  assert.match(text, /바 카운터 x 1, mostly right, far from the camera/);
});

test("사진이 있으면 벽과 창을 그대로 두라고 요청한다", () => {
  const withPhoto = buildPrompt({ ...request, spacePhoto: { bytes: new Uint8Array([1]), contentType: "image/jpeg" } });
  assert.match(withPhoto, /Keep the walls, windows, door/);
  assert.match(buildPrompt(request), /6.0m wide, 6.6m deep, 3.2m ceiling/);
  assert.match(buildPrompt(request), /a cafe/);
});

test("응답 어디에 있든 이미지 블록을 찾는다", () => {
  const nested = { steps: [{ type: "model_output", content: [{ type: "text", text: "ok" }, { type: "image", mime_type: "image/jpeg", data: "AAAA" }] }] };
  assert.deepEqual(extractImage(nested), { data: "AAAA", mimeType: "image/jpeg" });
  const legacy = { candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: "BBBB" } }] } }] };
  assert.deepEqual(extractImage(legacy), { data: "BBBB", mimeType: "image/png" });
  assert.equal(extractImage({ steps: [] }), null);
});

test("키와 모델과 사진을 담아 요청하고 이미지를 돌려준다", async () => {
  let seen: { url: string; headers: Record<string, string>; body: any } | null = null;
  const fakeFetch = (async (url: string, init: any) => {
    seen = { url, headers: init.headers, body: JSON.parse(init.body) };
    return { ok: true, status: 200, json: async () => ({ output_image: null, steps: [{ content: [{ type: "image", mime_type: "image/png", data: Buffer.from("png-bytes").toString("base64") }] }] }) };
  }) as unknown as typeof fetch;

  const generator = new GeminiImageGenerator("secret", "test-model", fakeFetch);
  const image = await generator.generate({ ...request, spacePhoto: { bytes: new Uint8Array([9, 9]), contentType: "image/jpeg" } });

  assert.equal(Buffer.from(image.bytes).toString(), "png-bytes");
  assert.equal(image.contentType, "image/png");
  assert.equal(seen!.headers["x-goog-api-key"], "secret");
  assert.equal(seen!.body.model, "test-model");
  assert.equal(seen!.body.input[1].type, "image");
});

test("요청이 실패하면 상태 코드를 담아 오류를 낸다. 키는 오류 글에 없다", async () => {
  const failing = (async () => ({ ok: false, status: 429, text: async () => "quota" })) as unknown as typeof fetch;
  const generator = new GeminiImageGenerator("secret-key", "m", failing);
  await assert.rejects(generator.generate(request), (error: Error) => error.message.includes("429") && !error.message.includes("secret-key"));
});

test("구조 그림과 상품 사진은 이미지 입력으로 뒤에 붙고 프롬프트에 설명이 들어간다", async () => {
  let body: any = null;
  const fakeFetch = (async (_url: string, init: any) => {
    body = JSON.parse(init.body);
    return { ok: true, status: 200, json: async () => ({ steps: [{ content: [{ type: "image", mime_type: "image/png", data: "QUJD" }] }] }) };
  }) as unknown as typeof fetch;
  const image = (value: number) => ({ bytes: new Uint8Array([value]), contentType: "image/png" });

  await new GeminiImageGenerator("k", "m", fakeFetch).generate({
    ...request,
    structureImage: image(1),
    referenceImages: [{ label: "oak chair", ...image(2) }],
  });

  assert.match(body.input[0].text, /clay render/);
  assert.match(body.input[0].text, /oak chair/);
  assert.equal(body.input.filter((block: any) => block.type === "image").length, 2);
});

test("비율 옵션을 거부하면 옵션 없이 다시 요청한다", async () => {
  const bodies: any[] = [];
  const flaky = (async (_url: string, init: any) => {
    const body = JSON.parse(init.body);
    bodies.push(body);
    if (body.response_format) return { ok: false, status: 400, text: async () => "bad option" };
    return { ok: true, status: 200, json: async () => ({ steps: [{ content: [{ type: "image", mime_type: "image/png", data: "QUJD" }] }] }) };
  }) as unknown as typeof fetch;

  const image = await new GeminiImageGenerator("k", "m", flaky).generate(request);
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0].response_format.aspect_ratio, "16:9");
  assert.equal(bodies[1].response_format, undefined);
  assert.equal(Buffer.from(image.bytes).toString(), "ABC");
});
