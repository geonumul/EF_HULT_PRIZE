// 적합성 판정 배지. possible은 초록, conditional은 주황, impossible은 회색이다.
import type { Verdict } from "@/types";
import styles from "./Badge.module.css";

type Props = {
  verdict: Verdict;
  label: string; // "카페 가능", "필라테스 조건부"
};

export default function Badge({ verdict, label }: Props) {
  return <span className={`${styles.badge} ${styles[verdict]}`}>{label}</span>;
}
