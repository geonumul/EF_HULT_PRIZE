"use client";

// 파트너 콘솔의 대시보드, 견적 요청, 정산. 시안에 화면이 없어서 가짜 데이터로 표만 보여 준다.
import { useState } from "react";
import { INITIAL_LISTINGS, INITIAL_PRODUCTS, QUOTE_REQUESTS, SETTLEMENTS } from "@/mocks/partner";
import type { PartnerListing, PartnerProduct } from "@/types/partner";
import KpiCards from "./KpiCards";
import { useStoredList } from "./partnerStorage";
import styles from "./Panel.module.css";

export function OverviewPanel() {
  const [listings] = useStoredList<PartnerListing>("partner-listings", INITIAL_LISTINGS);
  const [products] = useStoredList<PartnerProduct>("partner-products", INITIAL_PRODUCTS);
  const waiting = products.filter((p) => p.review === "검수 중").length;
  const lowStock = products.filter((p) => p.stock <= 10).length;

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>대시보드</h1>
          <p className={styles.desc}>등록한 공실과 상품의 현황입니다</p>
        </div>
      </div>
      <KpiCards listings={listings} />
      <div className={styles.kpis}>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>등록 상품</span>
          <span className={styles.kpiValue}>{products.length}개</span>
          <span className={styles.kpiNote}>검수 중 {waiting}개</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>재고 10개 이하</span>
          <span className={styles.kpiValue}>{lowStock}개</span>
          <span className={styles.kpiNote}>재고를 확인해 주세요</span>
        </div>
      </div>
    </section>
  );
}

export function QuoteRequestsPanel() {
  // 답변 완료 여부만 이 화면에서 바꾼다. 새로고침하면 처음 상태로 돌아간다.
  const [answered, setAnswered] = useState<string[]>(QUOTE_REQUESTS.filter((r) => r.state === "답변 완료").map((r) => r.id));
  const columns = "1.4fr 1.6fr 1.6fr 0.8fr 1fr";

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>견적 요청</h1>
          <p className={styles.desc}>견적을 확정한 고객이 보낸 문의입니다</p>
        </div>
      </div>
      <div className={styles.table}>
        <div className={styles.tableHead} style={{ gridTemplateColumns: columns }}>
          <span>고객</span>
          <span>공실</span>
          <span>문의</span>
          <span>접수일</span>
          <span>상태</span>
        </div>
        {QUOTE_REQUESTS.map((request) => {
          const done = answered.includes(request.id);
          return (
            <div key={request.id} className={styles.row} style={{ gridTemplateColumns: columns }}>
              <span>{request.customer}</span>
              <span>{request.space}</span>
              <span>{request.item}</span>
              <span>{request.date}</span>
              <span>
                {done ? (
                  <span className={styles.statusPlain}>답변 완료</span>
                ) : (
                  <button type="button" className={`${styles.pill} ${styles.pillOn}`} onClick={() => setAnswered([...answered, request.id])}>
                    답변 완료로 표시
                  </button>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function SettlementPanel() {
  const columns = "1fr 1fr 1fr 1.4fr";

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>정산</h1>
          <p className={styles.desc}>구매 확정 후 다음 달 10일에 지난달 판매분을 정산합니다</p>
        </div>
      </div>
      <div className={styles.table}>
        <div className={styles.tableHead} style={{ gridTemplateColumns: columns }}>
          <span>판매월</span>
          <span>판매액</span>
          <span>수수료 10%</span>
          <span>상태</span>
        </div>
        {SETTLEMENTS.map((row) => (
          <div key={row.id} className={styles.row} style={{ gridTemplateColumns: columns }}>
            <span>{row.month}</span>
            <span>{row.sales.toLocaleString("ko-KR")}원</span>
            <span>{row.fee.toLocaleString("ko-KR")}원</span>
            <span className={row.state === "정산 완료" ? styles.statusPlain : styles.statusOrange}>{row.state}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
