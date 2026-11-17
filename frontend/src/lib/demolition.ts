// 철거비 추정 규칙과 가짜 서버(localStorage). 서버가 생기면 저장 함수만 API 호출로 바꾼다.
// 단가는 lib/quote.ts의 예시 값(㎡당 12만 원)과 같다. 실제 단가표를 받으면 이 파일의 숫자만 바꾼다.
import type { SpaceCondition } from "@/types";
import type {
  DemolitionBid,
  DemolitionEstimate,
  DemolitionInput,
  DemolitionRequest,
  DemolitionScope,
} from "@/types/demolition";
import { makeMockBids } from "@/mocks/demolition";

const WON_PER_M2 = 120000;

/** 범위별 비율. 다 더하면 1이라서 전체를 고르면 전체 철거 단가가 된다. (예시) */
export const SCOPE_RATIO: Record<DemolitionScope, number> = {
  ceiling: 0.2,
  floor: 0.25,
  wall: 0.25,
  facility: 0.2,
  signage: 0.1,
};

export const SCOPE_LABELS: Record<DemolitionScope, string> = {
  ceiling: "천장",
  floor: "바닥",
  wall: "벽체",
  facility: "설비",
  signage: "간판",
};

export const ALL_SCOPES: DemolitionScope[] = ["ceiling", "floor", "wall", "facility", "signage"];

export const FIXTURE_LABELS: Record<SpaceCondition, string> = {
  vacant: "남은 시설 없음",
  has_fixtures: "집기·마감 일부 남음",
  occupied: "영업하던 점포",
};

// 남은 시설에 따른 철거 비율. 일부만 남은 곳은 절반으로 본다.
const FIXTURE_RATIO: Record<SpaceCondition, number> = { vacant: 0, has_fixtures: 0.5, occupied: 1 };

const WASTE_EXTRA_RATIO = 0.15; // 폐기물을 업체가 처리하면 더하는 비율
const LOW_RATIO = 0.85; // 하한
const HIGH_RATIO = 1.2; // 상한

function roundTo10000(won: number): number {
  return Math.round(won / 10000) * 10000;
}

/** 철거비 추정 범위. 입력이 바뀔 때마다 부른다. */
export function estimateDemolition(input: DemolitionInput): DemolitionEstimate {
  const scopeRatio = input.scopes.reduce((sum, scope) => sum + SCOPE_RATIO[scope], 0);
  const base = input.areaM2 * WON_PER_M2 * scopeRatio * FIXTURE_RATIO[input.fixtures];
  const withWaste = input.waste === "vendor" ? base * (1 + WASTE_EXTRA_RATIO) : base;
  return { minWon: roundTo10000(withWaste * LOW_RATIO), maxWon: roundTo10000(withWaste * HIGH_RATIO) };
}

/** 화면에 보이는 "확인이 필요한 항목". 법적 판단이 아니라 확인할 일만 적는다. */
export const CHECK_ITEMS = [
  { title: "건물주 동의", body: "철거 전에 건물주에게 철거 범위를 알리고 동의 여부를 확인해야 합니다." },
  { title: "원상복구 범위", body: "임대차 계약서에 적힌 원상복구 범위를 확인해야 합니다." },
  { title: "폐기물 처리", body: "폐기물을 누가 어떻게 반출하는지 업체와 정해야 합니다." },
  {
    title: "석면 확인",
    body: "건축 연도가 오래된 건물은 석면 조사가 필요할 수 있습니다. 확정은 업체와 관할 기관에 문의하세요.",
  },
];

// ---- 가짜 서버 ----
const REQUESTS_KEY = "shopportunity.demolition.requests";
const BIDS_KEY = "shopportunity.demolition.bids"; // 파트너가 낸 견적

function readList<T>(key: string): T[] {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, list: T[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // 저장 공간이 막혀 있으면 이번 화면에서만 동작한다.
  }
}

export function loadRequests(): DemolitionRequest[] {
  return readList<DemolitionRequest>(REQUESTS_KEY);
}

export function findRequest(requestId: string): DemolitionRequest | undefined {
  return loadRequests().find((request) => request.id === requestId);
}

export function saveRequest(request: DemolitionRequest) {
  const others = loadRequests().filter((item) => item.id !== request.id);
  writeList(REQUESTS_KEY, [...others, request]);
}

/** 공실의 확정 철거비. 견적 화면이 "철거" 그룹에 반영할 때 쓴다. 없으면 undefined. */
export function findConfirmedDemolition(listingId: string): { vendorId: string; amountWon: number } | undefined {
  const confirmed = loadRequests()
    .filter((request) => request.listingId === listingId && request.selectedVendorId && request.selectedAmountWon)
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  if (!confirmed) return undefined;
  return { vendorId: confirmed.selectedVendorId as string, amountWon: confirmed.selectedAmountWon as number };
}

export function loadPartnerBids(): DemolitionBid[] {
  return readList<DemolitionBid>(BIDS_KEY);
}

/** 파트너가 낸 견적을 저장한다. 같은 업체가 다시 내면 덮어쓴다. */
export function savePartnerBid(bid: DemolitionBid) {
  const others = loadPartnerBids().filter((item) => !(item.requestId === bid.requestId && item.vendorId === bid.vendorId));
  writeList(BIDS_KEY, [...others, bid]);
}

/** 요청의 견적 전체. 파트너가 낸 견적은 같은 업체의 가짜 견적을 대신한다. 도착 전 견적도 들어 있다. */
export function loadAllBids(request: DemolitionRequest): DemolitionBid[] {
  const partnerBids = loadPartnerBids().filter((bid) => bid.requestId === request.id);
  const mockBids = makeMockBids(request).filter((mock) => !partnerBids.some((bid) => bid.vendorId === mock.vendorId));
  return [...mockBids, ...partnerBids];
}

export function newRequestId(): string {
  return `dr-${Date.now().toString(36)}`;
}

export function formatDate(text: string): string {
  const [year, month, day] = text.split("-");
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}
