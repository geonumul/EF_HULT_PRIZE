// 지도 위 공실 후보 점. 확정된 공실 핀보다 작고 연하게 그려서 구분한다.
import type { MouseEvent } from "react";
import styles from "./CandidateDot.module.css";

type Props = {
  confidence: number; // 0~1
  selected: boolean;
  ariaLabel: string;
  onClick: () => void;
};

export default function CandidateDot({ confidence, selected, ariaLabel, onClick }: Props) {
  function handleClick(event: MouseEvent) {
    event.stopPropagation(); // 지도 빈 곳을 눌렀을 때의 선택 해제와 겹치지 않게 한다.
    onClick();
  }

  const strong = confidence >= 0.65;
  const classNames = [styles.dot, strong ? styles.strong : styles.weak, selected ? styles.selected : ""].filter(Boolean);
  return <button type="button" className={classNames.join(" ")} aria-label={ariaLabel} onClick={handleClick} />;
}
