"use client";

// S03 공간 스튜디오 전체. Figma 24:242 (태그 열림 30:242, 팝업 30:800, 필라테스 30:980, 빈 공간 30:1160).
// 상태는 모두 여기 모아 두고, 그리기는 작은 컴포넌트에 맡긴다.
// 렌더링 방식이 "이미지 먼저"면 mocks/renders.ts의 렌더링을, "상품 먼저"면 렌더링 보드로 만든 결과를 보여 준다.
import { useEffect, useRef, useState } from "react";
import type { Listing, RenderResult, UseType } from "@/types";
import type { RenderStyleKey, StudioMode } from "@/types/studio";
import { buildQuote } from "@/lib/quote";
import { runFakeProgress } from "@/lib/fakeProgress";
import { buildProductsRender } from "@/lib/productsRender";
import { useRenderBoard } from "@/lib/renderBoard";
import { USE_LABELS, formatArea } from "@/lib/format";
import { findProduct } from "@/mocks/products";
import { findRender } from "@/mocks/renders";
import { RENDER_STYLES } from "@/mocks/studio";
import { generatedRenderUrl } from "@/lib/generatedRenders";
import StudioShell from "./StudioShell";
import StudioSubHeader from "./StudioSubHeader";
import ModeSwitch from "./ModeSwitch";
import RenderCanvas from "./RenderCanvas";
import StyleBar from "./StyleBar";
import TagPopover from "./TagPopover";
import QuotePanel from "./QuotePanel";
import BoardPanel from "./BoardPanel";

type Props = {
  listing: Listing;
  initialUse: UseType;
};

/** 태그 하나에 사용자가 바꾼 내용. 수량과 견적 포함 여부 */
type TagEdit = { qty?: number; excluded?: boolean };

const LOADING_MS = 700;
const BOARD_RENDER_MS = 1500;

