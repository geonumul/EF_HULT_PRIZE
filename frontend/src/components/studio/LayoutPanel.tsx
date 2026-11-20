"use client";

// 오른쪽 패널의 "배치" 탭. 상품 추가, 다른 배치안, 되돌리기, 평면도 편집이 여기에 모여 있다.
import { useEffect, useMemo, useState } from "react";
import { formatWon } from "@/lib/format";
import { placeableProducts } from "@/lib/scene";
import type { Product, UseType } from "@/types";
import type { Scene } from "@/types/scene";
import PlanEditor from "./PlanEditor";
import styles from "./LayoutPanel.module.css";

type Props = {
  scene: Scene;
  useType: UseType;
  canUndo: boolean;
  onChange: (next: Scene) => void;
  onUndo: () => void;
  onReset: () => void;
  /** 같은 가구로 다른 배치안을 만들고 결과 문장을 돌려준다. */
  onRearrange: () => string;
  /** 상품을 도면에 놓고 결과 문장을 돌려준다. */
  onAddProduct: (product: Product) => string;
  eye?: { x: number; y: number; yawDeg: number } | null;
  onEyeMove?: (x: number, y: number) => void;
  /** 이미지 번호와 도면을 맞춰 보는 배치도 창 */
  onOpenSheet: () => void;
};

export default function LayoutPanel(props: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [message, setMessage] = useState("");
  const products = useMemo(() => placeableProducts(props.useType), [props.useType]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 6000);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <div className={styles.root}>
      <div className={styles.actions}>
        <button type="button" className={pickerOpen ? `${styles.action} ${styles.actionOn}` : styles.action} onClick={() => setPickerOpen(!pickerOpen)} aria-expanded={pickerOpen}>
          상품 추가
        </button>
        <button type="button" className={styles.action} onClick={() => setMessage(props.onRearrange())}>
          다른 배치안
        </button>
        <button type="button" className={styles.action} onClick={props.onUndo} disabled={!props.canUndo}>
          되돌리기
        </button>
        <button type="button" className={styles.action} onClick={props.onReset}>
          처음으로
        </button>
        <button type="button" className={styles.link} onClick={props.onOpenSheet}>
          배치도·설계 점검
        </button>
      </div>

      {message && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}

      {pickerOpen && (
        <div className={styles.picker}>
          <p className={styles.pickerTitle}>도면에 놓을 상품을 고르세요. 견적에 바로 더해져요.</p>
          <ul className={styles.pickerList}>
            {products.map((product) => (
              <li key={product.id}>
                <button type="button" className={styles.pickerItem} onClick={() => setMessage(props.onAddProduct(product))}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.imageUrl} alt="" width={36} height={36} />
                  <span className={styles.pickerText}>
                    <span className={styles.pickerName}>{product.name}</span>
                    <span className={styles.pickerMeta}>
                      W{product.widthMm} × D{product.depthMm} · {formatWon(product.price)}
                    </span>
                  </span>
                  <span className={styles.pickerAdd}>놓기</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className={styles.hintLine}>파란 카메라 표시를 끌면 그 자리에서 360으로 봐요.</p>
      <PlanEditor embedded scene={props.scene} canUndo={props.canUndo} onChange={props.onChange} onUndo={props.onUndo} onReset={props.onReset} eye={props.eye} onEyeMove={props.onEyeMove} />
    </div>
  );
}
