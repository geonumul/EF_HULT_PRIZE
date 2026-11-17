// 업종별 견적 목록. 공실과 업종을 골라 견적서로 들어간다. 시안이 없어 기존 카드 스타일로 만들었다.
import Footer from "@/components/layout/Footer";
import QuoteList from "@/components/quote/QuoteList";
import styles from "./page.module.css";

export default function QuoteListPage() {
  return (
    <>
      <main className={styles.main}>
        <div className={styles.inner}>
          <h1 className={styles.title}>업종별 견적</h1>
          <p className={styles.desc}>공실과 업종을 고르면 집기, 설비, 시공까지 합친 확정 견적서를 볼 수 있습니다.</p>
          <QuoteList />
        </div>
      </main>
      <Footer />
    </>
  );
}
