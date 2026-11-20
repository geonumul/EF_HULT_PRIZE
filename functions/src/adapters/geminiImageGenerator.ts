// Gemini 이미지 모델로 렌더링을 만든다. 공간 사진이 있으면 참고 이미지로 넣고, 치수 검증을 통과한 배치를 글로 설명해 그대로 그리게 한다.
// 키는 GEMINI_API_KEY, 모델은 GEMINI_IMAGE_MODEL(기본 gemini-nano-banana-2.1)이다. 가격은 이미지 한 장에 약 $0.034(1K)다.
import { ruleOf } from "../pipeline/knowledge";
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

const CAMERA_HEIGHT_M = (ruleOf("camera.height").value as number) / 1000;
const LENS_MM = ruleOf("camera.lens").min as number;
const COLOR_TEMP_K = ruleOf("light.color").max as number;

/** 업종마다 달라지는 계획 특징. 기준표의 조사 결과에서 가져온다. */
const COUNTER_FRONT_M = (ruleOf("counter.front").value as number) / 1000;
const COUNTER_BACK_M = (ruleOf("counter.back").value as number) / 1000;
const WALL_SEAT_M = (ruleOf("wall.seat").value as number) / 1000;

const USE_TRAITS: Record<string, string> = {
  cafe: `The service counter stands clear of the wall with a ${COUNTER_BACK_M} m walkway behind it for staff, so do not push the counter against the wall. Keep at least ${COUNTER_FRONT_M} m of clear floor between the front of the counter and the nearest table. Pull the tables and chairs away from the walls and windows: leave at least ${WALL_SEAT_M} m between the wall or glass and the back of any chair so people can sit down and walk behind them, and never push a chair or table against the glass. Keep a clear main aisle from the entrance to the counter. Warm pendant lights hang about 0.8 m above the table tops.`,
  pilates: `Reformers are lined up with about 0.9 m of clear space between them and at least ${WALL_SEAT_M} m from the walls. One wall is a full-height mirror. Light wooden floor, ceiling at least 2.7 m, bright even lighting.`,
  popup: `Spread the displays over the whole depth of the room and do not leave the foreground empty: wall shelves along the back wall, free-standing display tables in the middle, and the checkout counter near the entrance with at least ${COUNTER_FRONT_M} m of clear floor in front of it. Aisles are about 1.2 m wide. Display tables stay low so sight lines stay open. Track spot lights accent the displays.`,
};

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

/** 구조 가이드 이미지를 어떻게 쓸지 알려 주는 문장 */
function structureText(kind: ImageGenerationRequest["structureKind"]): string {
  if (kind === "guide") {
    return [
      "One attached image is a guide drawing made from the photo, seen from the same camera. The thin black lines are the existing room architecture (walls, columns, beams, stairs, windows, ceiling): keep every one of them at exactly the same position and size as in the photo, with the same camera position, framing and field of view. Do not zoom out or show more of the room than the photo shows.",
      "The solid colored boxes in the drawing mark exactly where each piece of furniture must stand, with the same size and perspective. Replace every box with a real, photorealistic piece of furniture of that footprint and height, and draw no colored box in the final photo:",
      "- brown box = service bar counter; blue box = pastry display case; orange flat disc = the top of a round cafe table (about 0.7 m diameter, 0.72 m high, with a slim pedestal leg underneath); green boxes = chairs placed around the table they touch (seat height 0.45 m, backrest facing away from the table); purple boxes = low display tables; dark blue boxes = shelving units; red boxes = pilates reformer machines; yellow small boxes high up = pendant lamps hanging from the ceiling; grey tall boxes = existing concrete columns (keep them as concrete columns).",
      "The marker colors only label what each box is: never reproduce them. Use natural materials for all furniture (oak wood, concrete, steel, fabric, glass) and keep the walls, floor and ceiling in the colors of the original photo.",
      "Place exactly the furniture shown, no extra furniture and none missing, and do not move any of it.",
    ].join(" ");
  }
  if (kind === "edges") {
    return "One attached image is a line drawing of the existing room architecture. Every wall, window, door, column, beam, duct and ceiling structure in your photo must be at exactly the same position and size as the lines in that drawing, seen from the same camera. Keep exactly the same camera position, framing and field of view as the original photo and do not zoom out or show more of the room than the photo shows. Do not move, add or remove any architectural element. Only add furniture, equipment, decor and lighting fixtures inside the room.";
  }
  return "One attached image is a rough 3D clay render of this room. It shows the exact camera, perspective, scale and position of every object. Turn it into a photorealistic photo and keep every object at the same place, size and perspective as in the clay render. Do not move or add objects. The dark rectangle on the back wall is a 0.9 m wide, 2.1 m tall door that marks the human scale: keep every piece of furniture proportioned to it (table top about 0.72 m, bar counter about 1.0 m, chair seat about 0.45 m).";
}

