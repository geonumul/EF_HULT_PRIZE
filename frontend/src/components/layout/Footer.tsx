// 하단 정보. Figma Footer 컴포넌트 42:482.
// 지도 화면처럼 화면 전체를 쓰는 페이지에는 넣지 않는다.
import Link from "next/link";
import styles from "./Footer.module.css";

// href가 없는 항목은 아직 만들지 않은 페이지라서 글자만 보여준다.
const COLUMNS = [
  {
    title: "서비스",
    links: [
      { label: "지도 매물", href: "/map" },
      { label: "업종별 견적", href: "/quote" },
      { label: "집기 마켓", href: "/market" },
      { label: "창업 가이드", href: "/guide" },
    ],
  },
  {
    title: "파트너",
    links: [
      { label: "입점·제휴 문의", href: "/partner/apply" },
      { label: "파트너 콘솔", href: "/partner" },
      { label: "상품 등록 가이드" },
    ],
  },
  {
    title: "고객지원",
    links: [{ label: "자주 묻는 질문" }, { label: "1:1 문의" }, { label: "공지사항" }],
  },
  {
    title: "팀",
    links: [{ label: "팀 소개" }, { label: "블로그" }],
  },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <p className={styles.logo}>shopportunity</p>
            <div className={styles.policies}>
              <span className={styles.terms}>이용약관</span>
              <span className={styles.privacy}>개인정보처리방침</span>
            </div>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title} className={styles.column}>
              <p className={styles.columnTitle}>{column.title}</p>
              <hr className={styles.divider} />
              {column.links.map((link) =>
                link.href ? (
                  <Link key={link.label} href={link.href} className={styles.link}>
                    {link.label}
                  </Link>
                ) : (
                  <span key={link.label} className={styles.link}>
                    {link.label}
                  </span>
                ),
              )}
            </div>
          ))}

          <Link href="/partner/apply" className={styles.inquiry}>
            입점 문의
          </Link>
        </div>

        <hr className={styles.line} />

        <div className={styles.notice}>
          <p className={styles.team}>
            팀명: Shopportunity&nbsp;&nbsp; 대표: 고건&nbsp;&nbsp; 2026 가톨릭대학교 글로벌
            창업경진대회 참가팀&nbsp;&nbsp; 사업자등록 전
          </p>
          <p className={styles.team}>
            판매처 링크를 통해 구매하면 Shopportunity가 제휴 수수료를 받을 수 있습니다. 상품 가격과
            재고는 판매처 기준입니다.
          </p>
          <p className={styles.copyright}>© 2026 Shopportunity. All Rights Reserved</p>
        </div>
      </div>
    </footer>
  );
}
