// 파트너 콘솔의 가짜 데이터. 공실 목록은 Figma S10(40:482)의 표를 그대로 옮겼다.
import type { PartnerListing, PartnerProduct } from "@/types/partner";

export const PARTNER_COMPANY = "성수공인중개사사무소";

export const INITIAL_LISTINGS: PartnerListing[] = [
  {
    id: "pl-1",
    title: "성수동2가 1층 39.6m²",
    deposit: 3000,
    rent: 180,
    diagnoses: [
      { label: "카페 가능", verdict: "possible" },
      { label: "팝업 가능", verdict: "possible" },
      { label: "필라테스 조건부", verdict: "conditional" },
    ],
    views: 1204,
    quotes: 22,
    status: "게시 중",
    featured: true,
  },
  {
    id: "pl-2",
    title: "뚝섬역 1층 46.2m²",
    deposit: 3500,
    rent: 210,
    diagnoses: [
      { label: "카페 가능", verdict: "possible" },
      { label: "필라테스 가능", verdict: "possible" },
    ],
    views: 862,
    quotes: 15,
    status: "게시 중",
    featured: true,
  },
  {
    id: "pl-3",
    title: "서울숲 1층 코너 33.0m²",
    deposit: 2000,
    rent: 160,
    diagnoses: [
      { label: "팝업 가능", verdict: "possible" },
      { label: "카페 조건부", verdict: "conditional" },
    ],
    views: 640,
    quotes: 11,
    status: "게시 중",
    featured: false,
  },
  {
    id: "pl-4",
    title: "성수역 2층 105.8m²",
    deposit: 5000,
    rent: 320,
    diagnoses: [
      { label: "필라테스 가능", verdict: "possible" },
      { label: "카페 조건부", verdict: "conditional" },
    ],
    views: 418,
    quotes: 9,
    status: "렌더링 생성 중",
    featured: false,
  },
  {
    id: "pl-5",
    title: "성수동1가 지하 52.1m²",
    deposit: 2500,
    rent: 140,
    diagnoses: [
      { label: "팝업 조건부", verdict: "conditional" },
      { label: "카페 불가", verdict: "impossible" },
    ],
    views: 0,
    quotes: 0,
    status: "진단 보완 필요",
    featured: false,
  },
];

export const INITIAL_PRODUCTS: PartnerProduct[] = [
  {
    id: "pp-1",
    name: "오크 원목 체어",
    category: "의자·테이블",
    widthMm: 450,
    depthMm: 520,
    heightMm: 780,
    price: 89000,
    condition: "신품",
    stock: 120,
    imageUrl: "https://example.com/images/chair-oak.jpg",
    sellerUrl: "https://example.com/market-b/chair-oak",
    regions: "전국",
    review: "판매 중",
  },
  {
    id: "pp-2",
    name: "원목 2인 테이블",
    category: "의자·테이블",
    widthMm: 700,
    depthMm: 600,
    heightMm: 730,
    price: 114000,
    condition: "중고A",
    stock: 8,
    imageUrl: "https://example.com/images/table-2p.jpg",
    sellerUrl: "https://example.com/market-b/table-2p",
    regions: "서울, 경기",
    review: "판매 중",
  },
  {
    id: "pp-3",
    name: "라운드 펜던트 조명",
    category: "조명",
    widthMm: 400,
    depthMm: 400,
    heightMm: 300,
    price: 56000,
    condition: "신품",
    stock: 34,
    imageUrl: "https://example.com/images/lamp-round.jpg",
    sellerUrl: "https://example.com/market-b/lamp-round",
    regions: "전국",
    review: "검수 중",
  },
];

export const PRODUCT_CATEGORIES = ["의자·테이블", "조명", "주방 설비", "운동 기구", "진열·수납", "바닥·벽 자재", "기타"];

export type QuoteRequestRow = { id: string; customer: string; space: string; item: string; date: string; state: string };

export const QUOTE_REQUESTS: QuoteRequestRow[] = [
  { id: "q-1", customer: "김○○ 예비 창업자", space: "성수동2가 1층 39.6m²", item: "카페 렌더링 견적 문의", date: "11월 15일", state: "답변 대기" },
  { id: "q-2", customer: "이○○ 예비 창업자", space: "뚝섬역 1층 46.2m²", item: "필라테스 견적 문의", date: "11월 14일", state: "답변 완료" },
  { id: "q-3", customer: "박○○ 예비 창업자", space: "서울숲 1층 코너 33.0m²", item: "팝업 단기 임대 문의", date: "11월 12일", state: "답변 완료" },
];

export type SettlementRow = { id: string; month: string; sales: number; fee: number; state: string };

export const SETTLEMENTS: SettlementRow[] = [
  { id: "s-1", month: "2026년 11월", sales: 2150000, fee: 215000, state: "정산 예정 (12월 10일)" },
  { id: "s-2", month: "2026년 10월", sales: 4820000, fee: 482000, state: "정산 완료" },
  { id: "s-3", month: "2026년 9월", sales: 3610000, fee: 361000, state: "정산 완료" },
];
