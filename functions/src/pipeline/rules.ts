// Figma "AI 렌더링 파이프라인" 4단계 치수 규칙. 값을 바꿀 때는 이 파일만 고친다.
import type { ProductCategory } from "../types";

export const MIN_AISLE_MM = 850;
/** 배치할 때는 최소값보다 여유를 둔다. (Figma "상품 수집·적용"의 통로 900mm) */
export const LAYOUT_AISLE_MM = 900;
export const MIN_TABLE_GAP_MM = 600;
export const MIN_FIXTURE_GAP_MM = 100;
export const WALL_MARGIN_MM = 300;
export const CHAIR_DEPTH_MM = 450;
export const MAX_RELAYOUT_COUNT = 3;

export type ItemKind = "table" | "chair" | "fixture";

export function kindOfCategory(category: ProductCategory): ItemKind {
  if (category === "table") return "table";
  if (category === "chair") return "chair";
  return "fixture";
}

/** 같은 줄에서 나란히 놓이는 두 집기 사이에 필요한 최소 간격 */
export function requiredGapMm(a: ItemKind, b: ItemKind): number {
  if (a === "table" && b === "table") return MIN_TABLE_GAP_MM;
  if (a === "fixture" || b === "fixture") return MIN_FIXTURE_GAP_MM;
  return 0;
}

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  table: "테이블",
  chair: "의자",
  counter: "카운터",
  shelf: "선반",
  reformer: "리포머",
  locker: "사물함",
  lamp: "조명",
  etc: "기타 집기",
};
