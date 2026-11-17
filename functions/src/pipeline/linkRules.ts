// 판매처 링크 점검 규칙. 상태 코드와 가격으로 status를 정하고 가격 변동을 판단한다.
import type { LinkStatus, ProductLink } from "../types";

export const PRICE_ALERT_RATIO = 0.05;

export interface LinkCheckResult {
  statusCode: number;
  soldOut: boolean;
  /** 페이지에서 가격을 읽지 못하면 null */
  price: number | null;
}

export interface LinkUpdate {
  status: LinkStatus;
  price: number;
  /** 가격이 5%를 넘게 바뀌었는지 */
  priceAlert: boolean;
  /** 죽었거나 품절이라 대체안이 필요한지 */
  needsAlternatives: boolean;
}

export function decideLinkUpdate(link: ProductLink, result: LinkCheckResult): LinkUpdate {
  const status = decideStatus(result);
  const price = result.price ?? link.price;
  const priceAlert = link.price > 0 && Math.abs(price - link.price) / link.price > PRICE_ALERT_RATIO;
  return { status, price, priceAlert, needsAlternatives: status !== "live" };
}

function decideStatus(result: LinkCheckResult): LinkStatus {
  if (result.statusCode === 404 || result.statusCode === 410) return "dead";
  if (result.soldOut) return "soldout";
  return "live";
}