export default function StudioView({ listing, initialUse }: Props) {
  const board = useRenderBoard();

  const [useType, setUseType] = useState<UseType>(initialUse);
  const [showEmpty, setShowEmpty] = useState(false);
  const [styleKey, setStyleKey] = useState<RenderStyleKey>("wood");
  const [mode, setMode] = useState<StudioMode>("image");
  const [loadingLabel, setLoadingLabel] = useState("");
  const [activeTagN, setActiveTagN] = useState<number | null>(null);
  const [usedIds, setUsedIds] = useState<string[]>([]);
  const [edits, setEdits] = useState<Record<string, TagEdit>>({});
  const [productResult, setProductResult] = useState<RenderResult | null>(null);
  const [boardProgress, setBoardProgress] = useState<number | null>(null);

  // 화면을 떠날 때 돌고 있는 타이머와 가짜 진행을 멈춘다.
  const loadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelProgress = useRef<(() => void) | null>(null);
  useEffect(() => {
    return () => {
      if (loadingTimer.current) clearTimeout(loadingTimer.current);
      if (cancelProgress.current) cancelProgress.current();
    };
  }, []);

  function showLoading(label: string) {
    setLoadingLabel(label);
    if (loadingTimer.current) clearTimeout(loadingTimer.current);
    loadingTimer.current = setTimeout(() => setLoadingLabel(""), LOADING_MS);
  }

  function resetSelection() {
    setActiveTagN(null);
    setEdits({});
  }

  // ---- 사용자 동작 ----

  function selectView(view: UseType | "empty") {
    if (view === "empty") {
      setShowEmpty(true);
      setActiveTagN(null);
      return;
    }
    setShowEmpty(false);
    if (view !== useType) {
      setUseType(view);
      setProductResult(null); // 보드 결과는 업종마다 다시 만든다.
      resetSelection();
      showLoading("렌더링을 불러오는 중");
    }
  }

  function selectStyle(key: RenderStyleKey) {
    setShowEmpty(false);
    if (key !== styleKey) {
      setStyleKey(key);
      showLoading("스타일을 적용하는 중");
    }
  }

  function changeMode(next: StudioMode) {
    setMode(next);
    setShowEmpty(false);
    resetSelection();
  }

  function startBoardRender() {
    setBoardProgress(0);
    resetSelection();
    cancelProgress.current = runFakeProgress(BOARD_RENDER_MS, setBoardProgress, () => {
      setProductResult(buildProductsRender(listing.id, useType, board.items));
      setBoardProgress(null);
    });
  }

  function backToBoard() {
    setProductResult(null);
    resetSelection();
  }

  function changeEdit(productId: string, change: TagEdit) {
    setEdits({ ...edits, [productId]: { ...edits[productId], ...change } });
  }

  function toggleUsed(productId: string) {
    setUsedIds(usedIds.includes(productId) ? usedIds.filter((id) => id !== productId) : [...usedIds, productId]);
  }

  // ---- 보여 줄 값 계산 ----

  const isBoardStage = mode === "products" && !productResult;
  const render: RenderResult | null = mode === "image" ? (findRender(`r-${listing.id}-${useType}`) ?? null) : productResult;

  // 캔버스에는 모든 태그를 그리고, 견적에는 "견적에서 뺀" 상품을 제외한다.
  const displayTags = render
    ? render.tags.map((tag) => ({ ...tag, qty: edits[tag.productId]?.qty ?? tag.qty }))
    : [];
  const quoteRender: RenderResult | null = render
    ? { ...render, tags: displayTags.filter((tag) => !edits[tag.productId]?.excluded) }
    : null;

  const quote = quoteRender ? buildQuote(quoteRender, usedIds) : null;
  const baseTotal = quoteRender ? buildQuote(quoteRender, []).total : 0;

  const activeTag = displayTags.find((tag) => tag.n === activeTagN);
  const activeProduct = activeTag ? findProduct(activeTag.productId) : undefined;

  const usableUsedIds = quoteRender
    ? quoteRender.tags.map((tag) => tag.productId).filter((id) => findProduct(id)?.usedPrice !== undefined)
    : [];
  const allUsed = usableUsedIds.length > 0 && usableUsedIds.every((id) => usedIds.includes(id));

  function setAllUsed(all: boolean) {
    const others = usedIds.filter((id) => !usableUsedIds.includes(id));
    setUsedIds(all ? [...others, ...usableUsedIds] : others);
  }

  const usedInThisRender = usedIds.filter((id) => quoteRender?.tags.some((tag) => tag.productId === id));
  const confirmHref = quoteRender
    ? `/quote/${quoteRender.id}${usedInThisRender.length > 0 ? `?used=${usedInThisRender.join(",")}` : ""}`
    : "/quote";

  // 캔버스 위 글자
  const productCount = displayTags.reduce((sum, tag) => sum + tag.qty, 0);
  const warnCount = render ? render.checks.filter((text) => text.startsWith("확인 필요")).length : 0;
  const isCandidate = listing.terms === "inquiry"; // 공실 후보 공간. 실측과 사진이 없다.
  const measuredBadge = `${formatArea(listing.areaM2)} · 천장고 ${listing.ceilingHeightM}m · ${isCandidate ? "건축물대장 기준" : "실측 기준"}`;

  let imageUrl = `/images/render-${useType}.jpg`;
  let leftBadge = `AI 렌더링 · 판매 상품 ${productCount}개`;
  let rightBadge = render ? `${render.checks.slice(0, 2).join(" · ")} · 치수 검증 완료` : measuredBadge;
  const generatedUrl = mode === "image" ? generatedRenderUrl(listing.thumbnail, useType, styleKey) : null; // 이 공간 사진으로 만든 렌더링
  const showTags = !showEmpty && !isBoardStage && !generatedUrl; // 만든 이미지에는 번호 태그 위치가 맞지 않아 숨긴다.
  if (generatedUrl) imageUrl = generatedUrl;
  if (mode === "products") {
    leftBadge = `AI 렌더링 · 상품 먼저 · 상품 ${productCount}개`;
    rightBadge = warnCount > 0 ? `치수 확인 필요 ${warnCount}건` : "치수 검증 완료";
  }
  if (showEmpty || isBoardStage) {
    imageUrl = isCandidate ? listing.thumbnail : "/images/empty-space.jpg";
    rightBadge = measuredBadge;
    if (isCandidate && showEmpty) leftBadge = "예시 이미지";
    if (isBoardStage) leftBadge = "AI 렌더링 · 상품 먼저";
  }

  const currentFilter = RENDER_STYLES.find((style) => style.key === styleKey)?.filter;
  const imageFilter = showEmpty || isBoardStage || generatedUrl ? "none" : currentFilter;

  let loading: { label: string; progress?: number } | undefined;
  if (boardProgress !== null) loading = { label: "선택한 상품으로 렌더링 중", progress: boardProgress };
  else if (loadingLabel) loading = { label: loadingLabel };

  // ---- 화면 ----

  const canvas = (
    <RenderCanvas
      imageUrl={imageUrl}
      imageFilter={imageFilter}
      tags={showTags ? displayTags : []}
      activeTagN={activeTagN}
      onTagClick={(n) => setActiveTagN(n === activeTagN ? null : n)}
      onBackgroundClick={() => setActiveTagN(null)}
      leftBadge={leftBadge}
      rightBadge={rightBadge}
      rightBadgeWarn={mode === "products" && !showEmpty && !isBoardStage && warnCount > 0}
      loading={loading}
      checks={mode === "products" && productResult && showTags ? productResult.checks : undefined}
      onBackToBoard={backToBoard}
    >
      {showTags && activeTag && activeProduct && (
        <TagPopover
          tag={activeTag}
          product={activeProduct}
          qty={activeTag.qty}
          isUsed={usedIds.includes(activeProduct.id)}
          isIncluded={!edits[activeProduct.id]?.excluded}
          onClose={() => setActiveTagN(null)}
          onChangeQty={(qty) => changeEdit(activeProduct.id, { qty })}
          onToggleUsed={() => toggleUsed(activeProduct.id)}
          onToggleIncluded={() => changeEdit(activeProduct.id, { excluded: !edits[activeProduct.id]?.excluded })}
        />
      )}
      {!isBoardStage && (
        <StyleBar
          imageUrl={`/images/render-${useType}.jpg`}
          styleImageUrl={(key) => (mode === "image" ? generatedRenderUrl(listing.thumbnail, useType, key) : null)}
          styleKey={styleKey}
          emptyActive={showEmpty}
          onSelectEmpty={() => selectView("empty")}
          onSelectStyle={selectStyle}
          textHref={`/space/${listing.id}/studio/chat?use=${useType}`}
        />
      )}
    </RenderCanvas>
  );

  let panel;
  if (isBoardStage) {
    panel = <BoardPanel onRender={startBoardRender} progress={boardProgress} />;
  } else if (quoteRender && quote) {
    panel = (
      <QuotePanel
        title={showEmpty ? "빈 공간" : `${USE_LABELS[useType]} 창업 견적`}
        listingId={listing.id}
        render={quoteRender}
        quote={quote}
        baseTotal={baseTotal}
        activeTagN={activeTagN}
        allUsed={allUsed}
        onSelectTag={(n) => {
          setShowEmpty(false);
          setActiveTagN(n);
        }}
        onSetAllUsed={setAllUsed}
        confirmHref={confirmHref}
        disabled={showEmpty}
      />
    );
  }

  return (
    <StudioShell
      subHeader={
        <StudioSubHeader
          listing={listing}
          active={showEmpty ? "empty" : useType}
          onSelect={selectView}
          right={<ModeSwitch mode={mode} onChange={changeMode} />}
        />
      }
      canvas={canvas}
      panel={panel}
    />
  );
}
