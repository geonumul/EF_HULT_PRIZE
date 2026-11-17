"use client";
// 지도 핀. 숫자를 보여 주는 묶음 핀과 공실 핀이 같은 모양을 쓴다. Figma MapPin 17:81 (56 x 64).
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import styles from "./MapPin.module.css";

type Props = {
  label: string; // 핀 안에 보이는 글자 ("15", "공실")
  kind: "cluster" | "listing";
  selected?: boolean;
  style?: CSSProperties; // left, top으로 위치를 준다
  ariaLabel: string;
  onClick: () => void;
  children?: ReactNode; // 핀 위에 붙는 말풍선
};

export default function MapPin({ label, kind, selected = false, style, ariaLabel, onClick, children }: Props) {
  const classNames = [styles.pin, styles[kind], selected ? styles.selected : ""].filter(Boolean);

  function handleClick(event: MouseEvent) {
    event.stopPropagation(); // 지도 빈 곳을 눌렀을 때의 선택 해제와 겹치지 않게 한다.
    onClick();
  }

  return (
    <button type="button" className={classNames.join(" ")} style={style} aria-label={ariaLabel} onClick={handleClick}>
      <span className={styles.halo} />
      <span className={styles.tail} />
      <span className={styles.core}>{label}</span>
      {children}
    </button>
  );
}
