// 설계 점검 목록. 간격 기준, 배치 오류, 법령 확인 사항을 차례로 보여 준다.
import type { PlanResult } from "@/lib/api/functions";
import styles from "./DesignChecks.module.css";

const RULE_LABELS: Record<string, string> = {
  not_fit: "공간에 안 들어감",
  overlap: "물건이 겹침",
  aisle: "통로 부족",
  gap: "간격 부족",
  entry: "입구 막힘",
  wall: "벽과 간격 부족",
};

function mm(value: number) {
  return `${value.toLocaleString("ko-KR")}mm`;
}

export default function DesignChecks({ plan }: { plan: PlanResult }) {
  const { clearances, violations, notes, unplaced } = plan;

  return (
    <div className={styles.checks}>
      <section>
        <h3 className={styles.heading}>간격 기준</h3>
        {clearances.length === 0 ? (
          <p className={styles.empty}>계산된 간격이 없어요.</p>
        ) : (
          <ul className={styles.list}>
            {clearances.map((c) => (
              <li key={c.id} className={c.ok ? styles.ok : styles.fail}>
                <span className={styles.icon} aria-hidden="true">
                  {c.ok ? "✓" : "!"}
                </span>
                <span className={styles.text}>
                  <span className={styles.name}>{c.label}</span>
                  <span className={styles.value}>
                    {mm(c.valueMm)} / 기준 {mm(c.requiredMm)}
                  </span>
                </span>
                <span className={styles.state}>{c.ok ? "기준 충족" : "기준 미달"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(violations.length > 0 || unplaced.length > 0) && (
        <section>
          <h3 className={styles.heading}>배치 오류</h3>
          <ul className={styles.list}>
            {violations.map((v, index) => (
              <li key={index} className={styles.fail}>
                <span className={styles.icon} aria-hidden="true">
                  !
                </span>
                <span className={styles.text}>
                  <span className={styles.name}>{RULE_LABELS[v.rule] ?? v.rule}</span>
                  <span className={styles.value}>{v.message}</span>
                </span>
              </li>
            ))}
            {unplaced.map((item) => (
              <li key={item.productId} className={styles.fail}>
                <span className={styles.icon} aria-hidden="true">
                  !
                </span>
                <span className={styles.text}>
                  <span className={styles.name}>배치하지 못함</span>
                  <span className={styles.value}>{item.name}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className={styles.heading}>법령·설계 확인 사항</h3>
        {notes.length === 0 ? (
          <p className={styles.empty}>확인할 항목이 없어요.</p>
        ) : (
          <ul className={styles.list}>
            {notes.map((note, index) => (
              <li key={index} className={note.level === "error" ? styles.noteError : styles.note}>
                <span className={styles.text}>
                  <span className={styles.noteText}>{note.text}</span>
                  <span className={styles.source}>{note.source}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className={styles.disclaimer}>법률 자문이 아니며 실제 인허가는 관할 기관 확인이 필요합니다.</p>
    </div>
  );
}
