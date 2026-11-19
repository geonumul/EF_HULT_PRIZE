// 업종 템플릿. 어떤 집기를 몇 개 놓을지 정하고, 상품 치수로 배치할 물건 목록을 만든다.
import type { Product, ProductCategory, Room } from "../types";
import type { LayoutUnit } from "./layout";
import { ruleOf } from "./knowledge";
import { CHAIR_DEPTH_MM, kindOfCategory } from "./rules";

interface TemplateEntry {
  category: ProductCategory;
  /** 1제곱미터당 개수. 반올림하고 최소 1개 */
  perSqm?: number;
  /** 면적과 상관없는 고정 개수 */
  fixed?: number;
  /** 테이블 하나에 딸리는 의자 수 */
  chairsPerUnit?: number;
  /** 기구 둘레에 두는 여유(mm, 한쪽). 리포머처럼 사방에 공간이 필요한 기구에 쓴다. */
  clearanceMm?: number;
}

// 카페 39.6m²이면 2인 테이블 11, 의자 22, 바 카운터 1이 나온다. (Figma "상품 수집·적용" 4단계)
// TODO: 업종별 개수 비율은 임시값이다. 업종 전문가 확인 후 조정한다.
const TEMPLATES: Record<string, TemplateEntry[]> = {
  cafe: [
    { category: "table", perSqm: 0.28, chairsPerUnit: 2 },
    { category: "counter", fixed: 1 },
    { category: "lamp", perSqm: 0.1 },
  ],
  popup: [
    { category: "shelf", perSqm: 0.15 },
    { category: "counter", fixed: 1 },
  ],
  pilates: [
    // 리포머 사이 간격 900을 기구마다 양쪽 450씩 나눠 둔다.
    { category: "reformer", perSqm: 0.12, clearanceMm: (ruleOf("pilates.gap").value as number) / 2 },
    { category: "locker", fixed: 1 },
  ],
};

const FALLBACK_USE_TYPE = "popup";

export function roomAreaSqm(room: Room): number {
  return (room.widthMm * room.depthMm) / 1_000_000;
}

function countFor(entry: TemplateEntry, areaSqm: number): number {
  if (entry.fixed !== undefined) return entry.fixed;
  return Math.max(1, Math.round((entry.perSqm ?? 1) * areaSqm));
}

function cheapestOf(catalog: Product[], category: ProductCategory): Product | undefined {
  return catalog.filter((product) => product.category === category).sort((a, b) => a.price - b.price)[0];
}

export interface TemplateResult {
  units: LayoutUnit[];
  /** 카탈로그에 상품이 없어서 놓지 못한 카테고리 */
  missingCategories: ProductCategory[];
}

export function unitsFromTemplate(useType: string, room: Room, catalog: Product[]): TemplateResult {
  const entries = TEMPLATES[useType] ?? TEMPLATES[FALLBACK_USE_TYPE];
  const areaSqm = roomAreaSqm(room);
  const units: LayoutUnit[] = [];
  const missingCategories: ProductCategory[] = [];

  for (const entry of entries) {
    const product = cheapestOf(catalog, entry.category);
    if (!product) {
      missingCategories.push(entry.category);
      continue;
    }
    const chair = entry.chairsPerUnit ? cheapestOf(catalog, "chair") : undefined;
    const count = countFor(entry, areaSqm);
    for (let i = 0; i < count; i += 1) {
      units.push(makeUnit(product, entry.chairsPerUnit ?? 0, chair, entry.clearanceMm ?? 0));
    }
  }

  return { units, missingCategories };
}

/** products 모드. 고른 상품 하나가 물건 하나다. 같은 id를 여러 번 넣으면 그 수량이다. */
export function unitsFromProducts(products: Product[]): LayoutUnit[] {
  return products.map((product) => makeUnit(product, 0, undefined));
}

function makeUnit(product: Product, chairs: number, chair: Product | undefined, clearanceMm = 0): LayoutUnit {
  // 의자는 테이블 긴 변 양쪽에 놓이므로 발자국 깊이에 의자 깊이를 두 번 더한다.
  const chairDepth = chairs > 0 ? CHAIR_DEPTH_MM * 2 : 0;
  return {
    productId: product.id,
    name: product.name,
    kind: kindOfCategory(product.category),
    widthMm: product.widthMm + 2 * clearanceMm,
    depthMm: product.depthMm + chairDepth + 2 * clearanceMm,
    chairs,
    chairProductId: chair?.id ?? null,
    heightMm: product.heightMm,
    chairHeightMm: chair?.heightMm,
    clearanceMm: clearanceMm || undefined,
  };
}
