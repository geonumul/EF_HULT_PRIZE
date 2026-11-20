// generateRender 본체. 공간 사진, 건축 선화, 배치, 상품 사진으로 렌더링을 만들고, 설계 기준으로 검수하고, 이미지 속 가구를 상품과 연결한다.
// 응답 형식은 docs/RENDER_API.md가 정한다.
import type { CriticImage, CritiqueResult } from "../adapters/geminiCritic";
import type { Located, TagTarget } from "../adapters/geminiLocator";
import type { ImageGenerationRequest, ImageGenerator } from "../adapters/imageGenerator";
import { computePlan, validatePlanInput, type PlanInput, type PlanItem, type PlanResponse } from "./plan";

export type StyleKey = "wood" | "white" | "industrial";

/** 고친 배치를 사진과 같은 원근의 색 상자로 그린 가이드 그림. 브라우저가 그려서 보낸다(frontend/src/lib/guideRender.ts). */
export interface GuideInput {
  /** 공간 사진 번호. /images/spaces/guide/<번호>-photo.jpg가 가이드와 같은 범위로 자른 사진이다. */
  number: string;
  /** 가이드 그림 PNG(base64) */
  imageBase64: string;
  aspectRatio: string;
  /** 가이드에 그린 가구. 프롬프트의 가구 목록에 쓴다. */
  placed: Array<{ name: string; x: number; y: number; widthMm: number; depthMm: number }>;
}

export const MAX_GUIDE_BYTES = 3_000_000;
const ASPECTS = new Set(["3:2", "4:3", "16:9"]);

/** 고객이 올린 분위기 참고 사진. 브라우저에서 줄인 JPEG를 base64로 받는다. */
export interface MoodInput {
  images: string[];
}

export const MAX_MOOD_IMAGES = 2;
export const MAX_MOOD_BASE64 = 1_500_000;

export interface GenerateInput extends PlanInput {
  mood?: MoodInput;
  guide?: GuideInput;
  code: string;
  spaceNumber: string;
  style: StyleKey;
  attempts?: number;
}

export interface RenderTagResult {
  n: number;
  x: number;
  y: number;
  productId: string;
  qty: number;
}

export interface GenerateResponse {
  imageDataUrl: string;
  tags: RenderTagResult[];
  plan: PlanResponse;
  critique: { passed: boolean; score: number; total: number; failed: Array<{ id: string; note: string }> };
  attempts: number;
}

export interface GenerateDeps {
  generator: ImageGenerator;
  critic: { critique(params: { image: CriticImage; original?: CriticImage; useType: string }): Promise<CritiqueResult> };
  locator: { locate(image: CriticImage, targets: TagTarget[]): Promise<Located[]> };
  /** 사이트의 정적 이미지(공간 사진, 선화, 상품 사진)를 읽는다. 허용된 경로만 받는다. */
  fetchAsset(path: string): Promise<CriticImage>;
}

export const STYLE_PROMPTS: Record<StyleKey, string> = {
  wood: "Style: warm natural wood tones, oak furniture, warm lighting",
  white: "Style: white minimal, white walls, light oak furniture, bright clean Scandinavian feel",
  industrial: "Style: industrial, exposed concrete and black steel, dark metal pendant lights, leather and dark wood",
};

const MAX_REFERENCES = 4;
const ASSET_PATH = /^\/images\/[A-Za-z0-9._/-]+\.(jpg|jpeg|png)$/;

export function isAllowedAssetPath(path: string): boolean {
  return ASSET_PATH.test(path) && !path.includes("..");
}

export function validateGenerateInput(body: unknown): { input: GenerateInput } | { error: string } {
  const planned = validatePlanInput(body);
  if ("error" in planned) return planned;
  const data = body as Partial<GenerateInput>;
  if (typeof data.code !== "string") return { error: "접근 코드가 필요합니다." };
  if (typeof data.spaceNumber !== "string" || !/^(0[1-9]|1[0-2])$/.test(data.spaceNumber)) return { error: "spaceNumber는 01부터 12까지입니다." };
  if (data.style !== "wood" && data.style !== "white" && data.style !== "industrial") return { error: "style이 올바르지 않습니다." };
  const attempts = data.attempts === undefined ? 2 : Number(data.attempts);
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 2) return { error: "attempts는 1 또는 2입니다." };
  for (const item of planned.input.items ?? []) {
    if (item.imagePath !== undefined && (typeof item.imagePath !== "string" || !isAllowedAssetPath(item.imagePath))) return { error: "imagePath가 올바르지 않습니다." };
  }
  const mood = (body as { mood?: unknown }).mood;
  let checkedMood: MoodInput | undefined;
  if (mood !== undefined) {
    const images = (mood as Partial<MoodInput>).images;
    if (!Array.isArray(images) || images.length === 0 || images.length > MAX_MOOD_IMAGES) return { error: `mood.images는 1~${MAX_MOOD_IMAGES}장입니다.` };
    if (images.some((image) => typeof image !== "string" || !/^[A-Za-z0-9+/=]+$/.test(image) || image.length > MAX_MOOD_BASE64)) return { error: "mood.images가 올바르지 않습니다." };
    checkedMood = { images: images as string[] };
  }
  const guide = (body as { guide?: unknown }).guide;
  let checkedGuide: GuideInput | undefined;
  if (guide !== undefined) {
    const g = guide as Partial<GuideInput>;
    if (typeof g.number !== "string" || !/^(0[1-9]|1[0-2])$/.test(g.number)) return { error: "guide.number가 올바르지 않습니다." };
    if (typeof g.imageBase64 !== "string" || !/^[A-Za-z0-9+/=]+$/.test(g.imageBase64) || g.imageBase64.length > MAX_GUIDE_BYTES * 1.4) return { error: "guide.imageBase64가 올바르지 않습니다." };
    if (typeof g.aspectRatio !== "string" || !ASPECTS.has(g.aspectRatio)) return { error: "guide.aspectRatio가 올바르지 않습니다." };
    if (!Array.isArray(g.placed) || g.placed.length > 60) return { error: "guide.placed가 올바르지 않습니다." };
    const placed = g.placed.map((item) => ({ name: String(item?.name ?? "").slice(0, 40), x: Number(item?.x), y: Number(item?.y), widthMm: Number(item?.widthMm), depthMm: Number(item?.depthMm) }));
    if (placed.some((item) => ![item.x, item.y, item.widthMm, item.depthMm].every(Number.isFinite) || !item.name)) return { error: "guide.placed의 값이 올바르지 않습니다." };
    checkedGuide = { number: g.number, imageBase64: g.imageBase64, aspectRatio: g.aspectRatio, placed };
  }
  return { input: { ...planned.input, ...(checkedMood ? { mood: checkedMood } : {}), ...(checkedGuide ? { guide: checkedGuide } : {}), code: data.code, spaceNumber: data.spaceNumber, style: data.style, attempts } };
}

