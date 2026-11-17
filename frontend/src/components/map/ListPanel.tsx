"use client";
// 오른쪽 "추천 매물" 패널. Figma ListPanel 18:199 (400 x 784).
import { useState } from "react";
import { USE_LABELS } from "@/lib/format";
import type { Listing, UseType } from "@/types";
import type { SortKey } from "@/types/map";
import { ChevronDownIcon } from "./icons";
import ListingRow from "./ListingRow";
import styles from "./ListPanel.module.css";

type Props = {
  listings: Listing[]; // 이미 거르고 정렬한 목록
  use: UseType | null;
  sort: SortKey;
  selectedId: string | null;
  bookmarks: string[];
  onSortChange: (sort: SortKey) => void;
  onUseChange: (use: UseType | null) => void;
  onSelect: (id: string) => void;
  onToggleBookmark: (id: string) => void;
};

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "latest", label: "최신순" },
  { key: "cost", label: "낮은비용순" },
  { key: "popular", label: "인기순" },
];

const USE_OPTIONS = Object.keys(USE_LABELS) as UseType[];

export default function ListPanel({
  listings,
  use,
  sort,
  selectedId,
  bookmarks,
  onSortChange,
  onUseChange,
  onSelect,
  onToggleBookmark,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  function pickUse(next: UseType | null) {
    onUseChange(next);
    setMenuOpen(false);
  }

  return (
    <aside className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.title}>추천 매물</h2>
        <div className={styles.controls}>
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`${styles.sortChip} ${sort === option.key ? styles.sortSelected : ""}`}
              aria-pressed={sort === option.key}
              onClick={() => onSortChange(option.key)}
            >
              {option.label}
            </button>
          ))}
          <div className={styles.filterWrap}>
            <button
              type="button"
              className={styles.filterChip}
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {use ? USE_LABELS[use] : "업종필터"}
              <ChevronDownIcon />
            </button>
            {menuOpen && (
              <ul className={styles.menu} role="listbox">
                <li>
                  <button type="button" className={styles.menuItem} onClick={() => pickUse(null)}>
                    전체 업종
                  </button>
                </li>
                {USE_OPTIONS.map((option) => (
                  <li key={option}>
                    <button
                      type="button"
                      className={`${styles.menuItem} ${option === use ? styles.menuActive : ""}`}
                      onClick={() => pickUse(option)}
                    >
                      {USE_LABELS[option]}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className={styles.list}>
        {listings.length === 0 && (
          <p className={styles.empty}>조건에 맞는 공실이 없어요. 필터나 업종을 바꿔 보세요.</p>
        )}
        {listings.map((listing) => (
          <ListingRow
            key={listing.id}
            listing={listing}
            use={use}
            selected={listing.id === selectedId}
            bookmarked={bookmarks.includes(listing.id)}
            onSelect={() => onSelect(listing.id)}
            onToggleBookmark={() => onToggleBookmark(listing.id)}
          />
        ))}
      </div>
    </aside>
  );
}
