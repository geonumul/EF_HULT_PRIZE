// 공실 통계 카드 네 장. Figma 40:508. 숫자는 목록에서 계산하고, 보조 문구는 시안의 가짜 값이다.
import type { PartnerListing } from "@/types/partner";
import styles from "./Panel.module.css";

export default function KpiCards({ listings }: { listings: PartnerListing[] }) {
  const totalViews = listings.reduce((sum, l) => sum + l.views, 0);
  const totalQuotes = listings.reduce((sum, l) => sum + l.quotes, 0);
  const featuredCount = listings.filter((l) => l.featured).length;

  const cards = [
    { label: "등록 공실", value: `${listings.length}곳`, note: "이번 달 +3" },
    { label: "렌더링 조회", value: `${totalViews.toLocaleString("ko-KR")}회`, note: "지난달 대비 +41%" },
    { label: "견적 확정", value: `${totalQuotes}건`, note: "계약 연결 9건" },
    { label: "상단 노출", value: `${featuredCount}곳`, note: "12월 31일까지" },
  ];

  return (
    <div className={styles.kpis}>
      {cards.map((card) => (
        <div key={card.label} className={styles.kpi}>
          <span className={styles.kpiLabel}>{card.label}</span>
          <span className={styles.kpiValue}>{card.value}</span>
          <span className={styles.kpiNote}>{card.note}</span>
        </div>
      ))}
    </div>
  );
}
