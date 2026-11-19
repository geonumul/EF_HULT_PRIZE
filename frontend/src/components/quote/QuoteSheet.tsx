"use client";
// 견적서 상세. 집기 행마다 신품/중고 전환과 판매처 링크가 있다.
import type { Product, Quote } from "@/types";
import { findProduct } from "@/mocks/products";
import { formatWon } from "@/lib/format";
import { AdChip, CertaintyChip } from "./CertaintyChip";
import styles from "./QuoteSheet.module.css";

type Props = {
  quote: Quote;
  usedIds: string[];
  onToggleUsed: (productId: string) => void;
};

/** 중고 선택이면 중고 판매처, 아니면 가장 싼 정상 판매처의 링크를 돌려준다. */
export function pickLink(product: Product, isUsed: boolean) {
  const live = product.links.filter((link) => link.status === "live");
  if (isUsed) return live.find((link) => link.source === "used") ?? live[0];
  return live.find((link) => link.source !== "used") ?? live[0];
}

export default function QuoteSheet({ quote, usedIds, onToggleUsed }: Props) {
  return (
    <section className={styles.card}>
      <h2 className={styles.title}>견적서 상세</h2>
      {quote.groups.map((group) => (
        <div key={group.key} className={styles.group}>
          <div className={styles.groupHead}>
            <span>{group.title}</span>
            <span>{formatWon(group.sum)}</span>
          </div>
          {group.items.map((item) => {
            const product = item.productId ? findProduct(item.productId) : undefined;
            const isUsed = !!product && usedIds.includes(product.id);
            const link = product ? pickLink(product, isUsed) : undefined;
            return (
              <div key={item.name} className={styles.item}>
                <div className={styles.info}>
                  <p className={styles.name}>
                    {item.source === "partner" && <AdChip />} {item.name}
                  </p>
                  <p className={styles.spec}>
                    {item.spec} · {formatWon(item.unitPrice)} × {item.qty}
                    {item.source === "internet" && " · 인터넷 최저가 기준"}
                  </p>
                </div>

                {product && product.usedPrice !== undefined && (
                  <div className={styles.toggle} role="group" aria-label={`${item.name} 신품 또는 중고`}>
                    <button
                      type="button"
                      className={isUsed ? styles.option : `${styles.option} ${styles.optionOn}`}
                      aria-pressed={!isUsed}
                      onClick={() => isUsed && onToggleUsed(product.id)}
                    >
                      신품
                    </button>
                    <button
                      type="button"
                      className={isUsed ? `${styles.option} ${styles.optionOn}` : styles.option}
                      aria-pressed={isUsed}
                      onClick={() => !isUsed && onToggleUsed(product.id)}
                    >
                      중고
                    </button>
                  </div>
                )}

                {link && (
                  <a className={styles.linkButton} href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                )}

                <div className={styles.priceBox}>
                  <p className={styles.price}>{formatWon(item.unitPrice * item.qty)}</p>
                  <CertaintyChip certainty={item.certainty} />
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}
