// 철거 전에 확인이 필요한 항목 목록. 법적 판단 문구는 쓰지 않는다.
import { CHECK_ITEMS } from "@/lib/demolition";
import styles from "./CheckList.module.css";

export default function CheckList() {
  return (
    <section className={styles.box}>
      <h2 className={styles.title}>확인이 필요한 항목</h2>
      <ul className={styles.list}>
        {CHECK_ITEMS.map((item) => (
          <li key={item.title} className={styles.item}>
            <strong className={styles.itemTitle}>{item.title}</strong>
            <span className={styles.itemBody}>{item.body}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
