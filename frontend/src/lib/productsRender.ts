// "상품 먼저" 렌더링 결과를 만든다. 렌더링 보드의 상품으로 태그를 직접 구성한다.
// 위치는 번호에 따라 규칙적으로 흩어 놓는다. 왼쪽 위는 치수 검증 카드가 차지해서 비워 둔다. 실제 서비스에서는 배치 단계가 위치를 정한다.
import type { RenderResult, RenderTag, UseType } from "@/types";
import type { BoardItem } from "@/lib/renderBoard";
import { findListing } from "@/mocks/listings";
import { findProduct } from "@/mocks/products";

const MAX_FLOOR_RATIO = 0.45; // 집기가 바닥에서 차지해도 되는 비율
const MIN_AISLE_MM = 850;
const MIN_CHAIR_GAP_MM = 500;

function makeTags(items: BoardItem[]): RenderTag[] {
  const tags: RenderTag[] = [];
  for (const item of items) {
    if (!findProduct(item.productId)) continue;
    const index = tags.length;
    tags.push({
      n: index + 1,
      x: 42 + ((index * 23) % 48),
      y: 25 + ((index * 37) % 50),
      productId: item.productId,
      qty: item.qty,
    });
  }
  return tags;
}

/** 놓인 집기의 바닥 면적이 공간 면적의 몇 %인지 구한다. (0~1) */
function floorRatio(items: BoardItem[], areaM2: number): number {
  let footprintM2 = 0;
  for (const item of items) {
    const product = findProduct(item.productId);
    if (!product) continue;
    footprintM2 += ((product.widthMm * product.depthMm) / 1_000_000) * item.qty;
  }
  return footprintM2 / areaM2;
}

/** 치수 검증 문구를 만든다. 문제가 있는 줄은 "확인 필요 · "로 시작한다. */
function makeChecks(items: BoardItem[], areaM2: number): string[] {
  const checks: string[] = [];

  const ratio = floorRatio(items, areaM2);
  const percent = Math.round(ratio * 100);
  const aisleMm = Math.max(300, Math.round((1500 - ratio * 1500) / 10) * 10);
  if (aisleMm >= MIN_AISLE_MM) {
    checks.push(`통로 폭 ${aisleMm.toLocaleString("ko-KR")}mm 확보 (기준 ${MIN_AISLE_MM}mm 이상)`);
  } else {
    checks.push(`확인 필요 · 통로 폭 ${aisleMm}mm (기준 ${MIN_AISLE_MM}mm 이상)`);
  }

  if (ratio <= MAX_FLOOR_RATIO) {
    checks.push(`바닥 점유율 ${percent}% (권장 ${MAX_FLOOR_RATIO * 100}% 이하)`);
  } else {
    checks.push(`확인 필요 · 바닥 점유율 ${percent}% (권장 ${MAX_FLOOR_RATIO * 100}% 이하)`);
  }

  const chairs = items
    .filter((item) => findProduct(item.productId)?.category === "chair")
    .reduce((sum, item) => sum + item.qty, 0);
  if (chairs > 0) {
    const gapMm = Math.max(200, 900 - chairs * 10);
    checks.push(
      gapMm >= MIN_CHAIR_GAP_MM
        ? `좌석 ${chairs}석 · 의자 간격 ${gapMm}mm 확보`
        : `확인 필요 · 좌석 ${chairs}석 · 의자 간격 ${gapMm}mm (기준 ${MIN_CHAIR_GAP_MM}mm 이상)`,
    );
  }

  const longestMm = Math.max(...items.map((item) => findProduct(item.productId)?.widthMm ?? 0));
  const roomWidthMm = Math.round(Math.sqrt(areaM2) * 1000);
  checks.push(
    longestMm <= roomWidthMm
      ? `가장 긴 집기 ${longestMm.toLocaleString("ko-KR")}mm는 공간 폭 ${roomWidthMm.toLocaleString("ko-KR")}mm 안에 들어가요`
      : `확인 필요 · 가장 긴 집기 ${longestMm.toLocaleString("ko-KR")}mm가 공간 폭 ${roomWidthMm.toLocaleString("ko-KR")}mm보다 길어요`,
  );

  return checks;
}

export function buildProductsRender(listingId: string, useType: UseType, items: BoardItem[]): RenderResult {
  const listing = findListing(listingId);
  return {
    id: `r-${listingId}-${useType}-products`,
    listingId,
    useType,
    mode: "products",
    imageUrl: `/images/render-${useType}.jpg`,
    tags: makeTags(items),
    checks: makeChecks(items, listing?.areaM2 ?? 30),
  };
}
