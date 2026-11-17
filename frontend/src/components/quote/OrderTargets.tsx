// 발주 대상. 판매처별로 상품을 묶어 보여 주고, 시공사 줄을 덧붙인다.
import type { Quote } from "@/types";
import { findProduct } from "@/mocks/products";
import { pickLink } from "./QuoteSheet";
import styles from "./OrderTargets.module.css";

type Target = { name: string; detail: string; status: string; ready: boolean };

function buildTargets(quote: Quote): Target[] {
  const bySeller = new Map<string, { names: string[]; isUsed: boolean }>();
  for (const item of quote.groups[0].items) {
    const product = item.productId ? findProduct(item.productId) : undefined;
    if (!product) continue;
    const isUsed = item.spec.endsWith("중고");
    const seller = pickLink(product, isUsed)?.label ?? "직접 구매";
    const entry = bySeller.get(seller) ?? { names: [], isUsed };
    entry.names.push(`${item.name} ${item.qty}`);
    bySeller.set(seller, entry);
  }

  const targets: Target[] = [];
  bySeller.forEach((entry, seller) => {
    targets.push({
      name: seller,
      detail: entry.names.join(" · "),
      status: entry.isUsed ? "중고 검수 대기" : "재고 확인 완료",
      ready: !entry.isUsed,
    });
  });
  targets.push({ name: "시공사 3곳", detail: "바닥·벽·전기·급배수", status: "견적 비교 중", ready: false });
  if (quote.groups.some((group) => group.key === "demolition")) {
    targets.push({ name: "철거 업체", detail: "철거 범위 확인", status: "견적 비교 중", ready: false });
  }
  return targets;
}

export default function OrderTargets({ quote }: { quote: Quote }) {
  return (
    <section className={styles.card}>
      <h2 className={styles.title}>발주 대상</h2>
      {buildTargets(quote).map((target) => (
        <div key={target.name} className={styles.row}>
          <span className={styles.initial}>{target.name.charAt(0)}</span>
          <div className={styles.text}>
            <p className={styles.name}>{target.name}</p>
            <p className={styles.detail}>{target.detail}</p>
          </div>
          <span className={target.ready ? `${styles.badge} ${styles.ready}` : styles.badge}>{target.status}</span>
        </div>
      ))}
    </section>
  );
}
