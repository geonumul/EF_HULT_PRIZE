"use client";
// 업종 카테고리 탭. Figma S01 프레임 18:66 (1440 x 52).
import { CATEGORY_TABS } from "@/mocks/map";
import type { UseType } from "@/types";
import styles from "./CategoryTabs.module.css";

type Props = {
  use: UseType | null;
  onChange: (use: UseType | null) => void;
};

export default function CategoryTabs({ use, onChange }: Props) {
  return (
    <nav className={styles.tabs} aria-label="업종 카테고리">
      <div className={styles.inner}>
        {CATEGORY_TABS.map((tab) => {
          const selected = tab.use === use;
          return (
            <button
              key={tab.label}
              type="button"
              className={`${styles.tab} ${selected ? styles.selected : ""}`}
              aria-current={selected ? "page" : undefined}
              onClick={() => onChange(tab.use)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
