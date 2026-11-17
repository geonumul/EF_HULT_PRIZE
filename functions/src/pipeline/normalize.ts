// 상품 수집 2단계 정규화. 카테고리를 통일하고 상품명에서 치수 W·D·H(mm)를 뽑는다.
import type { LinkSource, ProductCategory } from "../types";

export interface RawShopItem {
  source: LinkSource;
  title: string;
  price: number;
  imageUrl: string;
  url: string;
  affiliateUrl: string | null;
}

export interface Dimensions {
  widthMm: number;
  depthMm: number;
  heightMm: number;
}

export interface NormalizedItem {
  name: string;
  category: ProductCategory;
  /** 상품명에서 찾지 못하면 null. 이 상품은 공급사가 치수를 입력해야 렌더링에 쓴다. */
  dimensions: Dimensions | null;
  needsSupplierDimensions: boolean;
  price: number;
  imageUrl: string;
  source: LinkSource;
  url: string;
  affiliateUrl: string | null;
}

const CATEGORY_KEYWORDS: Array<[ProductCategory, string[]]> = [
  ["chair", ["의자", "체어", "스툴"]],
  ["table", ["테이블", "탁자"]],
  ["counter", ["카운터", "바 테이블"]],
  ["shelf", ["선반", "진열대", "행거"]],
  ["reformer", ["리포머", "필라테스 기구"]],
  ["locker", ["사물함", "락커", "로커"]],
  ["lamp", ["조명", "램프", "펜던트"]],
];

export function categoryFromTitle(title: string): ProductCategory {
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((keyword) => title.includes(keyword))) return category;
  }
  return "etc";
}

/**
 * "W450 D520 H780", "450x520x780mm", "45x52x78cm" 같은 표기를 찾는다.
 * 순서는 가로, 세로(깊이), 높이로 본다. 단위가 cm이면 10을 곱한다.
 */
export function extractDimensions(text: string): Dimensions | null {
  const labeled = text.match(/W\s*(\d+)\D+D\s*(\d+)\D+H\s*(\d+)/i);
  if (labeled) {
    return { widthMm: Number(labeled[1]), depthMm: Number(labeled[2]), heightMm: Number(labeled[3]) };
  }

  const times = text.match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(mm|cm)?/i);
  if (times) {
    const unit = times[4]?.toLowerCase() === "cm" ? 10 : 1;
    return {
      widthMm: Math.round(Number(times[1]) * unit),
      depthMm: Math.round(Number(times[2]) * unit),
      heightMm: Math.round(Number(times[3]) * unit),
    };
  }

  return null;
}

export function normalizeItem(raw: RawShopItem): NormalizedItem {
  const dimensions = extractDimensions(raw.title);
  return {
    name: raw.title,
    category: categoryFromTitle(raw.title),
    dimensions,
    needsSupplierDimensions: dimensions === null,
    price: raw.price,
    imageUrl: raw.imageUrl,
    source: raw.source,
    url: raw.url,
    affiliateUrl: raw.affiliateUrl,
  };
}
