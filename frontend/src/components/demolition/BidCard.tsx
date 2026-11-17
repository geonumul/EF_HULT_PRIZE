// 받은 견적 한 장. 업체 정보, 금액, 시작 가능일, 포함 범위와 선택 버튼을 보여 준다.
import Button from "@/components/ui/Button";
import { formatDate } from "@/lib/demolition";
import { formatWon } from "@/lib/format";
import type { DemolitionBid, DemolitionVendor } from "@/types/demolition";
import styles from "./BidCard.module.css";

type Props = {
  bid: DemolitionBid;
  vendor: DemolitionVendor;
  isSelected: boolean;
  canSelect: boolean; // 아직 아무 업체도 고르지 않았을 때만 true
  onSelect: () => void;
};

export default function BidCard({ bid, vendor, isSelected, canSelect, onSelect }: Props) {
  return (
    <article className={`${styles.card} ${isSelected ? styles.selected : ""}`}>
      <header className={styles.header}>
        <strong className={styles.name}>{vendor.name}</strong>
        <span className={styles.rating}>
          ★ {vendor.rating.toFixed(1)} · 후기 {vendor.reviewCount}개
        </span>
      </header>
      <strong className={styles.amount}>{formatWon(bid.amountWon)}</strong>
      <dl className={styles.info}>
        <dt>시작 가능일</dt>
        <dd>{formatDate(bid.startDate)}</dd>
        <dt>포함 범위</dt>
        <dd>{bid.scopeNote}</dd>
      </dl>
      {isSelected ? (
        <span className={styles.chosen}>선택한 업체</span>
      ) : (
        <Button variant="secondary" disabled={!canSelect} onClick={onSelect}>
          이 업체로 선택
        </Button>
      )}
    </article>
  );
}
