"use client";

// 렌더링 보드 패널. 시안에 없는 추가 기능이다. 화면 오른쪽 아래에 고정하고 접고 펼 수 있다.
import Link from "next/link";
import { useState } from "react";
import { formatWon } from "@/lib/format";
import { useRenderBoard } from "@/lib/renderBoard";
import { findProduct } from "@/mocks/products";
import styles from "./RenderBoardPanel.module.css";

export default function RenderBoardPanel() {
  const { items, setQty, remove, clear } = useRenderBoard();
  const [open, setOpen] = useState(false);

  // 상품 정보를 찾을 수 없는 항목은 목록에서 뺀다.
  const rows = items.flatMap((item) => {
    const product = findProduct(item.productId);
    return product ? [{ product, qty: item.qty }] : [];
  });
  const totalCount = rows.reduce((sum, row) => sum + row.qty, 0);
  const totalPrice = rows.reduce((sum, row) => sum + row.product.price * row.qty, 0);

  return (
    <aside className={styles.wrap} aria-label="렌더링 보드">
      {open && (
        <div className={styles.panel}>
          <div className={styles.head}>
            <p className={styles.title}>렌더링 보드 · {totalCount}개</p>
            <button type="button" className={styles.clear} onClick={clear} disabled={rows.length === 0}>
              비우기
            </button>
          </div>

          {rows.length === 0 ? (
            <p className={styles.empty}>상품 카드의 + 버튼으로 렌더링에 쓸 상품을 담아 보세요.</p>
          ) : (
            <ul className={styles.list}>
              {rows.map(({ product, qty }) => (
                <li key={product.id} className={styles.row}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.imageUrl} alt="" className={styles.thumb} />
                  <div className={styles.info}>
                    <p className={styles.name}>{product.name}</p>
                    <p className={styles.price}>{formatWon(product.price * qty)}</p>
                  </div>
                  <div className={styles.qty}>
                    <button type="button" onClick={() => setQty(product.id, qty - 1)} aria-label="수량 줄이기">
                      −
                    </button>
                    <span>{qty}</span>
                    <button type="button" onClick={() => setQty(product.id, qty + 1)} aria-label="수량 늘리기">
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className={styles.remove}
                    onClick={() => remove(product.id)}
                    aria-label={`${product.name} 삭제`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className={styles.total}>
            <span>신품 기준 합계</span>
            <strong>{formatWon(totalPrice)}</strong>
          </div>
          <p className={styles.guide}>공실을 고른 뒤 스튜디오에서 &lsquo;상품 먼저&rsquo;를 선택하세요</p>
          {rows.length > 0 ? (
            <Link href="/map" className={styles.go}>
              이 상품들로 렌더링
            </Link>
          ) : (
            <span className={styles.goDisabled}>이 상품들로 렌더링</span>
          )}
        </div>
      )}

      <button type="button" className={styles.toggle} onClick={() => setOpen(!open)} aria-expanded={open}>
        렌더링 보드 <span className={styles.count}>{totalCount}</span>
      </button>
    </aside>
  );
}
