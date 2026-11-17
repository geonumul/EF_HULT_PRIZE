"use client";

// 스튜디오 상단 바. 뒤로가기와 공간 요약, 업종 전환 탭. Figma SubHeader 24:264.
// right 자리에는 렌더링 방식 전환(이미지 먼저 / 상품 먼저)을 넣는다.
import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import type { Listing, UseType } from "@/types";
import type { StudioView } from "@/types/studio";
import { formatArea, USE_LABELS } from "@/lib/format";
import { COMING_USES } from "@/mocks/studio";
import styles from "./StudioSubHeader.module.css";

type Props = {
  listing: Listing;
  active: StudioView;
  onSelect: (view: StudioView) => void;
  right?: ReactNode;
};

export default function StudioSubHeader({ listing, active, onSelect, right }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const uses = Object.keys(listing.costs) as UseType[];
  const tabs: { key: StudioView; label: string }[] = [
    { key: "empty", label: "빈 공간" },
    ...uses.map((use) => ({ key: use as StudioView, label: USE_LABELS[use] })),
  ];

  function pickComingUse(use: UseType) {
    setNotice(`${USE_LABELS[use]} 렌더링은 아직 준비 중이에요.`);
  }

  return (
    <div className={styles.subHeader}>
      <Link href="/map" className={styles.back} aria-label="지도로 돌아가기">
        <img src="/images/studio/icon-back.svg" alt="" width={18} height={18} />
        <span className={styles.summary}>
          <span className={styles.title}>
            {listing.address} · {listing.tag}
          </span>
          <span className={styles.meta}>
            {formatArea(listing.areaM2)} · 천장고 {listing.ceilingHeightM}m · 보증금 {listing.deposit.toLocaleString("ko-KR")} / 월세 {listing.rent}
          </span>
        </span>
      </Link>

      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={active === tab.key ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            onClick={() => onSelect(tab.key)}
          >
            {tab.label}
          </button>
        ))}
        <div className={styles.addWrap}>
          <button
            type="button"
            className={styles.tab}
            onClick={() => {
              setMenuOpen(!menuOpen);
              setNotice("");
            }}
          >
            + 업종 추가
          </button>
          {menuOpen && (
            <div className={styles.menu}>
              {COMING_USES.map((use) => (
                <button key={use} type="button" className={styles.menuItem} onClick={() => pickComingUse(use)}>
                  {USE_LABELS[use]}
                </button>
              ))}
              {notice && <p className={styles.notice}>{notice}</p>}
            </div>
          )}
        </div>
      </div>

      {right && <div className={styles.right}>{right}</div>}
    </div>
  );
}
