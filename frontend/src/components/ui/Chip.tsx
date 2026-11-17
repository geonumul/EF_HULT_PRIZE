// 공통 칩. 필터와 업종 선택에서 쓴다. selected가 true면 검은 바탕으로 바뀐다.
import type { ButtonHTMLAttributes } from "react";
import styles from "./Chip.module.css";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

export default function Chip({ selected = false, className, ...rest }: Props) {
  const classNames = [styles.chip, selected ? styles.selected : "", className].filter(Boolean);
  return <button type="button" aria-pressed={selected} className={classNames.join(" ")} {...rest} />;
}
