// 공실 후보를 눌렀을 때 지도 왼쪽 아래에 뜨는 카드.
import type { VacancyCandidate } from "@/types/vacancy";
import styles from "./CandidateCard.module.css";

type Props = {
  candidate: VacancyCandidate;
  floors: VacancyCandidate[]; // 같은 건물에서 후보로 잡힌 층들. 한 곳뿐이면 층 선택을 보여 주지 않는다.
  onSelectFloor: (id: string) => void;
  onClose: () => void;
};

export default function CandidateCard({ candidate, floors, onSelectFloor, onClose }: Props) {
  const area = candidate.floorAreaM2 !== null ? `${candidate.floorAreaM2}m²` : "면적 미확인";
  return (
    <aside className={`glass ${styles.card}`} aria-label="공실 후보 정보">
      <div className={styles.head}>
        <span className={styles.badge}>공실</span>
        <button type="button" className={styles.close} aria-label="닫기" onClick={onClose}>
          ×
        </button>
      </div>
      <p className={styles.address}>
        {candidate.address.replace("서울특별시 ", "")} {candidate.floor}층
      </p>
      {candidate.buildingName && <p className={styles.sub}>{candidate.buildingName}</p>}
      {floors.length > 1 && (
        <div className={styles.floors} role="group" aria-label="같은 건물의 다른 층">
          {floors.map((floor) => (
            <button
              key={floor.id}
              type="button"
              className={floor.id === candidate.id ? `${styles.floor} ${styles.floorOn}` : styles.floor}
              onClick={() => onSelectFloor(floor.id)}
            >
              {floor.floor}층
            </button>
          ))}
        </div>
      )}
      <p className={styles.sub}>
        {candidate.floorUse} · {area}
      </p>
      <p className={styles.confidence}>비어 있을 가능성 {Math.round(candidate.confidence * 100)}%</p>
      <ul className={styles.reasons}>
        {candidate.reasons.slice(0, 3).map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <p className={styles.notice}>공공데이터 기준 정보예요. 임대 조건은 중개사에게 확인하세요.</p>
    </aside>
  );
}
