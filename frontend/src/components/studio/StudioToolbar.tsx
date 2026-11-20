"use client";

// 캔버스 위쪽 한 줄. 보기 전환(사진, 3D, 360), 평면도, 배치도·설계 점검, 상품 추가, 되돌리기, 다시 렌더링을 모은다.
// 캔버스 안을 가리지 않으려고 버튼을 모두 캔버스 밖으로 뺐다. 평면도는 썸네일이 버튼이고, 누르면 캔버스 위에 편집 창이 열린다.
import { useMemo, useState } from "react";
import { formatWon } from "@/lib/format";
import { placeableProducts, scenePlanResult } from "@/lib/scene";
import type { Product, UseType } from "@/types";
import type { Scene } from "@/types/scene";
import LayoutPlan from "./LayoutPlan";
import styles from "./StudioToolbar.module.css";

export type StudioView = "photo" | "orbit" | "pano";

type Props = {
  view: StudioView;
  onView: (view: StudioView) => void;
  /** 배치를 불러오기 전에는 null */
  scene: Scene | null;
  useType: UseType;
  planOpen: boolean;
  onTogglePlan: () => void;
  onOpenSheet: () => void;
  /** 상품을 도면에 놓는다. 사용자에게 보여 줄 결과 문장을 돌려준다. */
  onAddProduct: (product: Product) => string;
  canUndo: boolean;
  onUndo: () => void;
  onReset: () => void;
  /** 없으면 다시 렌더링 버튼을 숨긴다. */
  onRender?: () => void;
  rendering: boolean;
  moodHref: string;
  /** 3D와 편집을 쓸 수 없는 화면(상품 먼저, 빈 공간 등)이면 false */
  editable: boolean;
};

const VIEWS: { key: StudioView; label: string }[] = [
  { key: "photo", label: "사진" },
  { key: "orbit", label: "3D" },
  { key: "pano", label: "360" },
];

export default function StudioToolbar(props: Props) {
  const { view, scene, useType, planOpen, editable } = props;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [message, setMessage] = useState("");
  const products = useMemo(() => placeableProducts(useType), [useType]);
  const plan = useMemo(() => (scene ? scenePlanResult(scene) : null), [scene]);
  const bad = plan ? plan.clearances.filter((c) => !c.ok).length : 0;

  function add(product: Product) {
    setMessage(props.onAddProduct(product));
  }

  return (
    <div className={styles.bar} onClick={(event) => event.stopPropagation()}>
      {editable && (
        <div className={styles.segment} role="tablist" aria-label="보기 방식">
          {VIEWS.map((item) => (
            <button key={item.key} type="button" role="tab" aria-selected={view === item.key} className={view === item.key ? `${styles.seg} ${styles.segOn}` : styles.seg} onClick={() => props.onView(item.key)}>
              {item.label}
            </button>
          ))}
        </div>
      )}

      {editable && (
        <button type="button" className={planOpen ? `${styles.tool} ${styles.toolOn}` : styles.tool} onClick={props.onTogglePlan} aria-pressed={planOpen}>
          <span className={styles.thumb}>{plan ? <LayoutPlan plan={plan} compact /> : <span className={styles.thumbEmpty} />}</span>
          <span>평면도</span>
          {plan && <span className={bad === 0 ? styles.chipOk : styles.chipBad}>{bad === 0 ? "기준 충족" : `미달 ${bad}`}</span>}
        </button>
      )}

      <button type="button" className={styles.tool} onClick={props.onOpenSheet}>
        배치도·점검
      </button>

      {editable && (
        <div className={styles.pickerWrap}>
          <button type="button" className={pickerOpen ? `${styles.tool} ${styles.toolOn}` : styles.tool} onClick={() => setPickerOpen(!pickerOpen)} aria-expanded={pickerOpen}>
            상품 추가
          </button>
          {pickerOpen && (
            <div className={styles.picker} role="dialog" aria-label="상품 추가">
              <p className={styles.pickerTitle}>도면에 놓을 상품을 고르세요. 견적에 바로 더해져요.</p>
              <ul className={styles.pickerList}>
                {products.map((product) => (
                  <li key={product.id}>
                    <button type="button" className={styles.pickerItem} onClick={() => add(product)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={product.imageUrl} alt="" width={40} height={40} />
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
              {message && <p className={styles.pickerMessage}>{message}</p>}
              <button type="button" className={styles.pickerClose} onClick={() => setPickerOpen(false)}>
                닫기
              </button>
            </div>
          )}
        </div>
      )}

      {editable && (
        <>
          <button type="button" className={styles.ghost} onClick={props.onUndo} disabled={!props.canUndo}>
            되돌리기
          </button>
          <button type="button" className={styles.ghost} onClick={props.onReset} disabled={!scene}>
            처음으로
          </button>
        </>
      )}

      <a className={styles.ghost} href={props.moodHref}>
        무드
      </a>

      <span className={styles.spacer} />

      {props.onRender && (
        <button type="button" className={styles.primary} onClick={props.onRender} disabled={props.rendering}>
          {props.rendering ? "렌더링 중" : "사진 다시 만들기"}
        </button>
      )}
    </div>
  );
}
