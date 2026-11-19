// Firebase 함수(planLayout, generateRender) 호출. 약속은 docs/RENDER_API.md.
// 실패해도 예외를 던지지 않고 { ok: false, status, error }로 돌려준다. status 0은 네트워크 오류다.

const PLAN_URL = process.env.NEXT_PUBLIC_PLAN_URL ?? "https://asia-northeast3-shopportunity-8e794.cloudfunctions.net/planLayout";
const GENERATE_URL = process.env.NEXT_PUBLIC_GENERATE_URL ?? "https://asia-northeast3-shopportunity-8e794.cloudfunctions.net/generateRender";

const PLAN_TIMEOUT_MS = 20_000;
const GENERATE_TIMEOUT_MS = 150_000;

export type Room = { widthMm: number; depthMm: number; ceilingMm: number };

export type LayoutItem = {
  productId: string;
  name: string;
  category: string;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  qty: number;
  imagePath?: string;
};

export type LayoutInput = { room: Room; useType: string; items?: LayoutItem[] };

export type PlacedItem = {
  productId: string;
  name: string;
  category: string;
  kind: "table" | "chair" | "fixture";
  x: number;
  y: number;
  widthMm: number;
  depthMm: number;
  heightMm?: number;
  chairs: number;
  hanging?: boolean;
};

export type Violation = {
  rule: "not_fit" | "overlap" | "aisle" | "gap" | "entry" | "wall";
  message: string;
  productIds: string[];
};

export type PlanNote = { level: "error" | "check"; text: string; source: string };

export type Clearance = { id: string; label: string; valueMm: number; requiredMm: number; ok: boolean };

export type PlanResult = {
  room: Room;
  useType: string;
  placed: PlacedItem[];
  unplaced: { productId: string; name: string }[];
  violations: Violation[];
  notes: PlanNote[];
  entryZone: { left: number; right: number; top: number };
  clearances: Clearance[];
};

export type RenderInput = LayoutInput & {
  code: string;
  spaceNumber: string;
  style: "wood" | "white" | "industrial";
  attempts?: 1 | 2;
};

export type RenderCritique = { passed: boolean; score: number; total: number; failed: { id: string; note: string }[] };

export type RenderOutput = {
  imageDataUrl: string;
  tags: { n: number; x: number; y: number; productId: string; qty: number }[];
  plan: PlanResult;
  critique: RenderCritique;
  attempts: 1 | 2;
};

export type CallResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

/** 면적(m²)과 천장고(m)로 방 크기를 만든다. 깊이 = sqrt(면적 x 1.4), 가로 = 면적 / 깊이. */
export function roomFromArea(areaM2: number, ceilingM: number): Room {
  const depthM = Math.sqrt(areaM2 * 1.4);
  const widthM = areaM2 / depthM;
  return {
    widthMm: Math.round(widthM * 1000),
    depthMm: Math.round(depthM * 1000),
    ceilingMm: Math.round(ceilingM * 1000),
  };
}

async function post<T>(url: string, body: unknown, timeoutMs: number): Promise<CallResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      return { ok: false, status: response.status, error: json?.error ?? `요청이 실패했어요 (${response.status})` };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, status: 0, error: "서버에 연결하지 못했어요" };
  } finally {
    clearTimeout(timer);
  }
}

/** 배치를 계산하고 설계 기준을 점검한다. 비용 없음. */
export function planLayout(input: LayoutInput): Promise<CallResult<PlanResult>> {
  return post<PlanResult>(PLAN_URL, input, PLAN_TIMEOUT_MS);
}

/** 렌더링 이미지를 만든다. 접근 코드가 필요하고 20~90초 걸린다. */
export function generateRender(input: RenderInput): Promise<CallResult<RenderOutput>> {
  return post<RenderOutput>(GENERATE_URL, input, GENERATE_TIMEOUT_MS);
}
