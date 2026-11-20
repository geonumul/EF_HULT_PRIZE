"use client";

// 렌더링 이미지와 그 위의 번호 태그. Figma RenderCanvas 24:282.
// 태그를 누르는 동작과 팝오버는 부모가 정한다. 여기서는 그리기만 한다.
import { useState } from "react";
import type { ReactNode } from "react";
import type { RenderTag } from "@/types";
import styles from "./RenderCanvas.module.css";

type Props = {
  imageUrl: string;
  imageFilter?: string;
  tags: RenderTag[];
  activeTagN: number | null;
  onTagClick: (n: number) => void;
  onBackgroundClick?: () => void;
  leftBadge: string;
  /** 3D를 볼 때처럼 화면이 작아질 때 위쪽 배지를 모두 숨긴다. */
  hideBadges?: boolean;
  /** 왼쪽 위 배지 아래에 쌓는 근거 표시와 검수 결과 */
  extraBadges?: { text: string; tone?: "ok" | "bad" }[];
  rightBadge: string;
  rightBadgeWarn?: boolean;
  /** 렌더링이 만들어지는 중이면 진행 상태를 보여 준다. progress가 없으면 막대 없이 돈다. */
  loading?: { label: string; progress?: number };
  /** 상품 먼저 결과의 치수 검증 문구 */
  checks?: string[];
  onBackToBoard?: () => void;
  /** 오른쪽 위 배지 아래 버튼들 */
  actions?: ReactNode;
  children?: ReactNode; // 팝오버와 스타일 바
};

export default function RenderCanvas(props: Props) {
  const { imageUrl, imageFilter, tags, activeTagN, onTagClick, loading, checks } = props;
  const [infoOpen, setInfoOpen] = useState(false);
  const extras = props.extraBadges ?? [];
  const important = extras.filter((badge) => badge.tone); // 검수 결과, 경고
  const plain = extras.filter((badge) => !badge.tone); // 근거 표시. 접어 둔다.
  const rightBadgeClass = props.rightBadgeWarn
    ? `${styles.badge} ${styles.badgeRight} ${styles.badgeWarn}`
    : `${styles.badge} ${styles.badgeRight}`;

  return (
    <div className={styles.canvas} onClick={props.onBackgroundClick}>
      <img className={styles.image} src={imageUrl} alt="AI 렌더링 이미지" style={{ filter: imageFilter }} />

      <div className={styles.top}>
        <div className={styles.leftStack} style={props.hideBadges ? { display: "none" } : undefined}>
          <div className={`${styles.badge} ${styles.badgeLeft}`}>
            <img src="/images/studio/icon-sparkle.svg" alt="" width={12} height={12} />
            {props.leftBadge}
          </div>
          {important.map((badge) => (
            <div key={badge.text} className={`${styles.badge} ${styles.badgeLeft} ${badge.tone === "bad" ? styles.extraBad : styles.extraOk}`}>
              {badge.text}
            </div>
          ))}
          {plain.length > 0 && (
            <button
              type="button"
              className={`${styles.badge} ${styles.badgeLeft} ${styles.infoButton}`}
              onClick={(event) => {
                event.stopPropagation();
                setInfoOpen(!infoOpen);
              }}
              aria-expanded={infoOpen}
            >
              ⓘ 안내 {plain.length}
            </button>
          )}
          {infoOpen &&
            plain.map((badge) => (
              <div key={badge.text} className={`${styles.badge} ${styles.badgeLeft} ${styles.extra}`}>
                {badge.text}
              </div>
            ))}
        </div>
        <div className={styles.rightStack} style={props.hideBadges ? { display: "none" } : undefined}>
          <div className={rightBadgeClass}>
            <img src={props.rightBadgeWarn ? "/images/studio/icon-warn.svg" : "/images/studio/icon-ok.svg"} alt="" width={14} height={14} />
            {props.rightBadge}
          </div>
          {props.actions}
        </div>
      </div>

      {checks && (
        <div className={styles.checks} onClick={(event) => event.stopPropagation()}>
          <p className={styles.checksTitle}>치수 검증</p>
          {checks.map((text) => {
            const isWarn = text.startsWith("확인 필요");
            return (
              <p key={text} className={isWarn ? `${styles.checkLine} ${styles.checkWarn}` : styles.checkLine}>
                <img src={isWarn ? "/images/studio/icon-warn.svg" : "/images/studio/icon-ok.svg"} alt="" width={14} height={14} />
                {text}
              </p>
            );
          })}
          {props.onBackToBoard && (
            <button type="button" className={styles.backButton} onClick={props.onBackToBoard}>
              보드에서 상품 바꾸기
            </button>
          )}
        </div>
      )}

      {tags.map((tag) => (
        <button
          key={tag.n}
          type="button"
          aria-label={`${tag.n}번 상품 보기`}
          className={tag.n === activeTagN ? `${styles.tag} ${styles.tagActive}` : styles.tag}
          style={{ left: `calc(${tag.x}% - 14px)`, top: `calc(${tag.y}% - 14px)` }}
          onClick={(event) => {
            event.stopPropagation();
            onTagClick(tag.n);
          }}
        >
          <img className={styles.tagRing} src="/images/studio/tag-ring.svg" alt="" width={40} height={40} />
          <span className={styles.tagNumber}>{tag.n}</span>
        </button>
      ))}

      {props.children}

      {loading && (
        <div className={styles.loading} role="status" onClick={(event) => event.stopPropagation()}>
          <div className={styles.loadingCard}>
            <span className={styles.spinner} />
            <p className={styles.loadingLabel}>{loading.label}</p>
            {loading.progress !== undefined && (
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${loading.progress}%` }} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
