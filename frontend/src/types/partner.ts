// 파트너 콘솔과 입점 문의에서 쓰는 타입. 금액은 만원 단위, 상품 가격은 원 단위다.
import type { Verdict } from "@/types";

export type ListingStatus = "게시 중" | "렌더링 생성 중" | "진단 보완 필요";

export type PartnerListing = {
  id: string;
  title: string; // "성수동2가 1층 39.6m²"
  deposit: number;
  rent: number;
  diagnoses: { label: string; verdict: Verdict }[]; // 업종 진단 배지
  views: number; // 렌더링 조회 수
  quotes: number; // 견적 확정 수
  status: ListingStatus;
  featured: boolean; // 상단 노출
};

export const PRODUCT_CONDITIONS = ["신품", "중고A", "중고B", "대여"] as const;
export type ProductCondition = (typeof PRODUCT_CONDITIONS)[number];

export type ProductReview = "검수 중" | "판매 중";

export type PartnerProduct = {
  id: string;
  name: string;
  category: string;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  price: number;
  condition: ProductCondition;
  stock: number;
  imageUrl: string;
  sellerUrl: string;
  regions: string;
  review: ProductReview;
};

export type InquiryType = "supply" | "link" | "builder" | "broker";
