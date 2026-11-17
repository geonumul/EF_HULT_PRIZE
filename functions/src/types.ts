// 함수 전체가 같이 쓰는 타입. 작업 계약은 functions/README.md에 있다.

export type RenderMode = "text" | "products";
export type JobStatus = "queued" | "running" | "done" | "failed";

/** Cloud Tasks 큐가 POST로 보내는 본문 */
export interface RenderJobRequest {
  jobId: string;
  listingId: string;
  useType: string;
  mode: RenderMode;
  prompt: string;
  /** products 모드에서 고른 상품 id. 같은 id를 여러 번 적으면 그 수량이다. */
  productIds: string[];
}

export interface Room {
  widthMm: number;
  depthMm: number;
  ceilingMm: number;
}

export type ProductCategory = "table" | "chair" | "counter" | "shelf" | "reformer" | "locker" | "lamp" | "etc";

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  /** 가장 싼 판매처 기준 가격(원) */
  price: number;
  imageUrl: string;
  embedding: number[];
}

export type LinkSource = "naver" | "coupang" | "partner" | "used";
export type LinkStatus = "live" | "soldout" | "dead";

export interface ProductLink {
  id: string;
  productId: string;
  source: LinkSource;
  url: string;
  affiliateUrl: string | null;
  price: number;
  status: LinkStatus;
}

export type MatchType = "same" | "similar" | "selected" | "none";

export interface Candidate {
  productId: string;
  similarity: number;
}

/** renders 한 건에 딸린 집기 한 종류. render_items 한 행이 된다. */
export interface RenderItem {
  productId: string | null;
  label: string;
  category: ProductCategory;
  matchType: MatchType;
  similarity: number | null;
  qty: number;
  /** 이미지 위 태그 위치(0~1). 태그를 달지 않으면 null */
  tag: { x: number; y: number } | null;
  candidates: Candidate[];
}

export interface QuoteLine {
  productId: string | null;
  label: string;
  qty: number;
  unitPrice: number | null;
  /** unitPrice가 null이면 null. 견적서에서 "직접 찾기"로 보인다. */
  amount: number | null;
}

export interface Quote {
  lines: QuoteLine[];
  productsTotal: number;
  findYourselfCount: number;
}
