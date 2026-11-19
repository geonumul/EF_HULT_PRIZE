// 업종과 면적으로 상품 세트를 자동 구성한다. 순수 함수라 화면 없이 검증할 수 있다.
// 칸(slot)마다 후보 상품 중 하나를 고른다.
//  1. 입점 업체 상품이 있으면 그중 가장 싼 것을 고른다. 가격과 링크가 확정이라 먼저 보여 주는 서비스 규칙이다.
//  2. 입점 업체 상품이 없으면 인터넷 상품 중 가장 싼 것을 고른다. 이 가격은 예상이다.
// 수량은 면적에서 정한다. 기준 면적(39.6m²)에서는 mocks/renders.ts의 태그 수량과 같다.
import type { Product, UseType } from "@/types";
import { PRODUCTS } from "@/mocks/products";
import { isPartnerProduct } from "@/lib/shopping";

export type SetItem = {
  productId: string;
  qty: number;
  source: "partner" | "internet";
};

type Slot = {
  key: string;
  candidates: string[]; // 후보 상품 id
  qty: (areaM2: number, qtyOf: Record<string, number>) => number;
};

const atLeastOne = (value: number) => Math.max(1, Math.round(value));

// 업종 템플릿. 순서는 화면에 보이는 순서다.
const TEMPLATES: Partial<Record<UseType, Slot[]>> = {
  cafe: [
    { key: "table", candidates: ["table-2p"], qty: (area) => Math.max(1, Math.floor(area / 3.6)) },
    { key: "chair", candidates: ["chair-oak"], qty: (_area, qtyOf) => qtyOf.table * 2 }, // 테이블당 2개
    { key: "counter", candidates: ["counter-bar"], qty: () => 1 },
    { key: "lamp", candidates: ["lamp-pendant"], qty: (area) => atLeastOne(area / 6.6) },
    { key: "machine", candidates: ["espresso-machine"], qty: () => 1 },
    { key: "fridge", candidates: ["fridge-showcase"], qty: () => 1 },
  ],
  popup: [
    { key: "shelf", candidates: ["shelf-display"], qty: (area) => atLeastOne(area / 6.6) },
    { key: "lamp", candidates: ["lamp-pendant"], qty: (area) => atLeastOne(area / 10) },
    { key: "counter", candidates: ["counter-bar"], qty: () => 1 },
  ],
  pilates: [
    { key: "reformer", candidates: ["reformer"], qty: (area) => atLeastOne(area / 5) },
    { key: "mirror", candidates: ["mirror-wall"], qty: (area) => atLeastOne(area / 10) },
    { key: "lamp", candidates: ["lamp-pendant"], qty: (area) => atLeastOne(area / 8) },
    { key: "locker", candidates: ["locker-steel"], qty: (area) => atLeastOne(area / 20) },
  ],
};

/** 후보 중 하나를 고른다. 입점 업체 상품이 먼저고, 같은 쪽 안에서는 가장 싼 것이다. 후보가 없으면 undefined. */
export function pickProduct(candidates: Product[]): { product: Product; source: SetItem["source"] } | undefined {
  const cheapest = (list: Product[]) => list.reduce((best, p) => (p.price < best.price ? p : best));
  const partners = candidates.filter(isPartnerProduct);
  if (partners.length > 0) return { product: cheapest(partners), source: "partner" };
  if (candidates.length > 0) return { product: cheapest(candidates), source: "internet" };
  return undefined;
}

/** 업종 템플릿대로 상품과 수량을 정한다. 템플릿이 없는 업종은 빈 배열이다. */
export function autoProductSet(useType: UseType, areaM2: number, products: Product[] = PRODUCTS): SetItem[] {
  const result: SetItem[] = [];
  const qtyOf: Record<string, number> = {};

  for (const slot of TEMPLATES[useType] ?? []) {
    const candidates = products.filter((product) => slot.candidates.includes(product.id));
    const picked = pickProduct(candidates);
    if (!picked) continue; // 후보 상품이 없는 칸은 건너뛴다.
    qtyOf[slot.key] = slot.qty(areaM2, qtyOf);
    result.push({ productId: picked.product.id, qty: qtyOf[slot.key], source: picked.source });
  }
  return result;
}
