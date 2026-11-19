"use client";

// 캔버스 위 오른쪽 버튼 둘. 배치도 보기와 AI 새로 렌더링.
import styles from "./CanvasActions.module.css";

type Props = {
  onOpenPlan: () => void;
  /** 없으면 새 렌더링 버튼을 숨긴다(예시 사진 번호를 모르는 공간). */
  onRender?: () => void;
  rendering: boolean;
};

export default function CanvasActions({ onOpenPlan, onRender, rendering }: Props) {
  return (
    <div className={styles.actions} onClick={(event) => event.stopPropagation()}>
      <button type="button" className={styles.button} onClick={onOpenPlan}>
        배치도·설계 점검
      </button>
      {onRender && (
        <button type="button" className={`${styles.button} ${styles.primary}`} onClick={onRender} disabled={rendering}>
          {rendering ? "렌더링 중" : "AI로 새로 렌더링"}
        </button>
      )}
    </div>
  );
}
