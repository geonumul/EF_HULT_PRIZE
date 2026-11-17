// 배치 결과에서 render_items를 만든다. products 모드는 상품 id가 태그이고, text 모드는 검출과 유사도로 정한다.
import type { ImageEmbedder } from "../adapters/imageEmbedder";
import type { ObjectDetector } from "../adapters/objectDetector";
import type { Database } from "../adapters/supabaseClient";
import type { Layout, PlacedItem } from "../pipeline/layout";
import { classifyMatch } from "../pipeline/matching";
import { CATEGORY_LABELS } from "../pipeline/rules";
import type { Product, ProductCategory, RenderItem, Room } from "../types";

/** products 모드. 상품 id마다 한 줄이고 수량은 배치된 개수다. */
export function itemsFromSelectedProducts(room: Room, layout: Layout, products: Product[]): RenderItem[] {
  const items: RenderItem[] = [];

  for (const product of [...new Set(products)]) {
    const placed = layout.placed.filter((item) => item.productId === product.id);
    if (placed.length === 0) continue;
    items.push({
      productId: product.id,
      label: product.name,
      category: product.category,
      matchType: "selected",
      similarity: null,
      qty: placed.length,
      // TODO: 이미지 속 위치는 카메라 투영이 필요하다. 지금은 평면 위치를 0~1로 바꾼 값이다.
      tag: planPosition(room, placed[0]),
      candidates: [],
    });
  }

  return items;
}

function planPosition(room: Room, item: PlacedItem): { x: number; y: number } {
  return {
    x: (item.x + item.widthMm / 2) / room.widthMm,
    y: (item.y + item.depthMm / 2) / room.depthMm,
  };
}

/** 배치된 개수. 테이블에 딸린 의자는 chair로 센다. */
export function countByCategory(layout: Layout, catalog: Product[]): Map<ProductCategory, number> {
  const counts = new Map<ProductCategory, number>();
  const add = (category: ProductCategory, amount: number) => counts.set(category, (counts.get(category) ?? 0) + amount);

  for (const item of layout.placed) {
    const product = catalog.find((candidate) => candidate.id === item.productId);
    if (product) add(product.category, 1);
    if (item.chairs > 0) add("chair", item.chairs);
  }
  return counts;
}

interface MatchDeps {
  db: Database;
  detector: ObjectDetector;
  embedder: ImageEmbedder;
}

/** text 모드 6단계. 이미지에서 집기를 찾고 임베딩 유사도 상위 3개로 상품을 정한다. */
export async function itemsFromDetection(
  deps: MatchDeps,
  image: Uint8Array,
  counts: Map<ProductCategory, number>,
): Promise<RenderItem[]> {
  const labels = [...counts.keys()];
  const detections = await deps.detector.detect(image, labels);
  const items: RenderItem[] = [];

  for (const detection of detections) {
    const embedding = await deps.embedder.embedBytes(detection.crop);
    const found = await deps.db.findSimilarProducts(embedding, 3);
    const match = classifyMatch(found);
    const center = { x: detection.box.x + detection.box.width / 2, y: detection.box.y + detection.box.height / 2 };

    items.push({
      productId: match.productId,
      label: CATEGORY_LABELS[detection.category],
      category: detection.category,
      matchType: match.matchType,
      similarity: match.similarity,
      qty: counts.get(detection.category) ?? 1,
      // 맞는 상품이 없으면 태그를 달지 않는다. 견적에서 "직접 찾기"로 남는다.
      tag: match.productId ? center : null,
      candidates: match.candidates,
    });
  }

  return items;
}