/** 고객이 올린 분위기 사진을 어떻게 쓸지 알려 주는 문장. 마지막에 붙은 이미지들이 그 사진이다. */
function moodText(request: Pick<ImageGenerationRequest, "moodImages">): string {
  const count = request.moodImages?.length ?? 0;
  if (count === 0) return "";
  return `The last ${count} attached image${count > 1 ? "s are" : " is"} mood reference photo${count > 1 ? "s" : ""} chosen by the customer. Adopt their atmosphere: color palette, materials, finishes, lighting mood and decor style, and apply it to the furniture, walls, floor and lighting of this room. Do not copy their room layout, architecture or objects, and keep the room structure and the furniture positions exactly as specified above.`;
}

/** 기준 이미지의 구도와 가구는 그대로 두고 스타일만 바꾸는 요청 */
export function buildRestylePrompt(request: ImageGenerationRequest): string {
  const use = USE_NAMES[request.useType] ?? "a small business";
  return [
    `This photo shows the interior of ${use}.`,
    "Keep the exact same room, architecture, camera position, lens, viewing angle, furniture, equipment and decor placement. Keep the number of every object the same.",
    `Change only the materials, finishes, colors and lighting to this style: ${request.prompt}.`,
    "Photorealistic interior photograph, no people, no text, no watermark.",
  ].join("\n");
}

export function buildPrompt(request: ImageGenerationRequest): string {
  if (request.mode === "restyle") return buildRestylePrompt(request);
  const use = USE_NAMES[request.useType] ?? "a small business";
  const room = request.room;
  const size = `${(room.widthMm / 1000).toFixed(1)}m wide, ${(room.depthMm / 1000).toFixed(1)}m deep, ${(room.ceilingMm / 1000).toFixed(1)}m ceiling`;
  return [
    `Redesign this empty commercial space in Seoul as ${use}.`,
    request.spacePhoto
      ? "Keep the walls, windows, door, floor, ceiling and the camera angle exactly as in the photo."
      : "Show the space from the entrance looking inward.",
    request.structureImage ? structureText(request.structureKind) : "",
    request.referenceImages?.length
      ? `Attached product photos (${request.referenceImages.map((image) => image.label).join(", ")}) show the exact appearance of the furniture. Draw the matching objects in the room to look like these products.`
      : "",
    `Room size: ${size}. Do not add more furniture than listed.`,
    "Furniture to place, with the real products as references where provided:",
    describeItems(request),
    request.prompt ? `Extra request: ${request.prompt}` : "",
    moodText(request),
    "Keep the area just inside the entrance clear and keep every aisle at least 0.9 m wide.",
    USE_TRAITS[request.useType] ?? "",
    `Interior photograph taken at eye level about ${CAMERA_HEIGHT_M} m, ${LENS_MM}mm equivalent lens, camera level with vertical lines straight and parallel (two-point perspective), no fisheye or barrel distortion, natural proportions.`,
    `Soft natural daylight from the storefront window with warm ${COLOR_TEMP_K}K interior lighting and high color rendering. Photorealistic, no people, no text, no watermark.`,
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

    for (const image of [request.structureImage, ...(request.referenceImages ?? []), ...(request.moodImages ?? [])]) {
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
          ...(withFormat ? { response_format: { type: "image", aspect_ratio: request.aspectRatio ?? ASPECT_RATIO } } : {}),
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
