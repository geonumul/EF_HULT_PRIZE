// HTTP 함수의 본체. 요청 검증, 접근 코드, 하루 호출 한도를 처리하고 plan, generate를 부른다.
// firebase-functions에 의존하지 않아 테스트하기 쉽다. 연결은 src/index.ts가 한다.
import { timingSafeEqual } from "node:crypto";
import { GeminiCritic } from "../adapters/geminiCritic";
import { GeminiImageGenerator } from "../adapters/geminiImageGenerator";
import { GeminiLocator } from "../adapters/geminiLocator";
import { generateRender, isAllowedAssetPath, validateGenerateInput, type GenerateDeps } from "./generate";
import { computePlan, validatePlanInput } from "./plan";

export interface HttpResult {
  status: number;
  body: unknown;
}

/** 하루 호출 수를 센다. 함수 인스턴스 안에서만 세므로 완전한 한도는 아니고 비용이 새는 것을 막는 안전장치다. */
export class DailyLimiter {
  private day = "";
  private count = 0;

  constructor(private readonly limit: number) {}

  take(now: Date = new Date()): boolean {
    const today = now.toISOString().slice(0, 10);
    if (today !== this.day) {
      this.day = today;
      this.count = 0;
    }
    if (this.count >= this.limit) return false;
    this.count += 1;
    return true;
  }
}

export function handlePlan(body: unknown): HttpResult {
  const checked = validatePlanInput(body);
  if ("error" in checked) return { status: 400, body: { error: checked.error } };
  return { status: 200, body: computePlan(checked.input) };
}

function sameCode(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const CONTENT_TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };

/** 사이트의 정적 이미지를 읽는 함수. 허용된 경로만 받는다. */
export function siteAssetFetcher(origin: string, fetchImpl: typeof fetch = fetch): GenerateDeps["fetchAsset"] {
  return async (path) => {
    if (!isAllowedAssetPath(path)) throw new Error(`허용되지 않은 경로입니다: ${path}`);
    const response = await fetchImpl(`${origin}${path}`);
    if (!response.ok) throw new Error(`이미지를 읽지 못했습니다(${response.status}): ${path}`);
    const extension = path.split(".").pop() ?? "jpg";
    return { bytes: new Uint8Array(await response.arrayBuffer()), contentType: CONTENT_TYPES[extension] ?? "image/jpeg" };
  };
}

export interface GenerateContext {
  /** 서버에 설정된 접근 코드(DEMO_RENDER_CODE). 없으면 기능이 꺼진 것이다. */
  accessCode: string | undefined;
  apiKey: string | undefined;
  siteOrigin: string;
  limiter: DailyLimiter;
  /** 테스트에서 가짜 의존성을 넣는다. 없으면 Gemini 어댑터를 만든다. */
  deps?: GenerateDeps;
}

export async function handleGenerate(body: unknown, context: GenerateContext): Promise<HttpResult> {
  if (!context.accessCode || !context.apiKey) return { status: 503, body: { error: "렌더링 생성이 켜져 있지 않습니다." } };
  const checked = validateGenerateInput(body);
  if ("error" in checked) return { status: 400, body: { error: checked.error } };
  if (!sameCode(checked.input.code, context.accessCode)) return { status: 401, body: { error: "접근 코드가 맞지 않습니다." } };
  if (!context.limiter.take()) return { status: 429, body: { error: "오늘 만들 수 있는 렌더링 횟수를 모두 썼습니다." } };

  const deps =
    context.deps ??
    ({
      generator: new GeminiImageGenerator(context.apiKey),
      critic: new GeminiCritic(context.apiKey),
      locator: new GeminiLocator(context.apiKey),
      fetchAsset: siteAssetFetcher(context.siteOrigin),
    } satisfies GenerateDeps);

  try {
    return { status: 200, body: await generateRender(checked.input, deps) };
  } catch (error) {
    return { status: 500, body: { error: `렌더링을 만들지 못했습니다. ${error instanceof Error ? error.message.slice(0, 200) : ""}`.trim() } };
  }
}
