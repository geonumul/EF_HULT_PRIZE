// 배치 검토 카드 안의 평면도. Figma FloorPlan 25:432.
// 테이블은 세로 3줄로 채우고, 카운터는 오른쪽 벽에 붙인다. 통로는 테이블과 카운터 사이다.
import type { ChatPlan } from "@/types/studio";
import styles from "./FloorPlan.module.css";

const PITCH = 40; // 테이블 간격(px)
const TABLE_ROWS = 3;

export default function FloorPlan({ plan }: { plan: ChatPlan }) {
  const columns = Math.ceil(plan.tables / TABLE_ROWS);
  const aisleLeft = 23 + columns * PITCH + 6;
  const aisleWidth = 259 - aisleLeft;

  const tables = Array.from({ length: plan.tables }, (_, index) => ({
    left: 23 + Math.floor(index / TABLE_ROWS) * PITCH,
    top: 17 + (index % TABLE_ROWS) * PITCH,
  }));

  return (
    <div className={styles.plan}>
      <div className={styles.wall} />
      <div className={styles.window} />
      {tables.map((table, index) => (
        <div key={index} className={styles.table} style={{ left: table.left, top: table.top }} />
      ))}
      <div className={styles.counter} />
      <div className={styles.aisle} style={{ left: aisleLeft, width: aisleWidth }} />
      <p className={styles.aisleLabel} style={{ left: aisleLeft + aisleWidth / 2 - 30 }}>
        통로 {plan.aisleMm}mm
      </p>
    </div>
  );
}
