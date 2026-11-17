// checkProductLinks의 본체. 링크마다 상태와 가격을 다시 확인하고 대체안을 표시한다.
import type { Adapters } from "../adapters";
import { decideLinkUpdate } from "../pipeline/linkRules";

const ALTERNATIVE_LIMIT = 3;

export interface LinkCheckSummary {
  checked: number;
  changedStatus: number;
  priceAlerts: number;
}

export async function executeLinkCheck(adapters: Adapters): Promise<LinkCheckSummary> {
  const { db, linkChecker } = adapters;
  const links = await db.listProductLinks();
  const summary: LinkCheckSummary = { checked: 0, changedStatus: 0, priceAlerts: 0 };

  for (const link of links) {
    const result = await linkChecker.check(link);
    const update = decideLinkUpdate(link, result);

    const alternativeProductIds = update.needsAlternatives
      ? await db.findAlternativeProductIds(link.productId, ALTERNATIVE_LIMIT)
      : [];

    await db.updateProductLink(link.id, { status: update.status, price: update.price, alternativeProductIds });

    summary.checked += 1;
    if (update.status !== link.status) summary.changedStatus += 1;
    if (update.priceAlert) {
      summary.priceAlerts += 1;
      // TODO: 이 상품이 든 저장된 견적을 찾아 알림을 남긴다. quotes 스키마와 알림 방식이 정해지면 구현한다.
    }
  }

  return summary;
}
