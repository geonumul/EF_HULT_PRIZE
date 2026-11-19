// 화면과 API가 함께 쓰는 데이터 모양. Figma "08 Backend · Data"의 테이블을 따른다.
// 금액은 모두 "만원" 단위 정수다. (4,200만 원 → 4200)

/** 업종. 지도 화면의 카테고리 탭과 업종 선택 타일에서 쓴다. */
export type UseType = "cafe" | "popup" | "pilates" | "restaurant" | "retail" | "service" | "office";

/** 업종 적합성 판정 결과 */
export type Verdict = "possible" | "conditional" | "impossible";

/** 공간 상태. 철거가 필요한지 가른다. docs/FEATURES.md 참고 */
export type SpaceCondition = "vacant" | "has_fixtures" | "occupied";

/** 렌더링 방식. text는 이미지 먼저, products는 상품 먼저 */
export type RenderMode = "text" | "products";

export type Listing = {
  id: string;
  tag: string; // "1층 상가"
  address: string; // "성수동2가"
  nearby: string; // 목록에 보이는 위치 설명 ("뚝섬역 3분")
  areaM2: number;
  floor: number;
  ceilingHeightM: number;
  deposit: number; // 보증금
  rent: number; // 월세
  buildingUse: string; // 건축물대장 주용도
  terms?: "inquiry"; // 보증금과 월세를 모르는 공간. 화면에 "임대 조건 문의"로 보여 준다.
  condition: SpaceCondition;
  thumbnail: string; // /images/... 경로
  renderCount: number; // AI 렌더링 개수. 0이면 "빈 공간"
  position: { lat: number; lng: number };
  /** 업종별 창업비 */
  costs: Partial<Record<UseType, number>>;
  /** 업종별 적합성 */
  verdicts: Partial<Record<UseType, Verdict>>;
};

/** 상품의 판매처 링크. product_links 테이블 */
export type ProductLink = {
  id: string;
  source: "naver" | "coupang" | "partner" | "used";
  label: string; // "마켓B", "쿠팡"
  url: string;
  price: number; // 원 단위. 상품 가격은 원이다.
  status: "live" | "soldout" | "dead";
};

export type Product = {
  id: string;
  name: string;
  category: string; // "chair", "table", "lamp", "counter" ...
  widthMm: number;
  depthMm: number;
  heightMm: number;
  price: number; // 원
  usedPrice?: number; // 원. 중고가 있으면
  imageUrl: string;
  links: ProductLink[]; // 최저가 순
};

/** 렌더링 이미지 위에 붙는 상품 태그 */
export type RenderTag = {
  n: number; // 화면에 보이는 번호
  x: number; // 이미지 안 위치 (0~100 %)
  y: number;
  productId: string;
  qty: number;
  similarity?: number; // 0~1. 이미지 먼저 방식에서만
};

export type RenderResult = {
  id: string;
  listingId: string;
  useType: UseType;
  mode: RenderMode;
  imageUrl: string;
  tags: RenderTag[];
  checks: string[]; // 치수 검증 결과 문구
};

export type QuoteItem = {
  name: string;
  spec: string;
  qty: number;
  unitPrice: number; // 원
  productId?: string;
};

export type QuoteGroup = {
  key: "items" | "facility" | "construction" | "demolition";
  title: string;
  sum: number; // 원
  items: QuoteItem[];
};

export type Quote = {
  id: string;
  renderId: string;
  groups: QuoteGroup[];
  total: number; // 원
  usedSaving: number; // 중고로 바꿨을 때 줄어드는 금액. 원
};
