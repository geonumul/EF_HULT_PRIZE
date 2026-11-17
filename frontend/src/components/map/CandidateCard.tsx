// 공실 후보를 눌렀을 때 지도 왼쪽 아래에 뜨는 카드.
import type { VacancyCandidate } from "@/types/vacancy";
import styles from "./CandidateCard.module.css";

type Props = {
  candidate: VacancyCandidate;
  onClose: () => void;
};

export default function CandidateCard({ candidate, onClose }: Props) {
  const area = candidate.floorAreaM2 !== null ? `${candidate.floorAreaM2}m²` : "면적 미확인";
  return (
    <aside className={`glass ${styles.card}`} aria-label="공실 후보 정보">
      <div className={styles.head}>
        <span className={styles.badge}>공실 후보 · 확인 전</span>
        <button type="button" className={styles.close} aria-label="닫기" onClick={onClose}>
          ×
        </button>
      </div>
      <p className={styles.address}>
        {candidate.address.replace("서울특별시 ", "")} {candidate.floor}층
      </p>
      {candidate.buildingName && <p className={styles.sub}>{candidate.buildingName}</p>}
      <p className={styles.sub}>
        {candidate.floorUse} · {area}
      </p>
      <p className={styles.confidence}>비어 있을 가능성 {Math.round(candidate.confidence * 100)}%</p>
      <ul className={styles.reasons}>
        {candidate.reasons.slice(0, 3).map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <p className={styles.notice}>임대 중인지는 알 수 없습니다. 현장이나 중개사 확인이 필요합니다.</p>
    </aside>
  );
}
