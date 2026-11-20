"use client";

// 캔버스 위 오른쪽 버튼 둘. 배치도 보기와 AI 새로 렌더링.
import styles from "./CanvasActions.module.css";

type Props = {
  onOpenPlan: () => void;
  /** 없으면 새 렌더링 버튼을 숨긴다(예시 사진 번호를 모르는 공간). */
  onRender?: () => void;
  rendering: boolean;
  /** 없으면 배치 편집 버튼을 숨긴다(상품 먼저 방식 등). */
  onToggleEdit?: () => void;
  editing?: boolean;
  /** 없으면 3D, 360 보기 버튼을 숨긴다. */
  onOpen3D?: () => void;
  viewing3D?: boolean;
};

export default function CanvasActions({ onOpenPlan, onRender, rendering, onToggleEdit, editing, onOpen3D, viewing3D }: Props) {
  return (
    <div className={styles.actions} onClick={(event) => event.stopPropagation()}>
      <button type="button" className={styles.button} onClick={onOpenPlan}>
        배치도·설계 점검
      </button>
      {onOpen3D && (
        <button type="button" className={viewing3D ? `${styles.button} ${styles.primary}` : styles.button} onClick={onOpen3D} aria-pressed={viewing3D}>
          {viewing3D ? "3D 닫기" : "3D · 360 보기"}
        </button>
      )}
      {onToggleEdit && (
        <button type="button" className={editing ? `${styles.button} ${styles.primary}` : styles.button} onClick={onToggleEdit} aria-pressed={editing}>
          {editing ? "편집 닫기" : "배치 편집"}
        </button>
      )}
      {onRender && (
        <button type="button" className={`${styles.button} ${styles.primary}`} onClick={onRender} disabled={rendering}>
          {rendering ? "렌더링 중" : "AI로 새로 렌더링"}
        </button>
      )}
    </div>
  );
}
