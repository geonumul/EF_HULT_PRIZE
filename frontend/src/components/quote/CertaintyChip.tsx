// 견적 항목 옆의 작은 칩. 확정/예상과 입점 업체 광고 표시를 같은 모양으로 쓴다.
import type { Certainty } from "@/types";
import styles from "./CertaintyChip.module.css";

export function CertaintyChip({ certainty }: { certainty: Certainty }) {
  return certainty === "confirmed" ? (
    <span className={`${styles.chip} ${styles.confirmed}`}>확정</span>
  ) : (
    <span className={`${styles.chip} ${styles.estimated}`}>예상</span>
  );
}

export function AdChip() {
  return <span className={`${styles.chip} ${styles.ad}`}>광고</span>;
}
