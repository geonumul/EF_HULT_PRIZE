"use client";

// 채팅 말풍선 한 개. 종류는 user, ai, rendering 세 가지다. Figma ChatPanel 25:422의 말풍선들.
import Link from "next/link";
import type { ChatMessage } from "@/types/studio";
import FloorPlan from "./FloorPlan";
import styles from "./ChatMessageView.module.css";

type Props = {
  message: ChatMessage;
  imageUrl: string; // 결과 썸네일
  resultSummary: string; // "판매 상품 28개 매칭 · 카페 4,200만"
  studioHref: string;
  quoteHref: string;
  busy: boolean;
  onRenderPlan: () => void;
  onRemoveTable: () => void;
};

export default function ChatMessageView(props: Props) {
  const { message } = props;

  if (message.kind === "user") {
    return (
      <div className={styles.userRow}>
        <p className={styles.user}>{message.text}</p>
      </div>
    );
  }

  if (message.kind === "ai") {
    return (
      <div className={styles.ai}>
        {message.text && <p className={styles.aiText}>{message.text}</p>}
        {message.plan && message.checks && (
          <>
            <p className={styles.aiTitle}>배치 검토</p>
            <FloorPlan plan={message.plan} />
            {message.checks.map((check) => (
              <p key={check.text} className={styles.check}>
                <img src={check.ok ? "/images/studio/icon-ok.svg" : "/images/studio/icon-warn.svg"} alt="" width={14} height={14} />
                {check.text}
              </p>
            ))}
            <div className={styles.actions}>
              <button type="button" className={styles.primary} disabled={props.busy} onClick={props.onRenderPlan}>
                이대로 렌더링
              </button>
              <button type="button" className={styles.secondary} disabled={props.busy} onClick={props.onRemoveTable}>
                테이블 1개 빼기
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  const isDone = message.progress >= 100;
  return (
    <div className={styles.ai}>
      {isDone ? (
        <>
          <div className={styles.result}>
            <img className={styles.resultImage} src={props.imageUrl} alt="렌더링 결과" />
            <div>
              <p className={styles.resultTitle}>렌더링 완료 · {message.seconds}초</p>
              <p className={styles.resultSummary}>{props.resultSummary}</p>
            </div>
          </div>
          <div className={styles.actions}>
            <Link href={props.studioHref} className={styles.primaryLink}>
              스튜디오에서 보기
            </Link>
            <Link href={props.quoteHref} className={styles.secondaryLink}>
              견적 확정
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className={styles.aiTitle}>렌더링 중 {message.progress}%</p>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${message.progress}%` }} />
          </div>
        </>
      )}
    </div>
  );
}
