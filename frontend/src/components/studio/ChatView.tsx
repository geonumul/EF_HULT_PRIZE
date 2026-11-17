"use client";

// S04 텍스트 렌더링 요청. Figma 25:242.
// 요청을 보내면 AI 응답(배치 계획과 치수 검증), 렌더링 진행, 결과 순서로 메시지가 이어진다. 응답은 모두 가짜다.
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Listing, UseType } from "@/types";
import type { ChatMessage, ChatPlan, NewChatMessage, RenderStyleKey } from "@/types/studio";
import { findRender } from "@/mocks/renders";
import { QUICK_REQUESTS, RENDER_STYLES } from "@/mocks/studio";
import { makeChecks, makePlan, removeOneTable } from "@/lib/chatPlan";
import { runFakeProgress } from "@/lib/fakeProgress";
import { USE_LABELS, formatArea, formatMan } from "@/lib/format";
import StudioShell from "./StudioShell";
import StudioSubHeader from "./StudioSubHeader";
import RenderCanvas from "./RenderCanvas";
import StyleBar from "./StyleBar";
import ChatMessageView from "./ChatMessageView";
import styles from "./ChatView.module.css";

type Props = {
  listing: Listing;
  initialUse: UseType;
};

const AI_REPLY_MS = 800;
const RENDER_START_MS = 1000;
const RENDER_MS = 1800;

const GREETING: ChatMessage = {
  id: 1,
  kind: "ai",
  text: "원하는 배치와 스타일을 적어 주세요. 공간 치수는 그대로 지키고 통로 폭과 좌석 간격을 검증해 드려요.",
};

