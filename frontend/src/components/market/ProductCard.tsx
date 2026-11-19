"use client";

// 마켓 상품 카드. Figma ProductCard 38:590에 치수, 신품·중고 가격, 판매처 링크, 담기 버튼을 더했다.
import { formatWon } from "@/lib/format";
import { useShoppingItem } from "@/lib/api/hooks";
import { isPartnerProduct } from "@/lib/shopping";
import type { Product } from "@/types";
import { CATEGORY_LABELS } from "./categories";
import styles from "./ProductCard.module.css";

type Props = {
  product: Product;
  showUsed: boolean; // 중고 보기 중이면 중고 가격을 크게 보여 준다.
  count: number; // 보드에 담긴 수량
  onAdd: () => void;
};

export default function ProductCard({ product, showUsed, count, onAdd }: Props) {
  const seller = product.links[0]; // 링크는 최저가 순으로 들어 있다.
  const hasLink = Boolean(seller);
  const partner = isPartnerProduct(product);
  const web = useShoppingItem(product.name, !partner); // 입점 업체가 없는 상품은 인터넷 최저가를 찾아 본다.
  const size = `${product.widthMm}×${product.depthMm}×${product.heightMm}mm`;
  const mainPrice = showUsed && product.usedPrice ? product.usedPrice : product.price;

  return (
    <article className={styles.card}>
      <div className={styles.photo}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.imageUrl} alt={product.name} className={styles.image} />
        <span className={showUsed ? styles.badgeUsed : styles.badge}>{showUsed ? "중고" : "신품"}</span>
        <button
          type="button"
          className={styles.plus}
          onClick={onAdd}
          disabled={!hasLink}
          aria-label={`${product.name} 렌더링 보드에 담기`}
        >
          +
        </button>
      </div>

      <p className={styles.category}>
        {CATEGORY_LABELS[product.category] ?? product.category}
        {partner && <span className={styles.partnerBadge}>광고 · 입점 업체</span>}
      </p>
      <p className={styles.name}>{product.name}</p>
      <p className={styles.size}>W·D·H {size}</p>
      <p className={styles.price}>{formatWon(mainPrice)}</p>
      <p className={styles.sub}>
        신품 {formatWon(product.price)}
        {product.usedPrice ? ` · 중고 ${formatWon(product.usedPrice)}` : " · 중고 없음"}
      </p>

      {web ? (
        <a className={styles.seller} href={web.url} target="_blank" rel="noopener noreferrer">
          인터넷 최저가 {web.mall} {formatWon(web.price)} <span>판매처 ↗</span>
        </a>
      ) : seller ? (
        <a className={styles.seller} href={seller.url} target="_blank" rel="noopener noreferrer">
          최저가 {seller.label} {formatWon(seller.price)} <span>판매처 ↗</span>
        </a>
      ) : (
        <p className={styles.noLink}>판매처 링크 없음</p>
      )}
      {!partner && <p className={styles.internet}>인터넷 상품 · 쇼핑몰 검색으로 연결</p>}

      <button type="button" className={styles.addButton} onClick={onAdd} disabled={!hasLink}>
        {count > 0 ? `렌더링 보드에 담기 (${count}개 담김)` : "렌더링 보드에 담기"}
      </button>
    </article>
  );
}
