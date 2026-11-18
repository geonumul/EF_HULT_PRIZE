// 가까이 겹치는 공실 후보 점을 하나로 묶어 "+60"처럼 개수를 보여 주는 배지.
import type { MouseEvent } from "react";
import styles from "./CandidateCluster.module.css";

type Props = {
  count: number;
  onClick: () => void;
};

export default function CandidateCluster({ count, onClick }: Props) {
  function handleClick(event: MouseEvent) {
    event.stopPropagation();
    onClick();
  }

  return (
    <button type="button" className={styles.cluster} aria-label={`공실 후보 ${count}곳 묶음, 눌러서 확대`} onClick={handleClick}>
      +{count.toLocaleString("ko-KR")}
    </button>
  );
}
