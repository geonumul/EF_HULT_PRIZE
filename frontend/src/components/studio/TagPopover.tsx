"use client";

// 태그를 눌렀을 때 뜨는 상품 카드. Figma TagPopover 30:307을 바탕으로,
// 시안에 없는 판매처 링크, 수량, 견적 담기 버튼을 더했다.
// 판매처 버튼은 /go/<링크id>가 생기기 전까지 상품 주소를 새 탭으로 연다.
import type { Product, RenderTag } from "@/types";
import { formatWon } from "@/lib/format";
import styles from "./TagPopover.module.css";

type Props = {
  tag: RenderTag;
  product: Product;
  qty: number;
  isUsed: boolean;
  isIncluded: boolean;
  onClose: () => void;
  onChangeQty: (qty: number) => void;
  onToggleUsed: () => void;
  onToggleIncluded: () => void;
};

const MAX_LINKS = 3;
const SAME_PRODUCT_SIMILARITY = 0.9;

/** 이미지 먼저 방식은 유사도로 같은 상품인지 가른다. 상품 먼저 방식은 고른 상품이라 항상 같은 상품이다. */
function similarityLabel(similarity?: number): string {
  if (similarity === undefined) return "같은 상품";
  const percent = Math.round(similarity * 100);
  return similarity >= SAME_PRODUCT_SIMILARITY ? `같은 상품 · ${percent}%` : `비슷한 상품 · ${percent}%`;
}

export default function TagPopover(props: Props) {
  const { tag, product, qty, isUsed, isIncluded } = props;
  const links = product.links.filter((link) => link.status === "live").slice(0, MAX_LINKS);
  const canUseUsed = product.usedPrice !== undefined;

  // 오른쪽 끝에 가까운 태그는 팝오버를 왼쪽에 연다.
  const opensLeft = tag.x > 60;
  const position = {
    top: `min(max(12px, calc(${tag.y}% - 140px)), calc(100% - 360px))`,
    ...(opensLeft ? { right: `calc(${100 - tag.x}% + 28px)` } : { left: `calc(${tag.x}% + 28px)` }),
  };

  return (
    <div className={styles.popover} style={position} onClick={(event) => event.stopPropagation()}>
      <button type="button" className={styles.close} onClick={props.onClose} aria-label="닫기">
        ×
      </button>

      <div className={styles.top}>
        <img className={styles.photo} src={product.imageUrl} alt="" />
        <div className={styles.info}>
          <p className={styles.number}>
            {tag.n}번 · {similarityLabel(tag.similarity)}
          </p>
          <p className={styles.name}>{product.name}</p>
          <p className={styles.size}>
            W{product.widthMm} × D{product.depthMm} × H{product.heightMm}mm
          </p>
        </div>
      </div>

      <div className={styles.priceRow}>
        <div>
          <p className={styles.price}>
            {formatWon(isUsed && product.usedPrice !== undefined ? product.usedPrice : product.price)}
            <span className={styles.times}> × {qty}</span>
          </p>
          {canUseUsed && !isUsed && (
            <p className={styles.usedHint}>중고 대안 {formatWon(product.usedPrice as number)}</p>
          )}
          {isUsed && <p className={styles.usedHint}>중고 가격으로 계산 중</p>}
        </div>
        <div className={styles.stepper}>
          <button type="button" onClick={() => props.onChangeQty(qty - 1)} disabled={qty <= 1} aria-label="수량 줄이기">
            −
          </button>
          <span>{qty}</span>
          <button type="button" onClick={() => props.onChangeQty(qty + 1)} aria-label="수량 늘리기">
            +
          </button>
        </div>
      </div>

      <div className={styles.links}>
        <p className={styles.linksTitle}>판매처</p>
        {links.length === 0 && <p className={styles.noLink}>살 수 있는 판매처가 없어요.</p>}
        {links.map((link) => (
          <a key={link.id} className={styles.link} href={link.url} target="_blank" rel="noopener noreferrer">
            <span>{link.label}</span>
            <span className={styles.linkPrice}>{formatWon(link.price)}</span>
          </a>
        ))}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondary}
          onClick={props.onToggleUsed}
          disabled={!canUseUsed}
        >
          {!canUseUsed ? "중고 상품 없음" : isUsed ? "신품으로 되돌리기" : "중고로 바꾸기"}
        </button>
        <button
          type="button"
          className={isIncluded ? styles.secondary : styles.primary}
          onClick={props.onToggleIncluded}
        >
          {isIncluded ? "견적에서 빼기" : "견적에 담기"}
        </button>
      </div>
    </div>
  );
}
