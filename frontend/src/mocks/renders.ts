// 가짜 렌더링 결과. 스튜디오 화면과 견적 화면이 같이 쓴다.
// 렌더링 id는 "r-<공실id>-<업종>" 형식이고, 상품 먼저 방식은 뒤에 "-products"가 붙는다.
// 이미지 파일(/images/render-*.jpg)은 스튜디오 화면 작업에서 시안 이미지를 내려받아 채운다.
import type { RenderResult, RenderTag, UseType } from "@/types";
import { LISTINGS } from "./listings";

// 업종별 기본 배치. 태그의 x, y는 이미지 안 위치(%)다.
const TAGS_BY_USE: Partial<Record<UseType, RenderTag[]>> = {
  cafe: [
    { n: 1, x: 32, y: 66, productId: "chair-oak", qty: 22, similarity: 0.93 },
    { n: 2, x: 52, y: 70, productId: "table-2p", qty: 11, similarity: 0.9 },
    { n: 3, x: 70, y: 46, productId: "counter-bar", qty: 1, similarity: 0.88 },
    { n: 4, x: 48, y: 20, productId: "lamp-pendant", qty: 6, similarity: 0.91 },
    { n: 5, x: 80, y: 60, productId: "espresso-machine", qty: 1, similarity: 0.86 },
    { n: 6, x: 86, y: 38, productId: "fridge-showcase", qty: 1, similarity: 0.87 },
  ],
  popup: [
    { n: 1, x: 40, y: 60, productId: "shelf-display", qty: 6, similarity: 0.89 },
    { n: 2, x: 60, y: 24, productId: "lamp-pendant", qty: 4, similarity: 0.9 },
    { n: 3, x: 72, y: 66, productId: "counter-bar", qty: 1, similarity: 0.85 },
  ],
  pilates: [
    { n: 1, x: 36, y: 68, productId: "reformer", qty: 8, similarity: 0.92 },
    { n: 2, x: 78, y: 40, productId: "mirror-wall", qty: 4, similarity: 0.9 },
    { n: 3, x: 50, y: 18, productId: "lamp-pendant", qty: 5, similarity: 0.88 },
  ],
};

const CHECKS_BY_USE: Partial<Record<UseType, string[]>> = {
  cafe: ["통로 폭 900mm 확보", "좌석 22석 배치", "바 카운터 동선 겹침 없음"],
  popup: ["통로 폭 1,100mm 확보", "진열대 간격 800mm 이상"],
  pilates: ["리포머 간격 700mm 확보", "거울 벽면 길이 충분"],
};

function makeRender(listingId: string, useType: UseType): RenderResult {
  return {
    id: `r-${listingId}-${useType}`,
    listingId,
    useType,
    mode: "text",
    imageUrl: `/images/render-${useType}.jpg`,
    tags: TAGS_BY_USE[useType] ?? [],
    checks: CHECKS_BY_USE[useType] ?? [],
  };
}

/** 공실마다 업종별 렌더링이 하나씩 있다. */
export const RENDERS: RenderResult[] = LISTINGS.flatMap((listing) =>
  (Object.keys(listing.costs) as UseType[]).map((useType) => makeRender(listing.id, useType)),
);

/**
 * id로 렌더링을 찾는다.
 * "-products"가 붙은 id는 상품 먼저 방식으로 만든 결과이므로 기본 렌더링을 복사해 mode만 바꾼다.
 * 스튜디오 화면은 새로 만든 결과를 이 형식의 id로 넘기고, 견적 화면은 이 함수로 읽는다.
 */
export function findRender(id: string): RenderResult | undefined {
  const isProductsMode = id.endsWith("-products");
  const baseId = isProductsMode ? id.replace(/-products$/, "") : id;
  const base = RENDERS.find((render) => render.id === baseId);
  if (!base) return undefined;
  return isProductsMode ? { ...base, id, mode: "products" } : base;
}
