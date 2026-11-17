// 판매처 URL의 상태 코드와 가격을 읽는 어댑터. 판매처마다 가격을 읽는 방법이 달라 따로 뒀다.
import type { LinkCheckResult } from "../pipeline/linkRules";
import type { ProductLink } from "../types";

export interface LinkChecker {
  check(link: ProductLink): Promise<LinkCheckResult>;
}

/** 모든 링크가 정상이고 가격이 그대로라고 답한다. */
export class FakeLinkChecker implements LinkChecker {
  async check(link: ProductLink): Promise<LinkCheckResult> {
    return { statusCode: 200, soldOut: false, price: link.price };
  }
}

// TODO: 판매처별 상태 코드 확인과 가격 읽기 구현. 네이버와 쿠팡은 공식 API 문서를 확인하고, 그 외 URL은 약관을 확인한다.
