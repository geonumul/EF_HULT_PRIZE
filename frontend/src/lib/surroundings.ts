// 공간 주변 건물. 공개 지도 데이터(OpenStreetMap)에서 건물 윤곽과 높이를 받아 3D 뷰어가 상자로 세운다.
// 공간의 좌표(공개된 공실 위치)만 보내고, 결과는 이 브라우저에 저장해 다시 받지 않는다.
// 정확한 측량값이 아니다. 높이가 없는 건물은 층수로, 층수도 없으면 12m로 어림한다.

export type Neighbor = {
  /** 건물 윤곽. 공간 좌표를 원점으로 한 동쪽, 북쪽 거리(m) */
  points: { e: number; n: number }[];
  heightM: number;
};

const NEIGHBORS_URL = process.env.NEXT_PUBLIC_NEIGHBORS_URL ?? "https://asia-northeast3-shopportunity-8e794.cloudfunctions.net/neighbors";
const OVERPASS_URL = "https://overpass.openstreetmap.fr/api/interpreter"; // 서버 함수가 안 될 때 직접 받는 공개 서버
const RADIUS_M = 160;
const CACHE_PREFIX = "shopportunity-neighbors:";
const DEFAULT_HEIGHT_M = 12;
const FLOOR_HEIGHT_M = 3.3;

function contains(points: { e: number; n: number }[], e: number, n: number): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const a = points[i];
    const b = points[j];
    if (a.n > n !== b.n > n && e < ((b.e - a.e) * (n - a.n)) / (b.n - a.n) + a.e) inside = !inside;
  }
  return inside;
}

type OverpassWay = { geometry?: { lat: number; lon: number }[]; tags?: Record<string, string> };

/** Overpass 응답을 원점 기준 미터 좌표의 건물 목록으로 바꾼다. 공간이 들어 있는 건물은 뺀다. */
export function parseNeighbors(ways: OverpassWay[], lat: number, lng: number): Neighbor[] {
  const metersPerLat = 110_540;
  const metersPerLng = 111_320 * Math.cos((lat * Math.PI) / 180);
  const out: Neighbor[] = [];
  for (const way of ways) {
    if (!way.geometry || way.geometry.length < 4) continue;
    const points = way.geometry.map((p) => ({ e: (p.lon - lng) * metersPerLng, n: (p.lat - lat) * metersPerLat }));
    if (contains(points, 0, 0)) continue; // 이 공간이 있는 건물
    const tags = way.tags ?? {};
    const height = Number.parseFloat(tags.height ?? "");
    const levels = Number.parseFloat(tags["building:levels"] ?? "");
    const heightM = Number.isFinite(height) && height > 0 ? height : Number.isFinite(levels) && levels > 0 ? levels * FLOOR_HEIGHT_M : DEFAULT_HEIGHT_M;
    out.push({ points: points.slice(0, -1), heightM: Math.min(heightM, 250) });
  }
  return out;
}

const cacheKey = (lat: number, lng: number) => `${CACHE_PREFIX}${lat.toFixed(5)},${lng.toFixed(5)}`;

/** 주변 건물을 받는다. 한 번 받은 곳은 브라우저에 저장한 것을 쓴다. 실패하면 빈 목록이다. */
export async function fetchNeighbors(lat: number, lng: number): Promise<Neighbor[]> {
  try {
    const cached = localStorage.getItem(cacheKey(lat, lng));
    if (cached) return JSON.parse(cached) as Neighbor[];
  } catch {
    // 저장 공간을 못 쓰면 바로 받는다.
  }
  let elements: OverpassWay[] | null = null;
  // 1) 서버 함수. 공개 지도 서버를 대신 부르고 저장해 둔다.
  try {
    const response = await fetch(`${NEIGHBORS_URL}?lat=${lat}&lng=${lng}`);
    if (response.ok) elements = ((await response.json()) as { elements?: OverpassWay[] }).elements ?? [];
  } catch {
    elements = null;
  }
  // 2) 서버 함수가 안 되면 공개 서버를 직접 부른다.
  if (elements === null) {
    try {
      const query = `[out:json][timeout:20];way["building"](around:${RADIUS_M},${lat},${lng});out geom tags;`;
      const response = await fetch(OVERPASS_URL, { method: "POST", body: new URLSearchParams({ data: query }) });
      if (response.ok) elements = ((await response.json()) as { elements?: OverpassWay[] }).elements ?? [];
    } catch {
      elements = null;
    }
  }
  if (elements === null) return [];
  try {
    const neighbors = parseNeighbors(elements, lat, lng);
    try {
      localStorage.setItem(cacheKey(lat, lng), JSON.stringify(neighbors));
    } catch {
      // 저장하지 못해도 이번 화면에서는 쓴다.
    }
    return neighbors;
  } catch {
    return [];
  }
}
