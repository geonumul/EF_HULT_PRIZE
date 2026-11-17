// 렌더링 결과에서 견적서를 계산한다. 스튜디오의 견적 패널과 견적 확정 화면이 같은 함수를 쓴다.
// 설비와 시공, 철거 단가는 화면을 채우기 위한 예시 값이다. 실제 단가표를 받으면 이 파일의 숫자만 바꾼다.
import type { Quote, QuoteGroup, QuoteItem, RenderResult, UseType } from "@/types";
import { findListing } from "@/mocks/listings";
import { findProduct } from "@/mocks/products";

const CONSTRUCTION_WON_PER_M2 = 450000; // 인테리어 시공 단가 (예시)
const DEMOLITION_WON_PER_M2 = 120000; // 철거 단가 (예시)

// 업종별 설비 추가 공사 (예시)
const FACILITY_BY_USE: Partial<Record<UseType, QuoteItem[]>> = {
  cafe: [
    { name: "급배수 공사", spec: "싱크대, 제빙기 배관", qty: 1, unitPrice: 2800000 },
    { name: "환기·덕트", spec: "주방 후드 연결", qty: 1, unitPrice: 1900000 },
  ],
  popup: [{ name: "전기 증설", spec: "조명, 콘센트 증설", qty: 1, unitPrice: 900000 }],
  pilates: [
    { name: "바닥 방진 공사", spec: "층간 소음 대책", qty: 1, unitPrice: 3200000 },
    { name: "환기 보강", spec: "운동 인원 기준", qty: 1, unitPrice: 1200000 },
  ],
};

function sumOf(items: QuoteItem[]): number {
  return items.reduce((total, item) => total + item.unitPrice * item.qty, 0);
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
    const item: QuoteItem = { name: "철거 (업체 확정)", spec: "선택한 업체의 확정 견적", qty: 1, unitPrice: amountWon };
    return { ...group, sum: amountWon, items: [item] };
  });
  const total = groups.reduce((sum, group) => sum + group.sum, 0);
  return { ...quote, groups, total };
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
    productItems.push({
      name: product.name,
      spec: `W${product.widthMm} × D${product.depthMm} · ${useUsed ? "중고" : "신품"}`,
      qty: tag.qty,
      unitPrice,
      productId: product.id,
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
    { name: "인테리어 시공", spec: `${area}m² 기준 평균 단가`, qty: 1, unitPrice: Math.round(area * CONSTRUCTION_WON_PER_M2) },
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
      },
    ];
    groups.push({ key: "demolition", title: "철거", sum: sumOf(demolitionItems), items: demolitionItems });
  }

  const total = groups.reduce((sum, group) => sum + group.sum, 0);
  return { id: render.id, renderId: render.id, groups, total, usedSaving };
}
