"use client";

// S03 공간 스튜디오 전체. Figma 24:242 (태그 열림 30:242, 팝업 30:800, 필라테스 30:980, 빈 공간 30:1160).
// 상태는 모두 여기 모아 두고, 그리기는 작은 컴포넌트에 맡긴다.
// 렌더링 방식이 "이미지 먼저"면 mocks/renders.ts의 렌더링을, "상품 먼저"면 렌더링 보드로 만든 결과를 보여 준다.
import { useEffect, useRef, useState } from "react";
import type { Listing, Product, RenderResult, UseType } from "@/types";
import type { RenderStyleKey, StudioMode } from "@/types/studio";
import { buildQuote } from "@/lib/quote";
import { sceneToRender } from "@/lib/scene";
import { useSceneEditor } from "@/lib/useSceneEditor";
import { runFakeProgress } from "@/lib/fakeProgress";
import { buildProductsRender } from "@/lib/productsRender";
import { useRenderBoard } from "@/lib/renderBoard";
import { USE_LABELS, formatArea } from "@/lib/format";
import { findProduct } from "@/mocks/products";
import { findRender } from "@/mocks/renders";
import { RENDER_STYLES } from "@/mocks/studio";
import { generatedRenderUrl } from "@/lib/generatedRenders";
import { IMAGE_PLANS } from "@/lib/imagePlans";
import { generateRender, roomFromArea } from "@/lib/api/functions";
import type { LayoutItem, RenderInput, RenderOutput } from "@/lib/api/functions";
import { drawGuide, guideNumberOf } from "@/lib/guideRender";
import { panoSetOf } from "@/lib/panoViews";
import { addProduct } from "@/lib/scene";
import { base64Of, loadMoodRefs, saveMoodRefs } from "@/lib/moodRefs";
import StudioShell from "./StudioShell";
import StudioSubHeader from "./StudioSubHeader";
import ModeSwitch from "./ModeSwitch";
import RenderCanvas from "./RenderCanvas";
import StyleBar from "./StyleBar";
import TagPopover from "./TagPopover";
import QuotePanel from "./QuotePanel";
import BoardPanel from "./BoardPanel";
import StudioToolbar from "./StudioToolbar";
import type { StudioView as ViewKey } from "./StudioToolbar";
import PlanDialog from "./PlanDialog";
import PlanEditor from "./PlanEditor";
import SceneViewer3D from "./SceneViewer3D";
import type { ViewMode } from "./SceneViewer3D";
import CodeDialog from "./CodeDialog";
import RenderProgress from "./RenderProgress";

type Props = {
  listing: Listing;
  initialUse: UseType;
  initialStyle?: RenderStyleKey;
};

/** 태그 하나에 사용자가 바꾼 내용. 수량과 견적 포함 여부 */
type TagEdit = { qty?: number; excluded?: boolean };

const LOADING_MS = 700;
const BOARD_RENDER_MS = 1500;
const CODE_KEY = "shopportunity-render-code";

const RENDER_ERRORS: Record<number, string> = {
  0: "서버에 연결하지 못했어요. 네트워크를 확인하고 다시 시도해 주세요.",
  400: "렌더링 요청을 처리하지 못했어요. 다른 설정으로 다시 시도해 주세요.",
  429: "오늘 쓸 수 있는 렌더링 횟수를 모두 썼어요. 내일 다시 시도해 주세요.",
  500: "이미지를 만들지 못했어요. 잠시 뒤에 다시 시도해 주세요.",
};

