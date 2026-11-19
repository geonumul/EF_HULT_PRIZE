// 상품 판매처 링크 정리.
// 입점 업체가 있는 상품은 업체 링크를 쓰고, 없는 상품은 인터넷 쇼핑몰의 검색 결과로 연결한다.
import type { Product, ProductLink } from "@/types";

/** 쇼핑몰에서 상품 이름으로 검색하는 주소 */
const SEARCH_URLS = {
  naver: (name: string) => `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(name)}`,
  coupang: (name: string) => `https://www.coupang.com/np/search?q=${encodeURIComponent(name)}`,
};

const SEARCH_LABELS = { naver: "네이버 최저가", coupang: "쿠팡" };

type SearchSource = keyof typeof SEARCH_URLS;

/** 입점 업체가 올린 상품이면 true. 마켓에서 위쪽에 보여 준다. */
export function isPartnerProduct(product: Product): boolean {
  return product.links.some((link) => link.source === "partner" && link.status === "live");
}

/**
 * 판매처 링크를 실제로 열리는 주소로 맞춘다.
 * 네이버, 쿠팡 링크는 상품 이름 검색 주소로 바꾸고, 빠진 쇼핑몰은 추가한다. 업체와 중고 링크는 그대로 둔다.
 */
export function withShoppingLinks(product: Product): Product {
  const links: ProductLink[] = product.links.map((link) =>
    link.source === "naver" || link.source === "coupang" ? { ...link, url: SEARCH_URLS[link.source](product.name) } : link,
  );

  for (const source of Object.keys(SEARCH_URLS) as SearchSource[]) {
    if (links.some((link) => link.source === source)) continue;
    links.push({
      id: `${product.id}-search-${source}`,
      source,
      label: SEARCH_LABELS[source],
      url: SEARCH_URLS[source](product.name),
      price: product.price, // 검색 결과의 실제 가격은 알 수 없어 등록된 기준 가격을 보여 준다.
      status: "live",
    });
  }
  return { ...product, links };
}
