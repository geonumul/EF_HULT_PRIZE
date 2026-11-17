// 철거 견적 기능의 데이터 모양. docs/FEATURES.md "2. 철거 견적과 업체 매칭"을 따른다.
// 금액은 이 영역에서만 원 단위 정수다. (공통 타입의 견적 그룹이 원 단위를 쓰기 때문)
import type { SpaceCondition, UseType } from "@/types";

export type DemolitionScope = "ceiling" | "floor" | "wall" | "facility" | "signage";

/** 폐기물 처리. vendor는 업체가 처리(비용 추가), self는 직접 처리 */
export type WasteHandling = "vendor" | "self";

export type DemolitionStatus = "open" | "selected" | "done";

export type DemolitionInput = {
  areaM2: number;
  fixtures: SpaceCondition; // 남은 시설 상태. vacant면 철거가 필요 없다.
  scopes: DemolitionScope[];
  waste: WasteHandling;
};

export type DemolitionEstimate = {
  minWon: number;
  maxWon: number;
};

export type DemolitionReview = {
  rating: number; // 1~5
  body: string;
};

export type DemolitionRequest = {
  id: string;
  listingId: string;
  useType: UseType;
  region: string;
  input: DemolitionInput;
  estimate: DemolitionEstimate;
  vendorIds: string[]; // 요청이 전달된 업체. 최대 3곳
  createdAt: number; // 밀리초
  status: DemolitionStatus;
  selectedVendorId?: string;
  selectedAmountWon?: number;
  review?: DemolitionReview;
};

export type DemolitionVendor = {
  id: string;
  name: string;
  region: string;
  rating: number;
  reviewCount: number;
};

export type DemolitionBid = {
  id: string;
  requestId: string;
  vendorId: string;
  amountWon: number;
  startDate: string; // "2026-12-01"
  scopeNote: string;
  arrivesAt: number; // 밀리초. 이 시각이 지나야 화면에 보인다.
};
