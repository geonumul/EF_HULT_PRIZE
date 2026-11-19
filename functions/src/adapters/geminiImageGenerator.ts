// Gemini 이미지 모델로 렌더링을 만든다. 공간 사진이 있으면 참고 이미지로 넣고, 치수 검증을 통과한 배치를 글로 설명해 그대로 그리게 한다.
// 키는 GEMINI_API_KEY, 모델은 GEMINI_IMAGE_MODEL(기본 gemini-nano-banana-2.1)이다. 가격은 이미지 한 장에 약 $0.034(1K)다.
import type { PlacedItem } from "../pipeline/layout";
import type { GeneratedImage, ImageGenerationRequest, ImageGenerator } from "./imageGenerator";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const API_REVISION = "2026-05-20";
const DEFAULT_MODEL = "gemini-nano-banana-2.1";
const ASPECT_RATIO = "16:9";

const USE_NAMES: Record<string, string> = {
  cafe: "a cafe",
  popup: "a pop-up store",
  pilates: "a pilates studio",
  restaurant: "a restaurant",
  retail: "a retail shop",
  service: "a service shop",
  office: "an office",
};

type FetchLike = typeof fetch;

/** 배치된 집기를 "이름 x 개수, 위치" 문장으로 줄인다. 위치는 방 안의 대략적인 방향이다. */
export function describeItems(request: Pick<ImageGenerationRequest, "room" | "placed">): string {
  const groups = new Map<string, PlacedItem[]>();
  for (const item of request.placed) groups.set(item.name, [...(groups.get(item.name) ?? []), item]);

  const lines: string[] = [];
  for (const [name, items] of groups) {
    const x = items.reduce((sum, item) => sum + item.x + item.widthMm / 2, 0) / items.length / request.room.widthMm;
    const y = items.reduce((sum, item) => sum + item.y + item.depthMm / 2, 0) / items.length / request.room.depthMm;
    const side = x < 0.34 ? "left" : x > 0.66 ? "right" : "center";
    const depth = y < 0.34 ? "far from the camera" : y > 0.66 ? "near the camera" : "in the middle";
    lines.push(`- ${name} x ${items.length}, mostly ${side}, ${depth}`);
  }
  return lines.join("\n");
}

export function buildPrompt(request: ImageGenerationRequest): string {
  const use = USE_NAMES[request.useType] ?? "a small business";
  const room = request.room;
  const size = `${(room.widthMm / 1000).toFixed(1)}m wide, ${(room.depthMm / 1000).toFixed(1)}m deep, ${(room.ceilingMm / 1000).toFixed(1)}m ceiling`;
  return [
    `Redesign this empty commercial space in Seoul as ${use}.`,
    request.spacePhoto
      ? "Keep the walls, windows, door, floor, ceiling and the camera angle exactly as in the photo."
      : "Show the space from the entrance looking inward.",
    request.structureImage
      ? "One attached image is a rough 3D clay render of this room. It shows the exact camera, perspective, scale and position of every object. Turn it into a photorealistic photo and keep every object at the same place, size and perspective as in the clay render. Do not move or add objects. The dark rectangle on the back wall is a 0.9 m wide, 2.1 m tall door that marks the human scale: keep every piece of furniture proportioned to it (table top about 0.72 m, bar counter about 1.0 m, chair seat about 0.45 m)."
      : "",
    request.referenceImages?.length
      ? `Attached product photos (${request.referenceImages.map((image) => image.label).join(", ")}) show the exact appearance of the furniture. Draw the matching objects in the room to look like these products.`
      : "",
    `Room size: ${size}. Do not add more furniture than listed.`,
    "Furniture to place, with the real products as references where provided:",
    describeItems(request),
    request.prompt ? `Extra request: ${request.prompt}` : "",
    "Photorealistic interior photograph, natural daylight, no people, no text, no watermark.",
  ]
    .filter(Boolean)
    .join("\n");
}

/** 응답 JSON 어디에 있든 첫 이미지 블록(base64)을 찾는다. 응답 형식이 바뀌어도 읽을 수 있게 한다. */
export function extractImage(node: unknown): { data: string; mimeType: string } | null {
  if (!node || typeof node !== "object") return null;
  const record = node as Record<string, unknown>;
  const inline = (record.inlineData ?? record.inline_data) as Record<string, unknown> | undefined;
  if (inline && typeof inline.data === "string") {
    return { data: inline.data, mimeType: String(inline.mimeType ?? inline.mime_type ?? "image/png") };
  }
  if (record.type === "image" && typeof record.data === "string") {
    return { data: record.data, mimeType: String(record.mime_type ?? record.mimeType ?? "image/png") };
  }
  for (const value of Object.values(record)) {
    const found = extractImage(value);
    if (found) return found;
  }
  return null;
}

export class GeminiImageGenerator implements ImageGenerator {
  constructor(
    private readonly apiKey: string,
    private readonly model: string = DEFAULT_MODEL,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async generate(request: ImageGenerationRequest): Promise<GeneratedImage> {
    const input: Array<Record<string, string>> = [{ type: "text", text: buildPrompt(request) }];
    if (request.spacePhoto) {
      input.push({
        type: "image",
        mime_type: request.spacePhoto.contentType,
        data: Buffer.from(request.spacePhoto.bytes).toString("base64"),
      });
    }

    for (const image of [request.structureImage, ...(request.referenceImages ?? [])]) {
      if (!image) continue;
      input.push({ type: "image", mime_type: image.contentType, data: Buffer.from(image.bytes).toString("base64") });
    }

    // 구조 그림과 같은 가로 비율로 받는다. 이 옵션을 거부하면(400) 옵션 없이 다시 요청한다.
    const send = (withFormat: boolean) =>
      this.fetchImpl(ENDPOINT, {
        method: "POST",
        headers: { "x-goog-api-key": this.apiKey, "Api-Revision": API_REVISION, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          input,
          ...(withFormat ? { response_format: { type: "image", aspect_ratio: ASPECT_RATIO } } : {}),
        }),
      });
    let response = await send(true);
    if (response.status === 400) response = await send(false);
    if (!response.ok) {
      const body = (await response.text()).slice(0, 300);
      throw new Error(`이미지 생성 요청이 실패했습니다(${response.status}). ${body}`);
    }

    const image = extractImage(await response.json());
    if (!image) throw new Error("이미지 생성 응답에서 이미지를 찾지 못했습니다.");
    return { bytes: Buffer.from(image.data, "base64"), contentType: image.mimeType };
  }
}
