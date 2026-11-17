// 아직 만들지 않은 화면 자리에 놓는 안내 페이지.
// 메뉴를 눌렀을 때 404 대신 이 화면이 보이도록 둔다. 화면을 만들면 해당 page.tsx에서 지운다.
import Footer from "@/components/layout/Footer";
import styles from "./ComingSoon.module.css";

type Props = {
  title: string; // 화면 이름
  step: number; // docs/ROADMAP.md의 단계 번호
  showFooter?: boolean; // 지도처럼 푸터가 없는 화면은 false
};

export default function ComingSoon({ title, step, showFooter = true }: Props) {
  return (
    <>
      <main className={styles.main}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.text}>{step}단계에서 만들 화면입니다.</p>
      </main>
      {showFooter && <Footer />}
    </>
  );
}
