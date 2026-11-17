// 가짜 철거 업체와 가짜 견적. 서버가 생기면 업체 목록은 vendors 테이블, 견적은 demolition_bids로 바뀐다.
import type { DemolitionBid, DemolitionRequest, DemolitionVendor } from "@/types/demolition";

export const DEMOLITION_VENDORS: DemolitionVendor[] = [
  { id: "dv-seongdong", name: "성동철거", region: "성동구", rating: 4.8, reviewCount: 126 },
  { id: "dv-theclean", name: "더클린철거", region: "성동구", rating: 4.5, reviewCount: 83 },
  { id: "dv-hangang", name: "한강해체", region: "성동구", rating: 4.2, reviewCount: 41 },
  { id: "dv-seoulsup", name: "서울숲철거", region: "성동구", rating: 4.6, reviewCount: 57 },
  { id: "dv-mapo", name: "마포철거", region: "마포구", rating: 4.4, reviewCount: 64 },
];

export function findVendor(id: string): DemolitionVendor | undefined {
  return DEMOLITION_VENDORS.find((vendor) => vendor.id === id);
}

/** 공실 주소로 지역을 정한다. 지금 공실은 모두 성수동이라 성동구다. */
export function regionOfAddress(address: string): string {
  return address.includes("성수동") ? "성동구" : "서울";
}

/** 같은 지역 업체 최대 3곳 */
export function pickVendorIds(region: string): string[] {
  return DEMOLITION_VENDORS.filter((vendor) => vendor.region === region)
    .slice(0, 3)
    .map((vendor) => vendor.id);
}

// 업체마다 견적 성격이 다르다. ratio는 추정 범위 가운데 값에 곱하는 비율이다.
const BID_PLANS: Record<string, { ratio: number; startInDays: number; delaySec: number; note: string }> = {
  "dv-seongdong": {
    ratio: 1.08,
    startInDays: 5,
    delaySec: 3,
    note: "천장, 바닥, 벽체 철거와 폐기물 반출 포함. 간판 철거는 별도 협의.",
  },
  "dv-theclean": {
    ratio: 0.95,
    startInDays: 9,
    delaySec: 6,
    note: "요청하신 범위 전체 철거, 폐기물 처리 포함. 원상복구 마감은 미포함.",
  },
  "dv-hangang": {
    ratio: 0.88,
    startInDays: 14,
    delaySec: 9,
    note: "철거와 분리 반출까지. 폐기물 톤수 초과 시 추가 비용이 생길 수 있음.",
  },
  "dv-seoulsup": {
    ratio: 1.0,
    startInDays: 7,
    delaySec: 7,
    note: "범위 전체 철거와 폐기물 처리 포함. 야간 작업 가능.",
  },
  "dv-mapo": {
    ratio: 1.02,
    startInDays: 8,
    delaySec: 8,
    note: "철거와 폐기물 처리 포함.",
  },
};

function toDateText(time: number): string {
  const date = new Date(time);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** 요청이 전달된 업체마다 가짜 견적을 하나씩 만든다. 도착 시각은 요청 시각에서 수 초 뒤다. */
export function makeMockBids(request: DemolitionRequest): DemolitionBid[] {
  const middle = (request.estimate.minWon + request.estimate.maxWon) / 2;
  return request.vendorIds.map((vendorId) => {
    const plan = BID_PLANS[vendorId] ?? BID_PLANS["dv-seongdong"];
    return {
      id: `bid-${request.id}-${vendorId}`,
      requestId: request.id,
      vendorId,
      amountWon: Math.round((middle * plan.ratio) / 10000) * 10000,
      startDate: toDateText(request.createdAt + plan.startInDays * 24 * 60 * 60 * 1000),
      scopeNote: plan.note,
      arrivesAt: request.createdAt + plan.delaySec * 1000,
    };
  });
}
