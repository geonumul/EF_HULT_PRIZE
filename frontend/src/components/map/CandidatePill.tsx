// 지도를 확대했을 때 공실 후보를 "공실" 글씨로 보여 주는 표지. 한 건물에 여러 층이면 층 수를 함께 적는다.
import type { MouseEvent } from "react";
import styles from "./CandidatePill.module.css";

type Props = {
  floors: number; // 이 건물에서 후보로 잡힌 층의 수
  confidence: number; // 0~1
  selected: boolean;
  ariaLabel: string;
  onClick: () => void;
};

export default function CandidatePill({ floors, confidence, selected, ariaLabel, onClick }: Props) {
  function handleClick(event: MouseEvent) {
    event.stopPropagation(); // 지도 빈 곳을 눌렀을 때의 선택 해제와 겹치지 않게 한다.
    onClick();
  }

  const classNames = [styles.pill, confidence >= 0.65 ? styles.strong : styles.weak, selected ? styles.selected : ""].filter(Boolean);
  return (
    <button type="button" className={classNames.join(" ")} aria-label={ariaLabel} onClick={handleClick}>
      공실{floors > 1 ? ` ${floors}개 층` : ""}
    </button>
  );
}
