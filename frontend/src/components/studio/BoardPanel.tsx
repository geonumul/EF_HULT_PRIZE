"use client";

// "상품 먼저" 방식의 오른쪽 패널. 집기 마켓에서 담은 상품(렌더링 보드)을 보여 주고 렌더링을 시작한다.
// 시안에 없는 화면이라 QuotePanel과 같은 폭과 줄 모양을 따랐다. docs/FEATURES.md 1번.
import Link from "next/link";
import { useRenderBoard } from "@/lib/renderBoard";
import { autoProductSet } from "@/lib/productSet";
import { isPartnerProduct } from "@/lib/shopping";
import type { UseType } from "@/types";
import { findProduct } from "@/mocks/products";
import { formatWon } from "@/lib/format";
import styles from "./BoardPanel.module.css";

type Props = {
  useType: UseType;
  areaM2: number;
  onRender: () => void;
  progress: number | null; // 렌더링 중이면 0~100, 아니면 null
};

export default function BoardPanel({ useType, areaM2, onRender, progress }: Props) {
  const board = useRenderBoard();

  /** 이 업종과 면적에 맞는 상품 세트를 보드에 담는다. 입점 업체 상품을 먼저 고르고, 없는 칸은 인터넷 상품으로 채운다. */
  function fillRecommended() {
    board.clear();
    for (const item of autoProductSet(useType, areaM2)) board.add(item.productId, item.qty);
  }
  const rows = board.items.flatMap((item) => {
    const product = findProduct(item.productId);
    return product ? [{ item, product }] : [];
  });
  const totalQty = rows.reduce((sum, row) => sum + row.item.qty, 0);
  const totalPrice = rows.reduce((sum, row) => sum + row.product.price * row.item.qty, 0);
  const isRunning = progress !== null;

  return (
    <>
      <div className={styles.head}>
        <p className={styles.title}>상품 먼저 렌더링</p>
        <p className={styles.sub}>
          {rows.length > 0 ? `집기 마켓에서 담은 상품 ${rows.length}종 · ${totalQty}개` : "렌더링 보드가 비어 있어요"}
        </p>
      </div>

      <div className={styles.list}>
        {rows.length === 0 && (
          <div className={styles.empty}>
            <p className={styles.emptyText}>집기 마켓에서 상품을 담아 주세요</p>
            <button type="button" className={styles.recommend} onClick={fillRecommended}>
              추천 상품 세트 담기
            </button>
            <p className={styles.emptyHint}>입점 업체 상품을 먼저 고르고, 없는 칸은 인터넷 상품으로 채워요.</p>
            <Link href="/market" className={styles.marketLink}>
              직접 고르러 집기 마켓 가기
            </Link>
          </div>
        )}

        {rows.map(({ item, product }) => (
          <div key={product.id} className={styles.row}>
            <img className={styles.thumb} src={product.imageUrl} alt="" />
            <div className={styles.rowText}>
              <span className={styles.rowName}>
                {isPartnerProduct(product) && <span className={styles.adChip}>광고</span>}
                {product.name}
              </span>
              <span className={styles.rowSpec}>
                W{product.widthMm} × D{product.depthMm} · {formatWon(product.price)}
              </span>
            </div>
            <div className={styles.stepper}>
              <button type="button" disabled={isRunning} onClick={() => board.setQty(product.id, item.qty - 1)} aria-label="수량 줄이기">
                −
              </button>
              <span>{item.qty}</span>
              <button type="button" disabled={isRunning} onClick={() => board.setQty(product.id, item.qty + 1)} aria-label="수량 늘리기">
                +
              </button>
            </div>
            <button type="button" className={styles.remove} disabled={isRunning} onClick={() => board.remove(product.id)} aria-label={`${product.name} 빼기`}>
              ×
            </button>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        {rows.length > 0 && (
          <div className={styles.sumRow}>
            <span className={styles.sumLabel}>보드 상품 합계 (신품)</span>
            <span className={styles.sum}>{formatWon(totalPrice)}</span>
          </div>
        )}
        {isRunning && (
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
        )}
        <button type="button" className={styles.render} disabled={rows.length === 0 || isRunning} onClick={onRender}>
          {isRunning ? `렌더링 중 ${progress}%` : "이 상품들로 렌더링"}
        </button>
      </div>
    </>
  );
}
