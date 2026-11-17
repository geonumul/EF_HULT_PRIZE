"use client";
// 지도 위 미리보기 카드. Figma S01 18:157(업종 선택 전), S02 22:237(업종 선택 후).
import Link from "next/link";
import { useState } from "react";
import { formatArea, formatMan, USE_LABELS } from "@/lib/format";
import { EMPTY_SPACE_PHOTO } from "@/mocks/map";
import { findRender } from "@/mocks/renders";
import type { Listing, UseType } from "@/types";
import { BookmarkIcon, ChatIcon, SparkIcon } from "./icons";
import styles from "./PreviewCard.module.css";

type Props = {
  listing: Listing;
  use: UseType | null;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  onSelectUse: (use: UseType | null) => void;
};

/** 렌더링에 들어간 집기 개수. 렌더링이 없으면 undefined. */
function countFixtures(listing: Listing, use: UseType): number | undefined {
  if (listing.renderCount === 0) return undefined;
  const render = findRender(`r-${listing.id}-${use}`);
  if (!render) return undefined;
  return render.tags.reduce((sum, tag) => sum + tag.qty, 0);
}

export default function PreviewCard({ listing, use, bookmarked, onToggleBookmark, onSelectUse }: Props) {
  // 이 카드를 다시 열 때마다(공실이나 업종이 바뀔 때) 비교 상태가 처음으로 돌아가도록 MapScreen이 key를 준다.
  const [showEmpty, setShowEmpty] = useState(false);

  const costUses = Object.keys(listing.costs) as UseType[];
  const activeUse = use !== null && listing.costs[use] !== undefined ? use : null;
  const hasRender = listing.renderCount > 0;
  const requestUse = activeUse ?? costUses[0]; // 업종을 고르지 않았으면 첫 번째 업종으로 요청한다.
  const emptyUseCount = Object.keys(USE_LABELS).length - costUses.length;

  const showRender = activeUse !== null && hasRender && !showEmpty;
  const photo = showRender ? `/images/render-${activeUse}.jpg` : EMPTY_SPACE_PHOTO;
  const needsDemolition = listing.condition !== "vacant";

  const studioHref = `/space/${listing.id}/studio?use=${requestUse}`;
  const chatHref = `/space/${listing.id}/studio/chat?use=${requestUse}`;
  const demolitionHref = `/space/${listing.id}/demolition`;

  const fixtureCount = activeUse ? countFixtures(listing, activeUse) : undefined;
  const month = new Date().getMonth() + 1;

  return (
    <div className={styles.card} onClick={(event) => event.stopPropagation()}>
      <div className={styles.photoBox}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.photo} src={photo} alt={`${listing.address} ${listing.tag}`} />
        <span className={styles.stateBadge}>
          <SparkIcon />
          {showRender ? "AI 렌더링" : "현재 상태"}
        </span>
        {showRender && (
          <button type="button" className={styles.photoPill} onClick={() => setShowEmpty(true)}>
            빈 공간 비교
          </button>
        )}
        {activeUse !== null && hasRender && showEmpty && (
          <button type="button" className={styles.photoPill} onClick={() => setShowEmpty(false)}>
            AI 렌더링 보기
          </button>
        )}
        {activeUse === null && (
          <span className={`${styles.photoPill} ${styles.photoHint}`}>
            <SparkIcon color="#5EEAC4" />
            업종 선택 시 렌더링 표시
          </span>
        )}
      </div>

      <div className={styles.info}>
        <p className={styles.meta}>
          {listing.address} · {listing.floor}층 · {formatArea(listing.areaM2)} · 천장고 {listing.ceilingHeightM}m
        </p>
        {activeUse === null ? (
          <p className={styles.title}>업종별 창업비</p>
        ) : (
          <>
            <p className={styles.costLine}>
              <span className={styles.costName}>{USE_LABELS[activeUse]} 창업</span>
              <span className={styles.costValue}>{formatMan(listing.costs[activeUse] ?? 0)}</span>
            </p>
            <p className={styles.meta}>
              {fixtureCount !== undefined ? `집기 ${fixtureCount}개 · ` : ""}시공 견적 3곳 평균 · {month}월 기준
            </p>
          </>
        )}
      </div>

      <div className={styles.tiles}>
        {costUses.map((tileUse) => {
          const selected = tileUse === activeUse;
          return (
            <button
              key={tileUse}
              type="button"
              className={`${styles.tile} ${selected ? styles.tileSelected : ""}`}
              aria-pressed={selected}
              onClick={() => onSelectUse(selected ? null : tileUse)}
            >
              <span className={styles.tileName}>{USE_LABELS[tileUse]}</span>
              <span className={styles.tileCost}>{formatMan(listing.costs[tileUse] ?? 0)} 원</span>
            </button>
          );
        })}
        {emptyUseCount > 0 && (
          <span className={styles.moreTile} title="아직 창업비를 산출하지 않은 업종">
            + {emptyUseCount}
          </span>
        )}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.bookmark}
          aria-label={bookmarked ? "북마크 해제" : "북마크"}
          aria-pressed={bookmarked}
          onClick={onToggleBookmark}
        >
          <BookmarkIcon active={bookmarked} color="#4E5968" />
        </button>
        {activeUse !== null && hasRender ? (
          <Link href={studioHref} className={styles.primary}>
            스튜디오 보기
          </Link>
        ) : (
          <Link href={chatHref} className={styles.primary}>
            <ChatIcon />
            텍스트로 렌더링 요청
          </Link>
        )}
      </div>

      <p className={styles.links}>
        {activeUse === null && hasRender && <Link href={studioHref}>스튜디오 보기</Link>}
        {activeUse !== null && hasRender && <Link href={chatHref}>텍스트로 렌더링 요청</Link>}
        {needsDemolition && <Link href={demolitionHref}>철거 견적 받기</Link>}
      </p>
    </div>
  );
}