function readSavedCode(): string {
  try {
    return localStorage.getItem(CODE_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveCode(code: string) {
  try {
    if (code) localStorage.setItem(CODE_KEY, code);
    else localStorage.removeItem(CODE_KEY);
  } catch {
    // 저장소를 못 쓰면 매번 입력받는다.
  }
}

export default function StudioView({ listing, initialUse, initialStyle }: Props) {
  const board = useRenderBoard();

  const [useType, setUseType] = useState<UseType>(initialUse);
  const [showEmpty, setShowEmpty] = useState(false);
  const [renderedAt, setRenderedAt] = useState<number | null>(null); // 지금 AI 이미지를 만든 배치의 저장 시각
  const [styleKey, setStyleKey] = useState<RenderStyleKey>(initialStyle ?? "wood");
  const [mode, setMode] = useState<StudioMode>("image");
  const [loadingLabel, setLoadingLabel] = useState("");
  const [activeTagN, setActiveTagN] = useState<number | null>(null);
  const [usedIds, setUsedIds] = useState<string[]>([]);
  const [edits, setEdits] = useState<Record<string, TagEdit>>({});
  const [productResult, setProductResult] = useState<RenderResult | null>(null);
  const [boardProgress, setBoardProgress] = useState<number | null>(null);
  const isMySpace = listing.id.startsWith("my-"); // 사용자가 직접 입력한 공간. 사진이 없어서 배치 편집이 기본이다.
  const [viewer, setViewer] = useState<ViewMode | null>(null); // 3D 둘러보기, 360 보기
  const [moodRefs, setMoodRefs] = useState<string[]>([]); // 분위기 참고 사진
  const [planOpen, setPlanOpen] = useState(false); // 위쪽 도구 줄에서 여는 평면도 편집 창
  const [editing, setEditing] = useState(isMySpace); // 배치 편집. 켜면 평면도에서 고친 배치로 견적이 바로 계산된다.

  // AI로 새로 만든 렌더링. 스타일이나 업종을 바꾸면 버린다.
  const [generated, setGenerated] = useState<RenderOutput | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderNotice, setRenderNotice] = useState("");
  const [dialog, setDialog] = useState<"plan" | "code" | null>(null);
  const sceneEditor = useSceneEditor(listing, useType, editing);
  const [codeMessage, setCodeMessage] = useState("");
  const renderToken = useRef(0); // 값이 바뀌면 진행 중인 요청 결과는 버린다.
  const mounted = useRef(true);

  // 화면을 떠날 때 돌고 있는 타이머와 가짜 진행을 멈춘다.
  const loadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelProgress = useRef<(() => void) | null>(null);
  useEffect(() => setMoodRefs(loadMoodRefs()), []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (loadingTimer.current) clearTimeout(loadingTimer.current);
      if (cancelProgress.current) cancelProgress.current();
    };
  }, []);

  function showLoading(label: string) {
    setLoadingLabel(label);
    if (loadingTimer.current) clearTimeout(loadingTimer.current);
    loadingTimer.current = setTimeout(() => setLoadingLabel(""), LOADING_MS);
  }

  function discardGenerated() {
    renderToken.current += 1;
    setGenerated(null);
    setRenderNotice("");
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
      discardGenerated();
      setProductResult(null); // 보드 결과는 업종마다 다시 만든다.
      resetSelection();
      showLoading("렌더링을 불러오는 중");
    }
  }

  function selectStyle(key: RenderStyleKey) {
    setShowEmpty(false);
    if (key !== styleKey) {
      setStyleKey(key);
      discardGenerated();
      showLoading("스타일을 적용하는 중");
    }
  }

  function changeMode(next: StudioMode) {
    setMode(next);
    discardGenerated();
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
  const baseRender: RenderResult | null = mode === "image" ? (findRender(`r-${listing.id}-${useType}`) ?? null) : productResult;
  // 배치 편집 중이면 도면(Scene)에서 센 수량으로 견적을 만든다. 도면을 고치면 견적이 바로 바뀐다.
  const sceneActive = editing && mode === "image" && !showEmpty && sceneEditor.scene !== null && sceneEditor.scene.useType === useType;
  const render: RenderResult | null = sceneActive && sceneEditor.scene && baseRender ? sceneToRender(sceneEditor.scene, listing.id, baseRender.imageUrl) : baseRender;

  // 캔버스에는 모든 태그를 그리고, 견적에는 "견적에서 뺀" 상품을 제외한다.
  const displayTags = render
    ? render.tags.map((tag) => ({ ...tag, qty: edits[tag.productId]?.qty ?? tag.qty }))
    : [];
  const quoteRender: RenderResult | null = render
    ? { ...render, tags: displayTags.filter((tag) => !edits[tag.productId]?.excluded) }
    : null;

  const quote = quoteRender ? buildQuote(quoteRender, usedIds) : null;
  const baseTotal = quoteRender ? buildQuote(quoteRender, []).total : 0;

  // AI로 만든 이미지가 보이는 중이면 그 태그를 쓴다. 번호는 견적 목록의 번호에 맞춘다.
  const generatedActive = generated !== null && mode === "image" && !showEmpty;
  const generatedTags = generated
    ? generated.tags
        .filter((tag) => findProduct(tag.productId))
        .map((tag) => ({
          ...tag,
          n: displayTags.find((own) => own.productId === tag.productId)?.n ?? tag.n,
          qty: edits[tag.productId]?.qty ?? tag.qty,
        }))
    : [];
  const canvasTags = generatedActive ? generatedTags : displayTags;

  const activeTag = canvasTags.find((tag) => tag.n === activeTagN);
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
  const confirmQuery = [usedInThisRender.length > 0 ? `used=${usedInThisRender.join(",")}` : "", sceneActive ? "scene=1" : ""].filter(Boolean).join("&");
  const confirmHref = quoteRender ? `/quote/${quoteRender.id}${confirmQuery ? `?${confirmQuery}` : ""}` : "/quote";

  // 캔버스 위 글자
  const productCount = canvasTags.reduce((sum, tag) => sum + tag.qty, 0);
  const warnCount = render ? render.checks.filter((text) => text.startsWith("확인 필요")).length : 0;
  const isCandidate = listing.terms === "inquiry"; // 공실 후보 공간. 실측과 사진이 없다.
  const measuredBadge = `${formatArea(listing.areaM2)} · 천장고 ${listing.ceilingHeightM}m · ${isMySpace ? "직접 입력 기준" : isCandidate ? "건축물대장 기준" : "실측 기준"}`;

  let imageUrl = `/images/render-${useType}.jpg`;
  let leftBadge = `AI 렌더링 · 판매 상품 ${productCount}개`;
  let rightBadge = render ? `${render.checks.slice(0, 2).join(" · ")} · 치수 검증 완료` : measuredBadge;
  const generatedUrl = mode === "image" ? generatedRenderUrl(listing.thumbnail, useType, styleKey) : null; // 이 공간 사진으로 만든 렌더링
  const showTags = !showEmpty && !isBoardStage && !sceneActive && (!generatedUrl || generatedActive); // 미리 만든 이미지에는 번호 태그 위치가 맞지 않아 숨긴다.
  if (generatedUrl) imageUrl = generatedUrl;
  if (generatedActive && generated) {
    imageUrl = generated.imageDataUrl;
    rightBadge = measuredBadge; // 미리 만든 렌더링의 치수 검증 문구는 새 이미지에 맞지 않는다.
  }
  if (mode === "products") {
    leftBadge = `AI 렌더링 · 상품 먼저 · 상품 ${productCount}개`;
    rightBadge = warnCount > 0 ? `치수 확인 필요 ${warnCount}건` : "치수 검증 완료";
  }
  if (showEmpty || isBoardStage) {
    imageUrl = isCandidate ? listing.thumbnail : "/images/empty-space.jpg";
    rightBadge = measuredBadge;
    if (isCandidate && showEmpty) leftBadge = "예시 사진 기반";
    if (isBoardStage) leftBadge = "AI 렌더링 · 상품 먼저";
  }

  if (isMySpace) {
    imageUrl = listing.thumbnail;
    leftBadge = "내 공간 · 사진 없음";
    rightBadge = measuredBadge;
  }

  const currentFilter = RENDER_STYLES.find((style) => style.key === styleKey)?.filter;
  const imageFilter = showEmpty || isBoardStage || isMySpace || generatedUrl || generatedActive ? "none" : currentFilter;

  // 근거 표시. 후보 공간이거나 AI로 만든 이미지면 예시 사진 기반이라고 밝힌다.
  const extraBadges: { text: string; tone?: "ok" | "bad" }[] = [];
  if (mode === "image" && !isBoardStage && (generatedActive || (isCandidate && !isMySpace && !showEmpty) || (generatedUrl && !showEmpty))) {
    extraBadges.push({ text: "예시 사진 기반" });
  }
  // 미리 만들어 둔 렌더링도 AI가 만든 예시다.
  if (generatedUrl && !generatedActive && !showEmpty && !isBoardStage) extraBadges.push({ text: "AI 생성 예시이며 실제 공간과 다를 수 있음" });
  if (generatedActive && generated) {
    extraBadges.push({ text: "AI 생성 예시이며 실제 공간과 다를 수 있음" });
    const failed = generated.critique.failed.map((item) => item.note);
    extraBadges.push(
      generated.critique.passed
        ? { text: "기준 검수 통과", tone: "ok" }
        : { text: `기준 검수 미통과${failed.length > 0 ? ` (${failed.slice(0, 3).join(", ")})` : ""}`, tone: "bad" },
    );
  }
  if (renderNotice) extraBadges.push({ text: renderNotice, tone: "bad" });
  const imageMatchesScene = generatedActive && renderedAt !== null && renderedAt === sceneEditor.scene?.updatedAt;
  if (imageMatchesScene) extraBadges.push({ text: "지금 배치로 만든 이미지예요", tone: "ok" });
  else if (sceneActive && sceneEditor.scene?.edited && !isMySpace) extraBadges.push({ text: "배치를 고쳤어요. 'AI로 새로 렌더링'을 누르면 이 배치로 이미지를 다시 만들어요", tone: "bad" });
  if (editing && sceneEditor.status === "failed") extraBadges.push({ text: "배치를 불러오지 못했어요. 잠시 뒤에 다시 시도해 주세요.", tone: "bad" });

  // 배치도와 렌더링 요청에 쓰는 입력. 견적에 들어 있는 상품을 그대로 넘긴다.
  const layoutItems: LayoutItem[] = [];
  for (const tag of quoteRender?.tags ?? []) {
    const product = findProduct(tag.productId);
    if (!product || layoutItems.some((item) => item.productId === product.id)) continue;
    layoutItems.push({
      productId: product.id,
      name: product.name,
      category: product.category,
      widthMm: product.widthMm,
      depthMm: product.depthMm,
      heightMm: product.heightMm,
      qty: tag.qty,
      imagePath: product.imageUrl.startsWith("/images/") ? product.imageUrl : undefined,
    });
  }
  const layoutInput = {
    room: roomFromArea(listing.areaM2, listing.ceilingHeightM),
    useType,
    ...(layoutItems.length > 0 ? { items: layoutItems } : {}),
  };
  const spaceNumber = listing.thumbnail.match(/\/images\/spaces\/space-(\d\d)\.jpg$/)?.[1];

  // 3D 뷰어가 모형 위에 입힐 AI 이미지. 사진 보정값이 있는 공간만 쓴다.
  const viewerPhotoNumber = guideNumberOf(listing.thumbnail);
  const viewerPhotoUrl = generatedActive && generated ? generated.imageDataUrl : generatedUrl;
  const viewerPhoto = viewerPhotoNumber && viewerPhotoUrl ? { url: viewerPhotoUrl, number: viewerPhotoNumber } : null;

  // 보기 전환. 3D와 360을 열면 배치 편집도 같이 켠다(3D, 평면도, 견적이 같은 Scene을 읽는다).
  function changeView(next: ViewKey) {
    if (next === "photo") {
      setViewer(null);
      return;
    }
    setEditing(true);
    setViewer(next);
  }

  function togglePlan() {
    setEditing(true);
    setPlanOpen(!planOpen);
  }

  /** 상품 카탈로그에서 고른 상품을 도면에 놓는다. 견적은 같은 Scene에서 다시 계산된다. */
  function addProductToScene(product: Product): string {
    setEditing(true);
    const scene = sceneEditor.scene;
    if (!scene || scene.useType !== useType) return "배치를 불러오는 중이에요. 잠시 뒤에 다시 눌러 주세요.";
    const result = addProduct(scene, product);
    if (!result.ok) return `${product.name}을(를) 놓을 자리가 없어요. 설계 기준을 지키면서 들어갈 빈자리가 없습니다.`;
    sceneEditor.change(result.scene);
    return `${product.name} 1개를 놓았어요. 견적에 더했어요.`;
  }

  // ---- AI로 새로 렌더링 ----

  async function runRender(code: string) {
    if (!spaceNumber || rendering) return;
    const token = ++renderToken.current;
    setRendering(true);
    setRenderNotice("");
    // 평면도가 열려 있고 사진 보정값이 있으면, 지금 배치를 사진과 같은 원근으로 그려서 그대로 그리게 한다.
    const scene = sceneActive ? sceneEditor.scene : null;
    const guideNumber = scene ? guideNumberOf(listing.thumbnail) : null;
    let guide: RenderInput["guide"];
    if (scene && guideNumber) {
      try {
        const drawing = await drawGuide(scene, guideNumber);
        guide = {
          number: guideNumber,
          imageBase64: drawing.dataUrl.replace(/^data:image\/png;base64,/, ""),
          aspectRatio: drawing.aspectRatio,
          placed: scene.items.map((item) => ({ name: item.name, x: item.x, y: item.y, widthMm: item.widthMm, depthMm: item.depthMm })),
        };
      } catch {
        guide = undefined; // 가이드를 못 그리면 처음 방식으로 만든다.
      }
    }
    const mood = moodRefs.length > 0 ? { images: moodRefs.map(base64Of) } : undefined;
    const result = await generateRender({ ...layoutInput, code, spaceNumber, style: styleKey, ...(guide ? { guide } : {}), ...(mood ? { mood } : {}) });
    if (!mounted.current) return;
    setRendering(false);
    if (token !== renderToken.current) return; // 그 사이 스타일이나 업종이 바뀌었다.
    if (result.ok) {
      saveCode(code);
      setGenerated(result.data);
      setRenderedAt(guide && scene ? scene.updatedAt : null);
      setShowEmpty(false);
      resetSelection();
    } else if (result.status === 401) {
      saveCode("");
      setCodeMessage("접근 코드가 맞지 않아요. 다시 입력해 주세요.");
      setDialog("code");
    } else {
      setRenderNotice(RENDER_ERRORS[result.status] ?? RENDER_ERRORS[500]);
    }
  }

  function startRender() {
    const code = readSavedCode();
    if (code) {
      runRender(code);
    } else {
      setCodeMessage("");
      setDialog("code");
    }
  }

  let loading: { label: string; progress?: number } | undefined;
  if (boardProgress !== null) loading = { label: "선택한 상품으로 렌더링 중", progress: boardProgress };
  else if (editing && sceneEditor.status === "loading") loading = { label: "배치를 불러오는 중" };
  else if (loadingLabel) loading = { label: loadingLabel };

  // ---- 화면 ----

  const dialogs = (
    <>
      {dialog === "plan" && <PlanDialog input={layoutInput} imageUrl={generatedUrl} preset={generatedActive ? generated?.plan : generatedUrl && spaceNumber ? (IMAGE_PLANS[`${spaceNumber}-${useType}`] ?? null) : null} onClose={() => setDialog(null)} />}
      {dialog === "code" && (
        <CodeDialog
          message={codeMessage}
          onClose={() => setDialog(null)}
          onSubmit={(code) => {
            setDialog(null);
            runRender(code);
          }}
        />
      )}
    </>
  );


  const canvas = (
    <RenderCanvas
      imageUrl={imageUrl}
      imageFilter={imageFilter}
      tags={showTags ? canvasTags : []}
      activeTagN={activeTagN}
      onTagClick={(n) => setActiveTagN(n === activeTagN ? null : n)}
      onBackgroundClick={() => setActiveTagN(null)}
      leftBadge={leftBadge}
      extraBadges={extraBadges}
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
      {rendering && <RenderProgress />}
      {viewer && mode === "image" && !isBoardStage && !showEmpty && sceneEditor.scene && sceneEditor.scene.useType === useType && (
        <SceneViewer3D
          scene={sceneEditor.scene}
          styleKey={styleKey}
          mode={viewer}
          onChange={sceneEditor.change}
          photo={viewerPhoto}
          pano={panoSetOf(viewerPhotoNumber, useType, styleKey, sceneEditor.scene?.room ?? null)}
          sideImageUrl={viewerPhotoUrl ?? imageUrl}
          sideImageStale={sceneEditor.scene.edited === true && !(generatedActive && renderedAt === sceneEditor.scene.updatedAt)}
        />
      )}
      {planOpen && mode === "image" && !isBoardStage && !showEmpty && sceneEditor.scene && sceneEditor.scene.useType === useType && (
        <PlanEditor scene={sceneEditor.scene} canUndo={sceneEditor.canUndo} onChange={sceneEditor.change} onUndo={sceneEditor.undo} onReset={sceneEditor.reset} onClose={() => setPlanOpen(false)} />
      )}

      {dialogs}
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
    panel = <BoardPanel useType={useType} areaM2={listing.areaM2} onRender={startBoardRender} progress={boardProgress} />;
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
      toolbar={
        isBoardStage ? undefined : (
          <StudioToolbar
            view={viewer ?? "photo"}
            onView={changeView}
            scene={sceneEditor.scene && sceneEditor.scene.useType === useType ? sceneEditor.scene : null}
            useType={useType}
            planOpen={planOpen}
            onTogglePlan={togglePlan}
            onOpenSheet={() => setDialog("plan")}
            onAddProduct={addProductToScene}
            canUndo={sceneEditor.canUndo}
            onUndo={sceneEditor.undo}
            onReset={sceneEditor.reset}
            onRender={mode === "image" && spaceNumber ? startRender : undefined}
            rendering={rendering}
            moodRefs={moodRefs}
            onMoodRefs={(next) => {
              setMoodRefs(next);
              saveMoodRefs(next);
            }}
            moodHref="/mood"
            editable={mode === "image" && !showEmpty}
          />
        )
      }
      panel={panel}
    />
  );
}
