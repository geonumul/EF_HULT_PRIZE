// 가짜 상품 데이터. 집기 마켓, 렌더링 태그, 견적서가 함께 쓴다.
// 사진은 시안의 임시 이미지 3장(의자, 조명, 카운터)을 상품 종류에 맞춰 돌려 쓴다. 실제 상품 사진은 상품 수집 단계에서 채운다.
import { withShoppingLinks } from "@/lib/shopping";
import type { Product } from "@/types";

const RAW_PRODUCTS: Product[] = [
  {
    id: "chair-oak",
    name: "오크 원목 체어",
    category: "chair",
    widthMm: 450,
    depthMm: 520,
    heightMm: 780,
    price: 89000,
    usedPrice: 52000,
    imageUrl: "/images/prod-chair.jpg",
    links: [
      { id: "chair-oak-a", source: "partner", label: "마켓B", url: "https://example.com/market-b/chair-oak", price: 89000, status: "live" },
      { id: "chair-oak-b", source: "coupang", label: "쿠팡", url: "https://example.com/coupang/chair-oak", price: 92400, status: "live" },
      { id: "chair-oak-c", source: "naver", label: "네이버 최저가", url: "https://example.com/naver/chair-oak", price: 93000, status: "live" },
    ],
  },
  {
    id: "table-2p",
    name: "원목 2인 테이블",
    category: "table",
    widthMm: 700,
    depthMm: 600,
    heightMm: 730,
    price: 190000,
    usedPrice: 114000,
    imageUrl: "/images/prod-chair.jpg",
    links: [
      { id: "table-2p-a", source: "partner", label: "마켓B", url: "https://example.com/market-b/table-2p", price: 190000, status: "live" },
      { id: "table-2p-b", source: "naver", label: "네이버 최저가", url: "https://example.com/naver/table-2p", price: 198000, status: "live" },
    ],
  },
  {
    id: "counter-bar",
    name: "바 카운터 2400",
    category: "counter",
    widthMm: 2400,
    depthMm: 600,
    heightMm: 1050,
    price: 1850000,
    imageUrl: "/images/prod-counter.jpg",
    links: [
      { id: "counter-bar-a", source: "partner", label: "마켓B", url: "https://example.com/market-b/counter-bar", price: 1850000, status: "live" },
    ],
  },
  {
    id: "lamp-pendant",
    name: "펜던트 조명 (유리)",
    category: "lamp",
    widthMm: 300,
    depthMm: 300,
    heightMm: 250,
    price: 48000,
    usedPrice: 29000,
    imageUrl: "/images/prod-lamp.jpg",
    links: [
      { id: "lamp-pendant-a", source: "coupang", label: "쿠팡", url: "https://example.com/coupang/lamp-pendant", price: 48000, status: "live" },
      { id: "lamp-pendant-b", source: "naver", label: "네이버 최저가", url: "https://example.com/naver/lamp-pendant", price: 51000, status: "live" },
    ],
  },
  {
    id: "fridge-showcase",
    name: "업소용 쇼케이스 냉장고",
    category: "fridge",
    widthMm: 1200,
    depthMm: 700,
    heightMm: 1900,
    price: 1280000,
    usedPrice: 780000,
    imageUrl: "/images/prod-counter.jpg",
    links: [
      { id: "fridge-showcase-a", source: "partner", label: "마켓B", url: "https://example.com/market-b/fridge", price: 1280000, status: "live" },
      { id: "fridge-showcase-b", source: "used", label: "폐업 매장 중고", url: "https://example.com/used/fridge", price: 780000, status: "live" },
    ],
  },
  {
    id: "espresso-machine",
    name: "2그룹 에스프레소 머신",
    category: "machine",
    widthMm: 760,
    depthMm: 580,
    heightMm: 520,
    price: 3900000,
    usedPrice: 2400000,
    imageUrl: "/images/prod-counter.jpg",
    links: [
      { id: "espresso-machine-a", source: "naver", label: "네이버 최저가", url: "https://example.com/naver/espresso", price: 3900000, status: "live" },
    ],
  },
  {
    id: "stool-bar",
    name: "바 스툴 (높이 650)",
    category: "chair",
    widthMm: 380,
    depthMm: 380,
    heightMm: 650,
    price: 64000,
    usedPrice: 38000,
    imageUrl: "/images/prod-chair.jpg",
    links: [
      { id: "stool-bar-a", source: "coupang", label: "쿠팡", url: "https://example.com/coupang/stool", price: 64000, status: "live" },
    ],
  },
  {
    id: "shelf-display",
    name: "진열 선반 (오픈형)",
    category: "shelf",
    widthMm: 900,
    depthMm: 350,
    heightMm: 1800,
    price: 220000,
    imageUrl: "/images/prod-counter.jpg",
    links: [
      { id: "shelf-display-a", source: "partner", label: "마켓B", url: "https://example.com/market-b/shelf", price: 220000, status: "live" },
    ],
  },
  {
    id: "reformer",
    name: "필라테스 리포머",
    category: "machine",
    widthMm: 2400,
    depthMm: 700,
    heightMm: 400,
    price: 2300000,
    usedPrice: 1400000,
    imageUrl: "/images/prod-counter.jpg",
    links: [
      { id: "reformer-a", source: "naver", label: "네이버 최저가", url: "https://example.com/naver/reformer", price: 2300000, status: "live" },
      { id: "reformer-b", source: "used", label: "폐업 매장 중고", url: "https://example.com/used/reformer", price: 1400000, status: "live" },
    ],
  },
  {
    id: "mirror-wall",
    name: "전신 벽거울 1200",
    category: "mirror",
    widthMm: 1200,
    depthMm: 30,
    heightMm: 1800,
    price: 180000,
    imageUrl: "/images/prod-lamp.jpg",
    links: [
      { id: "mirror-wall-a", source: "coupang", label: "쿠팡", url: "https://example.com/coupang/mirror", price: 180000, status: "live" },
    ],
  },
];

/** id로 상품 하나를 찾는다. 없으면 undefined. */
/** 판매처 링크를 실제 검색 주소로 맞춘 상품 목록 */
export const PRODUCTS: Product[] = RAW_PRODUCTS.map(withShoppingLinks);

export function findProduct(id: string): Product | undefined {
  return PRODUCTS.find((product) => product.id === id);
}
