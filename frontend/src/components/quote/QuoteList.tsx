"use client";

// 업종별 견적 목록. 공실마다 업종 카드를 보여 주고, 위쪽 칩으로 업종을 골라 거른다.
// 카드를 누르면 그 공실·업종의 견적서(/quote/<렌더링id>)로 간다.
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Chip from "@/components/ui/Chip";
import { USE_LABELS, formatArea, formatMan } from "@/lib/format";
import { useListings } from "@/lib/api/hooks";
import type { Listing, SpaceCondition, UseType, Verdict } from "@/types";
import styles from "./QuoteList.module.css";

const FILTERS: { label: string; use: UseType | null }[] = [
  { label: "전체", use: null },
  { label: "카페", use: "cafe" },
  { label: "팝업", use: "popup" },
  { label: "필라테스", use: "pilates" },
];

const CONDITION_LABELS: Record<SpaceCondition, string> = {
  vacant: "빈 공간",
  has_fixtures: "집기 일부 남음",
  occupied: "영업 점포 · 철거 필요",
};

const VERDICT_LABELS: Record<Verdict, string> = {
  possible: "가능",
  conditional: "조건부",
  impossible: "불가",
};

function usesOf(listing: Listing, filter: UseType | null): UseType[] {
  const all = Object.keys(listing.costs) as UseType[];
  return filter === null ? all : all.filter((use) => use === filter);
}

export default function QuoteList() {
  const [filter, setFilter] = useState<UseType | null>(null);
  const { listings } = useListings();

  // 선택한 업종이 없는 공실은 목록에서 뺀다.
  const visible = listings.filter((listing) => usesOf(listing, filter).length > 0);

  return (
    <>
      <div className={styles.filters}>
        {FILTERS.map((item) => (
          <Chip key={item.label} selected={filter === item.use} onClick={() => setFilter(item.use)}>
            {item.label}
          </Chip>
        ))}
      </div>

      {visible.length === 0 && <p className={styles.empty}>조건에 맞는 공실이 없습니다.</p>}

      {visible.map((listing) => (
        <section key={listing.id} className={styles.listing}>
          <div className={styles.info}>
            <Image src={listing.thumbnail} alt="" width={96} height={96} className={styles.thumb} />
            <div className={styles.infoText}>
              <p className={styles.tag}>{listing.tag}</p>
              <h2 className={styles.name}>
                {listing.address} <span className={styles.nearby}>{listing.nearby}</span>
              </h2>
              <p className={styles.spec}>
                {formatArea(listing.areaM2)} · {listing.floor}층 · 천장 {listing.ceilingHeightM}m
              </p>
              <p className={styles.rent}>
                {listing.terms === "inquiry" ? "임대 조건 문의" : `보증금 ${listing.deposit.toLocaleString("ko-KR")} · 월세 ${listing.rent}`}
              </p>
              <p className={styles.condition}>{CONDITION_LABELS[listing.condition]}</p>
            </div>
          </div>

          <div className={styles.cards}>
            {usesOf(listing, filter).map((use) => {
              const verdict = listing.verdicts[use];
              return (
                <Link key={use} href={`/quote/r-${listing.id}-${use}`} className={styles.card}>
                  <Image src={`/images/render-${use}.jpg`} alt="" width={240} height={120} className={styles.cardImage} />
                  <div className={styles.cardBody}>
                    <div className={styles.cardHead}>
                      <span className={styles.use}>{USE_LABELS[use]}</span>
                      {verdict && <Badge verdict={verdict} label={VERDICT_LABELS[verdict]} />}
                    </div>
                    <span className={styles.cost}>창업비 {formatMan(listing.costs[use] ?? 0)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