export default function ChatView({ listing, initialUse }: Props) {
  const [useType, setUseType] = useState<UseType>(initialUse);
  const [styleKey, setStyleKey] = useState<RenderStyleKey>("wood");
  const [showEmpty, setShowEmpty] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<ChatPlan | null>(null);

  const nextId = useRef(2);
  const endRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cancelProgress = useRef<(() => void) | null>(null);

  // 새 메시지가 생기면 맨 아래로 내린다.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  // 화면을 떠날 때 남은 타이머를 모두 멈춘다.
  useEffect(() => {
    const pendingTimers = timers.current;
    return () => {
      pendingTimers.forEach(clearTimeout);
      if (cancelProgress.current) cancelProgress.current();
    };
  }, []);

  function later(ms: number, action: () => void) {
    timers.current.push(setTimeout(action, ms));
  }

  function addMessage(message: NewChatMessage) {
    const id = nextId.current++;
    setMessages((current) => [...current, { ...message, id } as ChatMessage]);
    return id;
  }

  // ---- 응답 흐름 ----

  /** 렌더링 진행 메시지를 넣고 1~2초 동안 막대를 올린다. */
  function startRendering(forPlan: ChatPlan) {
    const id = addMessage({ kind: "rendering", progress: 0 });
    cancelProgress.current = runFakeProgress(
      RENDER_MS,
      (progress) => {
        setMessages((current) => current.map((m) => (m.id === id && m.kind === "rendering" ? { ...m, progress } : m)));
      },
      () => {
        const seconds = 28 + forPlan.tables;
        const renderId = `r-${listing.id}-${useType}`;
        setMessages((current) => current.map((m) => (m.id === id && m.kind === "rendering" ? { ...m, seconds, renderId } : m)));
        setBusy(false);
      },
    );
  }

  /** AI의 배치 계획 메시지를 넣고, 잠시 뒤 렌더링을 이어 시작한다. */
  function replyWithPlan(nextPlan: ChatPlan) {
    addMessage({ kind: "ai", plan: nextPlan, checks: makeChecks(nextPlan) });
    setPlan(nextPlan);
    later(RENDER_START_MS, () => startRendering(nextPlan));
  }

  function sendRequest(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setInput("");
    addMessage({ kind: "user", text: trimmed });
    later(AI_REPLY_MS, () => replyWithPlan(makePlan(trimmed, plan ?? undefined)));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    sendRequest(input);
  }

  function renderAgain(messagePlan: ChatPlan) {
    if (busy) return;
    setBusy(true);
    setPlan(messagePlan);
    startRendering(messagePlan);
  }

  function removeTable(messagePlan: ChatPlan) {
    if (busy) return;
    setBusy(true);
    addMessage({ kind: "user", text: "테이블 1개 빼 주세요" });
    later(AI_REPLY_MS, () => replyWithPlan(removeOneTable(messagePlan)));
  }

  // ---- 보여 줄 값 ----

  const render = findRender(`r-${listing.id}-${useType}`);
  const productCount = render ? render.tags.reduce((sum, tag) => sum + tag.qty, 0) : 0;
  const cost = listing.costs[useType] ?? 0;
  const resultSummary = `판매 상품 ${productCount}개 매칭 · ${USE_LABELS[useType]} ${formatMan(cost)}`;

  const runningMessage = messages.find((m) => m.kind === "rendering" && m.progress < 100);
  const loading = runningMessage && runningMessage.kind === "rendering"
    ? { label: "텍스트 요청으로 렌더링 중", progress: runningMessage.progress }
    : undefined;

  const imageUrl = showEmpty ? "/images/empty-space.jpg" : `/images/render-${useType}.jpg`;
  const filter = showEmpty ? "none" : RENDER_STYLES.find((style) => style.key === styleKey)?.filter;
  const measured = `${formatArea(listing.areaM2)} · 천장고 ${listing.ceilingHeightM}m · 실측 기준`;
  const rightBadge = plan && !showEmpty ? `통로 ${plan.aisleMm}mm · 좌석 ${plan.seats}석 · 치수 검증 완료` : measured;

  const canvas = (
    <RenderCanvas
      imageUrl={imageUrl}
      imageFilter={filter}
      tags={[]}
      activeTagN={null}
      onTagClick={() => {}}
      leftBadge={`AI 렌더링 · 판매 상품 ${productCount}개`}
      rightBadge={rightBadge}
      loading={loading}
    >
      <StyleBar
        imageUrl={`/images/render-${useType}.jpg`}
        styleKey={styleKey}
        emptyActive={showEmpty}
        onSelectEmpty={() => setShowEmpty(true)}
        onSelectStyle={(key) => {
          setShowEmpty(false);
          setStyleKey(key);
        }}
      />
    </RenderCanvas>
  );

  const panel = (
    <>
      <div className={styles.head}>
        <p className={styles.title}>텍스트 렌더링 요청</p>
        <p className={styles.sub}>
          공간 치수 고정 · {formatArea(listing.areaM2)} · 천장고 {listing.ceilingHeightM}m
        </p>
      </div>

      <div className={styles.messages}>
        {messages.map((message) => (
          <ChatMessageView
            key={message.id}
            message={message}
            imageUrl={`/images/render-${useType}.jpg`}
            resultSummary={resultSummary}
            studioHref={`/space/${listing.id}/studio?use=${useType}`}
            quoteHref={`/quote/r-${listing.id}-${useType}`}
            busy={busy}
            onRenderPlan={() => message.kind === "ai" && message.plan && renderAgain(message.plan)}
            onRemoveTable={() => message.kind === "ai" && message.plan && removeTable(message.plan)}
          />
        ))}
        <div ref={endRef} />
      </div>

      <div className={styles.footer}>
        <div className={styles.chips}>
          {QUICK_REQUESTS.map((text) => (
            <button key={text} type="button" className={styles.chip} onClick={() => setInput(text)}>
              {text}
            </button>
          ))}
        </div>
        <form className={styles.inputBox} onSubmit={handleSubmit}>
          <input
            className={styles.input}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="배치·스타일 입력"
            aria-label="배치와 스타일 요청"
          />
          <button type="submit" className={styles.send} disabled={busy || !input.trim()} aria-label="요청 보내기">
            <img src="/images/studio/icon-send.svg" alt="" width={16} height={16} />
          </button>
        </form>
      </div>
    </>
  );

  return (
    <StudioShell
      subHeader={
        <StudioSubHeader
          listing={listing}
          active={showEmpty ? "empty" : useType}
          onSelect={(view) => {
            if (view === "empty") setShowEmpty(true);
            else {
              setShowEmpty(false);
              setUseType(view);
            }
          }}
        />
      }
      canvas={canvas}
      panel={panel}
    />
  );
}
