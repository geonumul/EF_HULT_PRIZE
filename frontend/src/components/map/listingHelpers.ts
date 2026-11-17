// 공실 목록을 거르고 정렬하고 글자로 바꾸는 함수 모음. 화면 컴포넌트가 함께 쓴다.
import { USE_LABELS } from "@/lib/format";
import { NO_PREMIUM_IDS } from "@/mocks/map";
import type { Listing, UseType } from "@/types";
import type { MapFilters, SortKey } from "@/types/map";

/** 지도와 목록에 보일 업종. 고른 업종이 없으면 공실의 첫 번째 업종을 쓴다. */
export function mainUseOf(listing: Listing, use: UseType | null): UseType {
  if (use && listing.costs[use] !== undefined) return use;
  return Object.keys(listing.costs)[0] as UseType;
}

/** 고른 업종의 창업비(만원). 산출되지 않은 업종이면 undefined. */
export function costOf(listing: Listing, use: UseType | null): number | undefined {
  if (use === null) return listing.costs[mainUseOf(listing, null)];
  return listing.costs[use];
}

/** "카페 창업", "팝업 스토어"처럼 목록에 보이는 이름 */
export function useTitle(use: UseType): string {
  if (use === "popup") return "팝업 스토어";
  return `${USE_LABELS[use]} 창업`;
}

type FilterOptions = {
  use: UseType | null;
  costOnly: boolean; // "창업비 산출 공실만"
  filters: MapFilters;
  query: string;
};

export function filterListings(listings: Listing[], options: FilterOptions): Listing[] {
  const { use, costOnly, filters, query } = options;
  const text = query.trim();

  return listings.filter((listing) => {
    const cost = costOf(listing, use);
    // 업종을 골랐는데 그 업종 창업비가 없으면 "산출 공실만"이 켜져 있을 때 뺀다.
    if (costOnly && cost === undefined) return false;
    if (filters.under5000 && (cost === undefined || cost > 5000)) return false;
    if (filters.firstFloorOnly && listing.floor !== 1) return false;
    if (filters.noPremium && !NO_PREMIUM_IDS.includes(listing.id)) return false;
    if (text) {
      const haystack = `${listing.address} ${listing.nearby} ${listing.tag} ${listing.buildingUse}`;
      if (!haystack.includes(text)) return false;
    }
    return true;
  });
}

export function sortListings(listings: Listing[], sort: SortKey, use: UseType | null): Listing[] {
  const copy = [...listings];
  if (sort === "cost") {
    // 창업비가 없는 공실은 맨 뒤로 보낸다.
    const costOrLast = (listing: Listing) => costOf(listing, use) ?? Number.MAX_SAFE_INTEGER;
    copy.sort((a, b) => costOrLast(a) - costOrLast(b));
  }
  if (sort === "popular") {
    // 조회수 데이터가 없어서 렌더링이 많은 공실을 인기 있는 것으로 본다.
    copy.sort((a, b) => b.renderCount - a.renderCount);
  }
  return copy; // "latest"는 mocks/listings.ts 순서 그대로다.
}
