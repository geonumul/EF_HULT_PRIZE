// 사용자가 직접 입력한 공간("내 공간"). 이 브라우저의 localStorage에만 저장한다.
// 공간 id는 "my-"로 시작한다. 사진과 건축물대장은 없고, 가로, 깊이, 천장 높이로 배치와 견적을 만든다.
import type { Listing, UseType } from "@/types";

const KEY = "shopportunity-my-spaces";

/** 업종별 창업비를 면적(㎡)에서 어림한다. 단위는 만원. 공실 후보 공간의 창업비 계산과 같은 ㎡당 값이다. */
const COST_MAN_WON_PER_M2: Record<"cafe" | "popup" | "pilates", number> = { cafe: 79, popup: 54.5, pilates: 98.9 };

export type MySpaceInput = {
  name: string;
  floor: number;
  widthM: number;
  depthM: number;
  ceilingM: number;
};

export function isMySpaceId(id: string): boolean {
  return id.startsWith("my-");
}

function readAll(): Listing[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Listing[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function findMySpace(id: string): Listing | undefined {
  if (!isMySpaceId(id)) return undefined;
  return readAll().find((listing) => listing.id === id);
}

/** 입력값을 검사한다. 문제가 있으면 안내 문장을, 없으면 null을 돌려준다. */
export function validateMySpace(input: MySpaceInput): string | null {
  if (!input.name.trim()) return "공간 이름이나 주소를 적어 주세요.";
  if (!(input.widthM >= 2 && input.widthM <= 60)) return "가로는 2m에서 60m 사이로 적어 주세요.";
  if (!(input.depthM >= 2 && input.depthM <= 60)) return "깊이는 2m에서 60m 사이로 적어 주세요.";
  if (!(input.ceilingM >= 1.8 && input.ceilingM <= 12)) return "천장 높이는 1.8m에서 12m 사이로 적어 주세요.";
  if (!(input.floor >= -3 && input.floor <= 60)) return "층을 확인해 주세요.";
  return null;
}

/** 내 공간을 만들어 저장하고 돌려준다. */
export function createMySpace(input: MySpaceInput): Listing {
  const areaM2 = Math.round(input.widthM * input.depthM * 10) / 10;
  const costs: Partial<Record<UseType, number>> = {};
  for (const use of Object.keys(COST_MAN_WON_PER_M2) as (keyof typeof COST_MAN_WON_PER_M2)[]) {
    costs[use] = Math.round(areaM2 * COST_MAN_WON_PER_M2[use]);
  }
  const listing: Listing = {
    id: `my-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    tag: `${input.floor}층 내 공간`,
    address: input.name.trim(),
    nearby: "내가 입력한 공간",
    areaM2,
    floor: input.floor,
    ceilingHeightM: input.ceilingM,
    deposit: 0,
    rent: 0,
    terms: "inquiry",
    buildingUse: "직접 입력",
    condition: "vacant",
    thumbnail: "/images/empty-space.jpg",
    renderCount: 0,
    position: { lat: 37.5446, lng: 127.0559 },
    roomMm: { widthMm: Math.round(input.widthM * 1000), depthMm: Math.round(input.depthM * 1000) },
    costs,
    verdicts: { cafe: "conditional", popup: "conditional", pilates: "conditional" },
  };
  try {
    localStorage.setItem(KEY, JSON.stringify([listing, ...readAll()].slice(0, 20)));
  } catch {
    // 저장소를 못 쓰면 이 화면에서만 열린다.
  }
  return listing;
}

export function listMySpaces(): Listing[] {
  return readAll();
}
