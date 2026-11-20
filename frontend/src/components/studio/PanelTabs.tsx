"use client";

// 오른쪽 패널 위의 탭. 견적과 평면도를 오가며, 평면도 탭에서도 아래 합계가 보인다.
import type { ReactNode } from "react";
import styles from "./PanelTabs.module.css";

export type PanelTab = "quote" | "layout" | "space" | "mood";

type Props = {
  value: PanelTab;
  onChange: (tab: PanelTab) => void;
  children: ReactNode;
};

const TABS: { key: PanelTab; label: string }[] = [
  { key: "quote", label: "견적" },
  { key: "layout", label: "배치" },
  { key: "space", label: "공간" },
  { key: "mood", label: "무드" },
];

export default function PanelTabs({ value, onChange, children }: Props) {
  return (
    <div className={styles.wrap}>
      <div className={styles.tabs} role="tablist" aria-label="오른쪽 패널">
        {TABS.map((tab) => (
          <button key={tab.key} type="button" role="tab" aria-selected={value === tab.key} className={value === tab.key ? `${styles.tab} ${styles.tabOn}` : styles.tab} onClick={() => onChange(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
