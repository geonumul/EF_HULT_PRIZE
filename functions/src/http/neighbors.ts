// 공간 주변 건물 윤곽을 공개 지도 데이터(OpenStreetMap Overpass)에서 받아 돌려준다.
// 브라우저가 공개 서버를 직접 부르면 막히는 경우가 있어서 서버가 대신 받고, 같은 좌표는 하루 동안 저장해 다시 받지 않는다.
// 좌표는 공개된 공실 위치만 받는다. 한국 안의 좌표만 받는다.

export type FetchLike = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

const MIRRORS = ["https://overpass.openstreetmap.fr/api/interpreter", "https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
const RADIUS_M = 160;
const TIMEOUT_MS = 15_000;
const CACHE_MS = 24 * 3_600_000;
const MAX_CACHE = 200;

const cache = new Map<string, { at: number; elements: unknown[] }>();

export function validateNeighborQuery(query: { lat?: unknown; lng?: unknown }): { lat: number; lng: number } | { error: string } {
  const lat = Number(query.lat);
  const lng = Number(query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { error: "lat, lng가 필요합니다." };
  if (lat < 33 || lat > 39 || lng < 124 || lng > 132) return { error: "한국 안의 좌표만 받습니다." };
  return { lat, lng };
}

/** 주변 건물 목록. 공개 서버를 차례로 시도하고, 모두 실패하면 오류를 던진다. */
export async function fetchNeighborElements(lat: number, lng: number, fetchImpl: FetchLike, now: number = Date.now()): Promise<unknown[]> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const hit = cache.get(key);
  if (hit && now - hit.at < CACHE_MS) return hit.elements;

  const query = `[out:json][timeout:20];way["building"](around:${RADIUS_M},${lat},${lng});out geom tags;`;
  let lastError: unknown = null;
  for (const url of MIRRORS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const response = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "shopportunity/1.0" },
        body: new URLSearchParams({ data: query }).toString(),
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));
      if (!response.ok) throw new Error(`${url} ${response.status}`);
      const body = (await response.json()) as { elements?: unknown[] };
      const elements = Array.isArray(body.elements) ? body.elements : [];
      if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value as string);
      cache.set(key, { at: now, elements });
      return elements;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("주변 건물을 받지 못했습니다.");
}

export function clearNeighborCache(): void {
  cache.clear();
}
