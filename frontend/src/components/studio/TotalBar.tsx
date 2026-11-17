"use client";

// 견적 패널 맨 아래 합계와 버튼. Figma TotalBar 24:407.
// 저장은 이 브라우저의 localStorage에 렌더링 id별로 남긴다. 서버가 생기면 quotes API로 바꾼다.
import { useState } from "react";
import Link from "next/link";
import type { Quote } from "@/types";
import { formatMan } from "@/lib/format";
import styles from "./TotalBar.module.css";

type Props = {
  quote: Quote;
  baseTotal: number;
  confirmHref: string;
  saveKey: string;
  /** 빈 공간처럼 견적을 낼 수 없는 화면에서는 합계를 0원으로 두고 버튼을 막는다. */
  disabled?: boolean;
};

const SAVE_STORAGE_KEY = "shopportunity-saved-quotes";

// 막대 색. 집기, 설비, 시공은 시안 색이고 철거는 토큰의 회색을 쓴다.
const SEGMENT_COLORS = ["#00b368", "#12c9a4", "#b8ead9", "var(--gray-300)"];

function toMan(won: number): string {
  return formatMan(Math.round(won / 10000));
}

export default function TotalBar({ quote, baseTotal, confirmHref, saveKey, disabled = false }: Props) {
  const [saved, setSaved] = useState(false);

  const appliedSaving = baseTotal - quote.total; // 이미 중고로 바꿔서 줄어든 금액
  const total = disabled ? 0 : quote.total;

  function saveQuote() {
    try {
      const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
      const all = raw ? JSON.parse(raw) : {};
      all[saveKey] = { total: quote.total, savedAt: new Date().toISOString() };
      window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(all));
    } catch {
      // 저장 공간이 막혀 있어도 버튼 표시는 바꾼다.
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className={styles.bar}>
      <div className={styles.totalRow}>
        <div className={styles.labels}>
          <span className={styles.label}>창업 총비용</span>
          {!disabled && appliedSaving > 0 && <span className={styles.saving}>중고로 절약 {toMan(appliedSaving)}</span>}
          {!disabled && quote.usedSaving > 0 && <span className={styles.saving}>중고 적용 시 −{toMan(quote.usedSaving)}</span>}
        </div>
        <span className={styles.total}>{total === 0 ? "0원" : `${toMan(total)} 원`}</span>
      </div>

      <div className={styles.segments}>
        {quote.groups.map((group, index) => (
          <div
            key={group.key}
            style={{ flex: Math.max(group.sum, 1), background: SEGMENT_COLORS[index % SEGMENT_COLORS.length] }}
          />
        ))}
      </div>

      <div className={styles.buttons}>
        <button type="button" className={styles.save} onClick={saveQuote} disabled={disabled}>
          {saved ? "저장됨" : "저장"}
        </button>
        {disabled ? (
          <span className={`${styles.confirm} ${styles.confirmDisabled}`}>견적 확정</span>
        ) : (
          <Link href={confirmHref} className={styles.confirm}>
            견적 확정
          </Link>
        )}
      </div>
    </div>
  );
}
