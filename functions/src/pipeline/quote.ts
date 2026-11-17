// 7단계 견적 산출. 상품 id별 단가 x 수량을 합친다.
import type { Product, Quote, QuoteLine, RenderItem } from "../types";

// TODO: 설비·시공 단가는 시공사 견적 평균으로 더한다. 시공사 데이터가 생기면 추가한다.
export function buildQuote(items: RenderItem[], products: Product[]): Quote {
  const lines = items.map((item) => makeLine(item, products));
  const productsTotal = lines.reduce((sum, line) => sum + (line.amount ?? 0), 0);
  const findYourselfCount = lines.filter((line) => line.amount === null).length;
  return { lines, productsTotal, findYourselfCount };
}

function makeLine(item: RenderItem, products: Product[]): QuoteLine {
  const product = products.find((candidate) => candidate.id === item.productId);
  if (!product) {
    return { productId: null, label: item.label, qty: item.qty, unitPrice: null, amount: null };
  }
  return {
    productId: product.id,
    label: product.name,
    qty: item.qty,
    unitPrice: product.price,
    amount: product.price * item.qty,
  };
}
