// 공통 버튼. 모양은 variant로 고른다.
//   primary   : 초록 그라데이션. 화면마다 가장 중요한 버튼 하나에만 쓴다.
//   secondary : 흰 바탕에 회색 테두리
//   dark      : 검은 바탕
import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "dark";
  size?: "md" | "lg";
};

export default function Button({ variant = "primary", size = "md", className, ...rest }: Props) {
  const classNames = [styles.button, styles[variant], styles[size], className].filter(Boolean);
  return <button className={classNames.join(" ")} {...rest} />;
}
