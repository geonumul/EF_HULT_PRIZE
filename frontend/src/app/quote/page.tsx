// 업종별 견적 목록. 공실과 업종을 골라 견적서로 들어간다. 시안이 없어 기존 카드 스타일로 만들었다.
import Link from "next/link";
import Footer from "@/components/layout/Footer";
import { USE_LABELS, formatMan } from "@/lib/format";
import { LISTINGS } from "@/mocks/listings";
import type { UseType } from "@/types";
import styles from "./page.module.css";

export default function QuoteListPage() {
  return (
    <>
      <main className={styles.main}>
        <h1 className={styles.title}>업종별 견적</h1>
        <p className={styles.desc}>공실과 업종을 고르면 확정 견적서를 볼 수 있습니다.</p>

        {LISTINGS.map((listing) => (
          <section key={listing.id} className={styles.listing}>
            <h2 className={styles.listingName}>
              {listing.address} {listing.tag}
              <span className={styles.listingMeta}> · {listing.nearby}</span>
            </h2>
            <div className={styles.cards}>
              {(Object.keys(listing.costs) as UseType[]).map((useType) => (
                <Link key={useType} href={`/quote/r-${listing.id}-${useType}`} className={styles.card}>
                  <span className={styles.use}>{USE_LABELS[useType]}</span>
                  <span className={styles.cost}>창업비 {formatMan(listing.costs[useType] ?? 0)}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </main>
      <Footer />
    </>
  );
}
