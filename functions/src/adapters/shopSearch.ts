// 네이버 쇼핑 검색과 쿠팡 파트너스 어댑터. 지금은 가짜 구현만 있다.
import type { LinkSource } from "../types";
import type { RawShopItem } from "../pipeline/normalize";

export interface ShopSearch {
  source: LinkSource;
  search(keyword: string, limit: number): Promise<RawShopItem[]>;
}

export class FakeShopSearch implements ShopSearch {
  constructor(public readonly source: "naver" | "coupang") {}

  async search(keyword: string, limit: number): Promise<RawShopItem[]> {
    const items: RawShopItem[] = [
      this.makeItem(`${keyword} 오크 원목 W450 D520 H780`, 89000, 1),
      this.makeItem(`${keyword} 블랙 철제 600x600x720mm`, 129000, 2),
      this.makeItem(`${keyword} 치수 미표기 상품`, 49000, 3),
    ];
    return items.slice(0, limit);
  }

  private makeItem(title: string, price: number, number: number): RawShopItem {
    const url = `https://example.com/${this.source}/${number}`;
    return {
      source: this.source,
      title,
      price,
      imageUrl: `${url}.jpg`,
      url,
      affiliateUrl: this.source === "coupang" ? `${url}?partner=fake` : null,
    };
  }
}

// TODO: 네이버 쇼핑 검색 API(NAVER_CLIENT_ID, NAVER_CLIENT_SECRET) 구현. 응답 필드는 공식 문서 확인 후 작성한다.
// TODO: 쿠팡 파트너스 API(COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY) 구현. 서명 방식과 응답 필드는 공식 문서 확인 후 작성한다.
