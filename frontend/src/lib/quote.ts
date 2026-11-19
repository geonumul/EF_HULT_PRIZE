// 렌더링 결과에서 견적서를 계산한다. 스튜디오의 견적 패널과 견적 확정 화면이 같은 함수를 쓴다.
// 설비와 시공, 철거 단가는 화면을 채우기 위한 예시 값이다. 실제 단가표를 받으면 이 파일의 숫자만 바꾼다.
import type { Certainty, Quote, QuoteGroup, QuoteItem, RenderResult, UseType } from "@/types";
import { findListing } from "@/mocks/listings";
import { findProduct } from "@/mocks/products";
import { isPartnerProduct } from "@/lib/shopping";

const CONSTRUCTION_WON_PER_M2 = 450000; // 인테리어 시공 단가 (예시)
const DEMOLITION_WON_PER_M2 = 120000; // 철거 단가 (예시)

// 업종별 설비 추가 공사 (예시)
const FACILITY_BY_USE: Partial<Record<UseType, QuoteItem[]>> = {
  cafe: [
    { name: "급배수 공사", spec: "싱크대, 제빙기 배관", qty: 1, unitPrice: 2800000, certainty: "estimated" },
    { name: "환기·덕트", spec: "주방 후드 연결", qty: 1, unitPrice: 1900000, certainty: "estimated" },
  ],
  popup: [{ name: "전기 증설", spec: "조명, 콘센트 증설", qty: 1, unitPrice: 900000, certainty: "estimated" }],
  pilates: [
    { name: "바닥 방진 공사", spec: "층간 소음 대책", qty: 1, unitPrice: 3200000, certainty: "estimated" },
    { name: "환기 보강", spec: "운동 인원 기준", qty: 1, unitPrice: 1200000, certainty: "estimated" },
  ],
};

function sumOf(items: QuoteItem[]): number {
  return items.reduce((total, item) => total + item.unitPrice * item.qty, 0);
}

/** 항목의 확정 여부별 합계를 낸다. 합계 세 값은 항상 여기서 함께 만든다. */
export function totalsOf(groups: QuoteGroup[]): { total: number; confirmedTotal: number; estimatedTotal: number } {
  const sumBy = (certainty: Certainty) =>
    groups.reduce((sum, group) => sum + sumOf(group.items.filter((item) => item.certainty === certainty)), 0);
  const confirmedTotal = sumBy("confirmed");
  const estimatedTotal = sumBy("estimated");
  return { total: confirmedTotal + estimatedTotal, confirmedTotal, estimatedTotal };
}

/**
 * 철거 업체가 확정한 금액을 견적서의 "철거" 그룹에 반영한다.
 * 철거 그룹이 없는 견적(빈 공간)은 그대로 돌려준다.
 */
export function withConfirmedDemolition(quote: Quote, amountWon: number): Quote {
  const hasDemolition = quote.groups.some((group) => group.key === "demolition");
  if (!hasDemolition) return quote;

  const groups = quote.groups.map((group) => {
    if (group.key !== "demolition") return group;
    const item: QuoteItem = {
      name: "철거 (업체 확정)",
      spec: "선택한 업체의 확정 견적",
      qty: 1,
      unitPrice: amountWon,
      certainty: "confirmed",
    };
    return { ...group, sum: amountWon, items: [item] };
  });
  return { ...quote, groups, ...totalsOf(groups) };
}

/**
 * 견적서를 만든다.
 * usedProductIds에 든 상품은 신품 대신 중고 가격으로 계산한다.
 */
export function buildQuote(render: RenderResult, usedProductIds: string[] = []): Quote {
  const listing = findListing(render.listingId);

  // 1. 집기 (렌더링 태그 하나가 상품 한 종류다)
  const productItems: QuoteItem[] = [];
  let usedSaving = 0;
  for (const tag of render.tags) {
    const product = findProduct(tag.productId);
    if (!product) continue;
    const useUsed = usedProductIds.includes(product.id) && product.usedPrice !== undefined;
    const unitPrice = useUsed ? (product.usedPrice as number) : product.price;
    if (!useUsed && product.usedPrice !== undefined) {
      usedSaving += (product.price - product.usedPrice) * tag.qty;
    }
    // 입점 업체 상품을 신품으로 쓰면 가격이 확정이다. 인터넷 상품과 중고는 가격이 바뀔 수 있어 예상이다.
    const isPartner = isPartnerProduct(product);
    const certainty: Certainty = isPartner && !useUsed ? "confirmed" : "estimated";
    productItems.push({
      name: product.name,
      spec: `W${product.widthMm} × D${product.depthMm} · ${useUsed ? "중고" : "신품"}`,
      qty: tag.qty,
      unitPrice,
      productId: product.id,
      certainty,
      source: useUsed ? "used" : isPartner ? "partner" : "internet",
    });
  }

  const groups: QuoteGroup[] = [
    { key: "items", title: "집기", sum: sumOf(productItems), items: productItems },
  ];

  // 2. 설비 추가 공사
  const facilityItems = FACILITY_BY_USE[render.useType] ?? [];
  groups.push({ key: "facility", title: "설비 추가 공사", sum: sumOf(facilityItems), items: facilityItems });

  // 3. 인테리어 시공
  const area = listing?.areaM2 ?? 0;
  const constructionItems: QuoteItem[] = [
    { name: "인테리어 시공", spec: `${area}m² 기준 평균 단가`, qty: 1, unitPrice: Math.round(area * CONSTRUCTION_WON_PER_M2), certainty: "estimated" },
  ];
  groups.push({ key: "construction", title: "인테리어 시공", sum: sumOf(constructionItems), items: constructionItems });

  // 4. 철거. 빈 공간이 아닐 때만 들어간다.
  if (listing && listing.condition !== "vacant") {
    const ratio = listing.condition === "occupied" ? 1 : 0.5; // 집기만 남은 곳은 부분 철거
    const demolitionItems: QuoteItem[] = [
      {
        name: listing.condition === "occupied" ? "전체 철거" : "부분 철거",
        spec: `${area}m² 기준 (업체 견적으로 확정)`,
        qty: 1,
        unitPrice: Math.round(area * DEMOLITION_WON_PER_M2 * ratio),
        certainty: "estimated",
      },
    ];
    groups.push({ key: "demolition", title: "철거", sum: sumOf(demolitionItems), items: demolitionItems });
  }

  return { id: render.id, renderId: render.id, groups, ...totalsOf(groups), usedSaving };
}
