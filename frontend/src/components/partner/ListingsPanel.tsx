"use client";

// S10 파트너 콘솔의 "공실 관리". Figma 40:482. 공실 등록 폼과 등록 목록 표.
import { useState } from "react";
import { INITIAL_LISTINGS } from "@/mocks/partner";
import type { Verdict } from "@/types";
import type { ListingStatus, PartnerListing } from "@/types/partner";
import KpiCards from "./KpiCards";
import ListingForm from "./ListingForm";
import { useStoredList } from "./partnerStorage";
import styles from "./Panel.module.css";

const TAG_STYLE: Record<Verdict, string> = {
  possible: styles.tagGreen,
  conditional: styles.tagOrange,
  impossible: styles.tagRed,
};

const STATUS_STYLE: Record<ListingStatus, string> = {
  "게시 중": styles.statusPlain,
  "렌더링 생성 중": styles.statusOrange,
  "진단 보완 필요": styles.statusRed,
};

const COLUMNS = "340px 180px 260px 140px 1fr";

export default function ListingsPanel() {
  const [listings, saveListings] = useStoredList<PartnerListing>("partner-listings", INITIAL_LISTINGS);
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState("");

  function addListing(listing: PartnerListing) {
    saveListings([listing, ...listings]);
    setFormOpen(false);
    setNotice(`"${listing.title}"을 등록했습니다. 업종 진단과 렌더링이 곧 붙습니다.`);
  }

  function toggleFeatured(id: string) {
    saveListings(listings.map((l) => (l.id === id ? { ...l, featured: !l.featured } : l)));
  }

  function removeListing(id: string) {
    saveListings(listings.filter((l) => l.id !== id));
  }

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>공실 관리</h1>
          <p className={styles.desc}>사진 5장과 치수를 올리면 업종 진단과 렌더링이 자동으로 붙습니다</p>
        </div>
        <button type="button" className={styles.newButton} onClick={() => setFormOpen(!formOpen)}>
          {formOpen ? "닫기" : "공실 등록"}
        </button>
      </div>

      {formOpen && <ListingForm onSubmit={addListing} onCancel={() => setFormOpen(false)} />}
      {notice && <p className={styles.notice} role="status">{notice}</p>}

      <KpiCards listings={listings} />

      <div className={styles.table}>
        <div className={styles.tableHead} style={{ gridTemplateColumns: COLUMNS }}>
          <span>공실</span>
          <span>업종 진단</span>
          <span>렌더링 조회 · 견적</span>
          <span>상태</span>
          <span>노출</span>
        </div>

        {listings.length === 0 && <p className={styles.empty}>등록한 공실이 없습니다. 오른쪽 위의 공실 등록을 눌러 주세요.</p>}

        {listings.map((listing) => (
          <div key={listing.id} className={styles.row} style={{ gridTemplateColumns: COLUMNS }}>
            <div className={styles.listingCell}>
              {/* 시안의 공실 사진은 임시 이미지다. 실제 사진 업로드는 서버가 생긴 뒤에 연결한다. */}
              <img className={styles.thumb} src="/images/empty-space.jpg" alt="" />
              <div>
                <div className={styles.rowTitle}>{listing.title}</div>
                <div className={styles.rowSub}>
                  보증금 {listing.deposit.toLocaleString("ko-KR")} · 월세 {listing.rent.toLocaleString("ko-KR")}
                </div>
              </div>
            </div>

            <div className={styles.tags}>
              {listing.diagnoses.length === 0 && <span className={`${styles.tag} ${styles.tagGray}`}>진단 대기</span>}
              {listing.diagnoses.map((d) => (
                <span key={d.label} className={`${styles.tag} ${TAG_STYLE[d.verdict]}`}>{d.label}</span>
              ))}
            </div>

            <span>
              {listing.views > 0 ? `${listing.views.toLocaleString("ko-KR")}회 · 견적 ${listing.quotes}건` : "—"}
            </span>

            <span className={STATUS_STYLE[listing.status]}>{listing.status}</span>

            <div className={styles.exposure}>
              <button
                type="button"
                className={listing.featured ? `${styles.pill} ${styles.pillOn}` : `${styles.pill} ${styles.pillOff}`}
                aria-pressed={listing.featured}
                onClick={() => toggleFeatured(listing.id)}
              >
                {listing.featured ? "상단 노출" : "일반"}
              </button>
              <button type="button" className={styles.deleteButton} onClick={() => removeListing(listing.id)}>
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
