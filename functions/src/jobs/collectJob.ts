// collectProducts의 본체. 카테고리 키워드로 검색해 정규화하고 임베딩해서 저장한다.
import type { Adapters } from "../adapters";
import { normalizeItem } from "../pipeline/normalize";

// TODO: 키워드는 임시값이다. 업종별 필요한 집기 목록이 정해지면 바꾼다.
export const CATEGORY_KEYWORDS = ["카페 의자", "카페 테이블", "바 카운터", "진열 선반", "펜던트 조명", "필라테스 리포머", "사물함"];
const ITEMS_PER_KEYWORD = 20;

export interface CollectSummary {
  collected: number;
  needsSupplierDimensions: number;
}

export async function executeCollect(adapters: Adapters): Promise<CollectSummary> {
  const { db, embedder, shopSearches } = adapters;
  const summary: CollectSummary = { collected: 0, needsSupplierDimensions: 0 };

  for (const shop of shopSearches) {
    for (const keyword of CATEGORY_KEYWORDS) {
      const rawItems = await shop.search(keyword, ITEMS_PER_KEYWORD);
      for (const raw of rawItems) {
        const item = normalizeItem(raw);
        const embedding = await embedder.embedUrl(item.imageUrl);
        await db.saveCollectedProduct(item, embedding);

        summary.collected += 1;
        if (item.needsSupplierDimensions) summary.needsSupplierDimensions += 1;
      }
    }
  }

  return summary;
}
