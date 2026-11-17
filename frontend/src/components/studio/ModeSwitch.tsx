"use client";

// 렌더링 방식 전환. 시안에 없는 추가 기능이라 SubHeader의 업종 탭과 같은 세그먼트 모양으로 만들었다. docs/FEATURES.md 1번.
import type { StudioMode } from "@/types/studio";
import styles from "./ModeSwitch.module.css";

type Props = {
  mode: StudioMode;
  onChange: (mode: StudioMode) => void;
};

const OPTIONS: { key: StudioMode; label: string }[] = [
  { key: "image", label: "이미지 먼저" },
  { key: "products", label: "상품 먼저" },
];

export default function ModeSwitch({ mode, onChange }: Props) {
  return (
    <div className={styles.switch} role="group" aria-label="렌더링 방식">
      {OPTIONS.map((option) => (
        <button
          key={option.key}
          type="button"
          aria-pressed={mode === option.key}
          className={mode === option.key ? `${styles.option} ${styles.active}` : styles.option}
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