/** 참고 이미지로 쓸 상품: 종류마다 하나, 최대 4개 */
function pickReferences(items: PlanItem[]): PlanItem[] {
  const picked: PlanItem[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (!item.imagePath || seen.has(item.category)) continue;
    seen.add(item.category);
    picked.push(item);
    if (picked.length >= MAX_REFERENCES) break;
  }
  return picked;
}

export async function generateRender(input: GenerateInput, deps: GenerateDeps): Promise<GenerateResponse> {
  const plan = computePlan(input);
  const guide = input.guide;
  const [photo, edges] = guide
    ? [
        await deps.fetchAsset(`/images/spaces/guide/${guide.number}-photo.jpg`),
        { bytes: new Uint8Array(Buffer.from(guide.imageBase64, "base64")), contentType: "image/png" },
      ]
    : await Promise.all([
        deps.fetchAsset(`/images/spaces/space-${input.spaceNumber}.jpg`),
        deps.fetchAsset(`/images/spaces/edges/space-${input.spaceNumber}.png`),
      ]);

  const referenceImages: NonNullable<ImageGenerationRequest["referenceImages"]> = [];
  for (const item of pickReferences(input.items ?? [])) {
    try {
      referenceImages.push({ label: item.name, ...(await deps.fetchAsset(item.imagePath as string)) });
    } catch {
      // 참고 이미지를 못 읽어도 생성은 계속한다.
    }
  }

  const request: ImageGenerationRequest = {
    prompt: STYLE_PROMPTS[input.style],
    useType: input.useType,
    room: input.room,
    placed: guide ? (guide.placed as unknown as ImageGenerationRequest["placed"]) : plan.placed.filter((item) => !item.hanging || item.category === "lamp"),
    referenceImageUrls: [],
    spacePhoto: photo,
    structureImage: edges,
    structureKind: guide ? "guide" : "edges",
    ...(input.mood ? { moodImages: input.mood.images.map((data) => ({ bytes: new Uint8Array(Buffer.from(data, "base64")), contentType: "image/jpeg" })) } : {}),
    ...(guide ? { aspectRatio: guide.aspectRatio } : {}),
    referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
  };

  // 기준 체크리스트로 검수하고, 실패하면 정해진 횟수까지 다시 만든다. 가장 나은 것을 쓴다.
  const attempts = input.attempts ?? 2;
  let best: { image: CriticImage; result: CritiqueResult | null } | null = null;
  let used = 0;
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    used = attempt;
    try {
      const image = await deps.generator.generate(request);
      let result: CritiqueResult | null = null;
      try {
        result = await deps.critic.critique({ image, original: photo, useType: input.useType });
      } catch {
        // 검수가 실패하면 검수 없이 이 이미지를 쓴다.
      }
      const better = !best || (result?.passed && !best.result?.passed) || (result && best.result && result.passed === best.result.passed && result.score > best.result.score);
      if (better || !result) best = { image, result };
      if (!result || result.passed) break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!best) throw lastError instanceof Error ? lastError : new Error("이미지를 만들지 못했습니다.");

  // 이미지 속 가구를 상품과 잇는다. 위치를 못 찾아도 이미지는 돌려준다.
  const items = input.items ?? [];
  let tags: RenderTagResult[] = [];
  if (items.length > 0) {
    try {
      const located = await deps.locator.locate(best.image, items.map((item) => ({ id: item.productId, label: `${item.name} (${item.category})` })));
      let n = 0;
      tags = items.flatMap((item) => {
        const spot = located.find((entry) => entry.id === item.productId);
        if (!spot) return [];
        n += 1;
        return [{ n, x: Math.round(spot.x), y: Math.round(spot.y), productId: item.productId, qty: item.qty }];
      });
    } catch {
      tags = [];
    }
  }

  const result = best.result;
  return {
    imageDataUrl: `data:${best.image.contentType};base64,${Buffer.from(best.image.bytes).toString("base64")}`,
    tags,
    plan,
    critique: {
      passed: result?.passed ?? false,
      score: result?.score ?? 0,
      total: result?.items.length ?? 0,
      failed: (result?.failed ?? []).map((item) => ({ id: item.id, note: item.note })),
    },
    attempts: used,
  };
}
