"use client";
// 오른쪽 목록의 공실 한 줄. Figma ListingRow 17:86 (399 x 144).
import { formatArea, formatMan, USE_LABELS } from "@/lib/format";
import type { Listing, UseType } from "@/types";
import { BookmarkIcon } from "./icons";
import { costOf, mainUseOf, useTitle } from "./listingHelpers";
import styles from "./ListingRow.module.css";

type Props = {
  listing: Listing;
  use: UseType | null;
  selected: boolean;
  bookmarked: boolean;
  onSelect: () => void;
  onToggleBookmark: () => void;
};

export default function ListingRow({ listing, use, selected, bookmarked, onSelect, onToggleBookmark }: Props) {
  const cost = costOf(listing, use);
  const mainUse = use ?? mainUseOf(listing, null);
  const otherUses = (Object.keys(listing.costs) as UseType[]).filter((other) => other !== mainUse);

  return (
    <div
      className={`${styles.row} ${selected ? styles.selected : ""}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div className={styles.thumb}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.thumbImage} src={listing.thumbnail} alt="" />
        <span className={styles.renderChip}>{listing.renderCount === 0 ? "빈 공간" : "AI 렌더링"}</span>
      </div>

      <div className={styles.info}>
        <span className={styles.tag}>{listing.tag}</span>
        {cost !== undefined ? (
          <p className={styles.price}>
            <span>{useTitle(mainUse)}</span>
            <span>{formatMan(cost)}</span>
          </p>
        ) : (
          <p className={styles.price}>
            <span>{USE_LABELS[mainUse]} 창업</span>
            <span className={styles.noCost}>산출 전</span>
          </p>
        )}
        <p className={styles.rent}>
          보증금 {listing.deposit.toLocaleString("ko-KR")} · 월세 {listing.rent.toLocaleString("ko-KR")}
        </p>
        <p className={styles.place}>
          {formatArea(listing.areaM2)} · {listing.floor}층 · {listing.nearby}
        </p>
        <div className={styles.otherUses}>
          {otherUses.map((other) => (
            <span key={other} className={styles.otherUse}>
              {USE_LABELS[other]} {formatMan(listing.costs[other] ?? 0)}
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        className={styles.bookmark}
        aria-label={bookmarked ? "북마크 해제" : "북마크"}
        aria-pressed={bookmarked}
        onClick={(event) => {
          event.stopPropagation(); // 줄 선택과 겹치지 않게 한다.
          onToggleBookmark();
        }}
      >
        <BookmarkIcon active={bookmarked} />
      </button>
    </div>
  );
}
