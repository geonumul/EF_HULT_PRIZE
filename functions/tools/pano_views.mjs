// 방 안 한 자리에서 찍은 모형 그림(방향별 PNG)을 Gemini로 사진 같은 이미지로 바꾼다.
// 앞서 만든 방향의 결과를 다음 방향의 참고 이미지로 넣어 재질과 조명이 이어지게 한다.
//   node functions/tools/pano_views.mjs <모형그림 폴더> <스타일 참고 사진> <출력 폴더> [업종] [방향들 예: 0,90,180,270]
// GEMINI_API_KEY는 functions/.env에서 읽는다. 이미지 한 장에 약 50원이다.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const [viewsDir, referencePath, outDir, use = "a cafe", yawText = "0,90,180,270"] = process.argv.slice(2);
if (!viewsDir || !referencePath || !outDir) {
  console.error("사용: node pano_views.mjs <모형그림 폴더> <스타일 참고 사진> <출력 폴더> [업종] [방향들]");
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(resolve(import.meta.dirname, "../.env"), "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim()]),
);
const KEY = env.GEMINI_API_KEY;
const MODEL = env.GEMINI_IMAGE_MODEL || "gemini-nano-banana-2.1";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";

const image = (path) => ({ type: "image", mime_type: path.endsWith(".png") ? "image/png" : "image/jpeg", data: readFileSync(path).toString("base64") });

function promptFor(index) {
  return [
    `Photorealistic interior photograph of ${use}. Several photos are taken from the same standing point while turning around, so all of them must share the same room, materials, color palette, lighting and time of day.`,
    "The FIRST attached image is a rough 3D model render of the view to photograph. It fixes the camera, perspective, scale and the position and size of every wall, column, door, window, light and piece of furniture: keep all of them exactly where they are, add nothing and remove nothing.",
    "The SECOND attached image is a reference photo of the same room. Copy its materials, finishes, furniture design, concrete columns, floor, lighting mood and color palette.",
    index > 0 ? "The THIRD attached image is the previous view of this same room, already finished. Keep its materials and lighting identical." : "",
    "Where the model render shows a plain wall, draw a believable wall of the same material as the reference. Replace the flat colors of the model render with real materials. No people, no text, no watermark.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function generate(input) {
  const send = (withFormat) =>
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "x-goog-api-key": KEY, "Api-Revision": "2026-05-20", "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, input, ...(withFormat ? { response_format: { type: "image", aspect_ratio: "4:3" } } : {}) }),
    });
  let response = await send(true);
  if (response.status === 400) response = await send(false);
  if (!response.ok) throw new Error(`${response.status} ${(await response.text()).slice(0, 200)}`);
  const found = findImage(await response.json());
  if (!found) throw new Error("응답에 이미지가 없습니다.");
  return found;
}

function findImage(node) {
  if (!node || typeof node !== "object") return null;
  const inline = node.inlineData ?? node.inline_data;
  if (inline && typeof inline.data === "string") return { data: inline.data, mime: inline.mimeType ?? inline.mime_type ?? "image/png" };
  if (node.type === "image" && typeof node.data === "string") return { data: node.data, mime: node.mime_type ?? node.mimeType ?? "image/png" };
  for (const value of Object.values(node)) {
    const found = findImage(value);
    if (found) return found;
  }
  return null;
}

mkdirSync(outDir, { recursive: true });
let previous = null;
for (const [index, yaw] of yawText.split(",").entries()) {
  const modelPath = resolve(viewsDir, `view-${yaw}.png`);
  const outPath = resolve(outDir, `view-${yaw}.jpg`);
  if (existsSync(outPath)) {
    console.log(`건너뜀 ${yaw}`);
    previous = outPath;
    continue;
  }
  const input = [{ type: "text", text: promptFor(index) }, image(modelPath), image(resolve(referencePath))];
  if (previous) input.push(image(previous));
  try {
    const result = await generate(input);
    writeFileSync(outPath, Buffer.from(result.data, "base64"));
    previous = outPath;
    console.log(`저장 ${yaw} -> ${outPath}`);
  } catch (error) {
    console.error(`실패 ${yaw}: ${error.message}`);
  }
}
