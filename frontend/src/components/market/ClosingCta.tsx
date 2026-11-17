// 마켓과 가이드 아래쪽 검은 안내 띠. Figma ClosingCTA 43:672.
import Link from "next/link";
import styles from "./ClosingCta.module.css";

export default function ClosingCta() {
  return (
    <section className={styles.cta}>
      <p className={styles.title}>빈 상가 사진 한 장으로 업종별 창업비까지</p>
      <p className={styles.sub}>공실 탐색, 렌더링, 견적은 무료입니다</p>
      <div className={styles.buttons}>
        <Link href="/map" className={styles.map}>
          공실 지도 보기
        </Link>
        <Link href="/partner/apply" className={styles.partner}>
          입점 문의
        </Link>
      </div>
    </section>
  );
}
