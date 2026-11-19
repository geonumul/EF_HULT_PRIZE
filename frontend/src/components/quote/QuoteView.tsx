"use client";
// 견적 확정 화면의 본문. 신품/중고 선택 상태를 여기서 들고 있고, 바뀔 때마다 buildQuote로 다시 계산한다.
import { useEffect, useMemo, useState } from "react";
import { findConfirmedDemolition } from "@/lib/demolition";
import { buildQuote, withConfirmedDemolition } from "@/lib/quote";
import { findRender } from "@/mocks/renders";
import { formatMan, formatWon } from "@/lib/format";
import OrderTargets from "./OrderTargets";
import PaymentCard from "./PaymentCard";
import QuoteSheet from "./QuoteSheet";
import styles from "./QuoteView.module.css";

type Props = {
  renderId: string;
  title: string; // "성수동2가 1층 · 카페"
  today: string; // "2026년 11월 17일"
  initialUsedIds: string[];
};

// 항목별 금액의 점 색. 시안의 초록 3단계에 철거용 한 단계를 더했다.
const DOT_COLORS = ["#00b368", "#12c9a4", "#8ae3c1", "#c5f0de"];

export default function QuoteView({ renderId, title, today, initialUsedIds }: Props) {
  const [usedIds, setUsedIds] = useState<string[]>(initialUsedIds);

  // 철거 업체를 확정한 공실이면 그 금액을 쓴다. 확정 기록은 브라우저에만 있어서 화면이 뜬 뒤에 읽는다.
  const [confirmedDemolitionWon, setConfirmedDemolitionWon] = useState<number | null>(null);

  const render = findRender(renderId);
  const listingId = render?.listingId;
  useEffect(() => {
    if (!listingId) return;
    setConfirmedDemolitionWon(findConfirmedDemolition(listingId)?.amountWon ?? null);
  }, [listingId]);

  const quote = useMemo(() => {
    if (!render) return null;
    const base = buildQuote(render, usedIds);
    return confirmedDemolitionWon === null ? base : withConfirmedDemolition(base, confirmedDemolitionWon);
  }, [render, usedIds, confirmedDemolitionWon]);
  if (!render || !quote) return null;

  function toggleUsed(productId: string) {
    setUsedIds((ids) => (ids.includes(productId) ? ids.filter((id) => id !== productId) : [...ids, productId]));
  }

  const itemCount = quote.groups[0].items.reduce((sum, item) => sum + item.qty, 0);
  const facilityCount = quote.groups.find((group) => group.key === "facility")?.items.length ?? 0;

  return (
    <main className={styles.main}>
      <div className={styles.left}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>견적서 · {title}</p>
          <p className={styles.total}>{formatMan(Math.round(quote.total / 10000))} 원</p>
          <p className={styles.meta}>
            집기 {itemCount}개 · 설비 {facilityCount}건 · 시공 견적 3곳 평균 · {today} 기준
          </p>
          <p className={styles.split}>
            확정 {formatMan(Math.round(quote.confirmedTotal / 10000))} + 예상 {formatMan(Math.round(quote.estimatedTotal / 10000))}
          </p>
          {quote.usedSaving > 0 && <p className={styles.saving}>중고 선택으로 {formatWon(quote.usedSaving)} 절약 중</p>}
        </header>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>항목별 금액</h2>
          {quote.groups.map((group, index) => (
            <div key={group.key} className={styles.row}>
              <span className={styles.dot} style={{ background: DOT_COLORS[index] }} />
              <span className={styles.rowName}>{group.title}</span>
              <span className={styles.rowRate}>{Math.round((group.sum / quote.total) * 100)}%</span>
              <span className={styles.rowSum}>{formatMan(Math.round(group.sum / 10000))}</span>
            </div>
          ))}
        </section>

        <QuoteSheet quote={quote} usedIds={usedIds} onToggleUsed={toggleUsed} />
        <OrderTargets quote={quote} />
      </div>

      <PaymentCard renderId={renderId} quote={quote} usedIds={usedIds} title={title} />
    </main>
  );
}
