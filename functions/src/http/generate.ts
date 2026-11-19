// generateRender 본체. 공간 사진, 건축 선화, 배치, 상품 사진으로 렌더링을 만들고, 설계 기준으로 검수하고, 이미지 속 가구를 상품과 연결한다.
// 응답 형식은 docs/RENDER_API.md가 정한다.
import type { CriticImage, CritiqueResult } from "../adapters/geminiCritic";
import type { Located, TagTarget } from "../adapters/geminiLocator";
import type { ImageGenerationRequest, ImageGenerator } from "../adapters/imageGenerator";
import { computePlan, validatePlanInput, type PlanInput, type PlanItem, type PlanResponse } from "./plan";

export type StyleKey = "wood" | "white" | "industrial";

export interface GenerateInput extends PlanInput {
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
  return { input: { ...planned.input, code: data.code, spaceNumber: data.spaceNumber, style: data.style, attempts } };
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
  const [photo, edges] = await Promise.all([
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
    placed: plan.placed.filter((item) => !item.hanging || item.category === "lamp"),
    referenceImageUrls: [],
    spacePhoto: photo,
    structureImage: edges,
    structureKind: "edges",
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
