"use client";

// 캔버스 위쪽 한 줄. 보기 전환(사진, 3D, 360), 평면도, 배치도·설계 점검, 상품 추가, 되돌리기, 다시 렌더링을 모은다.
// 캔버스 안을 가리지 않으려고 버튼을 모두 캔버스 밖으로 뺐다. 평면도는 썸네일이 버튼이고, 누르면 캔버스 위에 편집 창이 열린다.
import { useEffect, useMemo, useState } from "react";
import { formatWon } from "@/lib/format";
import { MAX_MOOD_REFS, fileToMoodRef } from "@/lib/moodRefs";
import { placeableProducts, scenePlanResult } from "@/lib/scene";
import type { Product, UseType } from "@/types";
import type { Scene } from "@/types/scene";
import LayoutPlan from "./LayoutPlan";
import styles from "./StudioToolbar.module.css";

export type StudioView = "photo" | "orbit" | "pano";

type Props = {
  view: StudioView;
  onView: (view: StudioView) => void;
  /** 배치를 불러오기 전에는 null */
  scene: Scene | null;
  useType: UseType;
  planOpen: boolean;
  onTogglePlan: () => void;
  onOpenSheet: () => void;
  /** 상품을 도면에 놓는다. 사용자에게 보여 줄 결과 문장을 돌려준다. */
  onAddProduct: (product: Product) => string;
  canUndo: boolean;
  onUndo: () => void;
  onReset: () => void;
  /** 같은 가구로 다른 배치안을 만든다. */
  onRearrange: () => string;
  /** 없으면 다시 렌더링 버튼을 숨긴다. */
  onRender?: () => void;
  rendering: boolean;
  /** 3D, 360 보기에서 지금 배치로 사방 이미지를 다시 만든다. 없으면 버튼을 숨긴다. */
  onPanoRender?: () => void;
  /** 사방 이미지를 만드는 중이면 끝낸 방향 수(0~4), 아니면 null */
  panoBusy: number | null;
  /** 사진 다시 만들기에 덧붙이는 요청 문장. 예: 조명을 더 따뜻하게 */
  note: string;
  onNote: (note: string) => void;
  /** 분위기 참고 사진(data URL). 사진 다시 만들기가 이 분위기를 따른다. */
  moodRefs: string[];
  onMoodRefs: (next: string[]) => void;
  /** 색으로 스타일을 고르는 화면 */
  moodHref: string;
  /** 3D와 편집을 쓸 수 없는 화면(상품 먼저, 빈 공간 등)이면 false */
  editable: boolean;
};

const VIEWS: { key: StudioView; label: string }[] = [
  { key: "photo", label: "사진" },
  { key: "orbit", label: "3D" },
  { key: "pano", label: "360" },
];

export default function StudioToolbar(props: Props) {
  const { view, scene, useType, planOpen, editable } = props;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [moodOpen, setMoodOpen] = useState(false);
  const [moodError, setMoodError] = useState("");
  const [message, setMessage] = useState("");
  const products = useMemo(() => placeableProducts(useType), [useType]);
  const plan = useMemo(() => (scene ? scenePlanResult(scene) : null), [scene]);
  const bad = plan ? plan.clearances.filter((c) => !c.ok).length : 0;

  async function addMood(files: Iterable<Blob>) {
    setMoodError("");
    try {
      const room = MAX_MOOD_REFS - props.moodRefs.length;
      const picked = [...files].filter((file) => file.type.startsWith("image/")).slice(0, Math.max(0, room));
      if (picked.length === 0) {
        setMoodError(room <= 0 ? `분위기 사진은 최대 ${MAX_MOOD_REFS}장이에요. 하나를 지우고 올려 주세요.` : "이미지 파일만 올릴 수 있어요.");
        return;
      }
      const refs = await Promise.all(picked.map(fileToMoodRef));
      props.onMoodRefs([...props.moodRefs, ...refs].slice(0, MAX_MOOD_REFS));
    } catch (error) {
      setMoodError(error instanceof Error ? error.message : "이미지를 읽지 못했어요.");
    }
  }

  // 알림 문장은 몇 초 뒤에 사라진다.
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 6000);
    return () => clearTimeout(timer);
  }, [message]);

  function add(product: Product) {
    setMessage(props.onAddProduct(product));
  }

  return (
    <div className={styles.bar} onClick={(event) => event.stopPropagation()}>
      {editable && (
        <div className={styles.segment} role="tablist" aria-label="보기 방식">
          {VIEWS.map((item) => (
            <button key={item.key} type="button" role="tab" aria-selected={view === item.key} className={view === item.key ? `${styles.seg} ${styles.segOn}` : styles.seg} onClick={() => props.onView(item.key)}>
              {item.label}
            </button>
          ))}
        </div>
      )}

      {editable && (
        <button type="button" className={planOpen ? `${styles.tool} ${styles.toolOn}` : styles.tool} onClick={props.onTogglePlan} aria-pressed={planOpen}>
          <span className={styles.thumb}>{plan ? <LayoutPlan plan={plan} compact /> : <span className={styles.thumbEmpty} />}</span>
          <span>평면도</span>
          {plan && <span className={bad === 0 ? styles.chipOk : styles.chipBad}>{bad === 0 ? "기준 충족" : `미달 ${bad}`}</span>}
        </button>
      )}

      <button type="button" className={styles.tool} onClick={props.onOpenSheet}>
        배치도·점검
      </button>

      {editable && (
        <div className={styles.pickerWrap}>
          <button type="button" className={pickerOpen ? `${styles.tool} ${styles.toolOn}` : styles.tool} onClick={() => setPickerOpen(!pickerOpen)} aria-expanded={pickerOpen}>
            상품 추가
          </button>
          {pickerOpen && (
            <div className={styles.picker} role="dialog" aria-label="상품 추가">
              <p className={styles.pickerTitle}>도면에 놓을 상품을 고르세요. 견적에 바로 더해져요.</p>
              <ul className={styles.pickerList}>
                {products.map((product) => (
                  <li key={product.id}>
                    <button type="button" className={styles.pickerItem} onClick={() => add(product)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={product.imageUrl} alt="" width={40} height={40} />
                      <span className={styles.pickerText}>
                        <span className={styles.pickerName}>{product.name}</span>
                        <span className={styles.pickerMeta}>
                          W{product.widthMm} × D{product.depthMm} · {formatWon(product.price)}
                        </span>
                      </span>
                      <span className={styles.pickerAdd}>놓기</span>
                    </button>
                  </li>
                ))}
              </ul>
              {message && <p className={styles.pickerMessage}>{message}</p>}
              <button type="button" className={styles.pickerClose} onClick={() => setPickerOpen(false)}>
                닫기
              </button>
            </div>
          )}
        </div>
      )}

      {editable && (
        <>
          <button type="button" className={styles.ghost} onClick={props.onUndo} disabled={!props.canUndo}>
            되돌리기
          </button>
          <button type="button" className={styles.ghost} onClick={() => setMessage(props.onRearrange())} disabled={!scene}>
            다른 배치안
          </button>
          <button type="button" className={styles.ghost} onClick={props.onReset} disabled={!scene}>
            처음으로
          </button>
        </>
      )}

      <div className={styles.pickerWrap}>
        <button type="button" className={moodOpen || props.moodRefs.length > 0 ? `${styles.tool} ${styles.toolOn}` : styles.tool} onClick={() => setMoodOpen(!moodOpen)} aria-expanded={moodOpen}>
          무드·요청{props.moodRefs.length > 0 || props.note ? " ●" : ""}
        </button>
        {moodOpen && (
          <div
            className={styles.picker}
            role="dialog"
            aria-label="무드 이미지"
            onPaste={(event) => {
              const files = [...event.clipboardData.files];
              if (files.length > 0) {
                event.preventDefault();
                void addMood(files);
              }
            }}
          >
            <p className={styles.pickerTitle}>핀터레스트 같은 곳에서 마음에 드는 가게 사진을 저장해 올리거나 붙여넣으세요. "사진 다시 만들기"가 그 분위기(색, 재질, 조명)를 따라요. 방 구조와 가구 위치는 그대로예요.</p>
            <div className={styles.moodRow}>
              {props.moodRefs.map((ref, index) => (
                <figure key={ref.slice(-24) + index} className={styles.moodThumb}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ref} alt="분위기 참고 사진" />
                  <button type="button" aria-label="지우기" onClick={() => props.onMoodRefs(props.moodRefs.filter((_, i) => i !== index))}>
                    ×
                  </button>
                </figure>
              ))}
              {props.moodRefs.length < MAX_MOOD_REFS && (
                <label className={styles.moodAdd}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className={styles.moodFile}
                    onChange={(event) => {
                      void addMood(event.target.files ? [...event.target.files] : []);
                      event.target.value = "";
                    }}
                  />
                  + 사진 올리기
                </label>
              )}
            </div>
            <p className={styles.pickerMeta}>이 창이 열린 상태에서 Ctrl+V로 복사한 이미지를 붙여넣을 수 있어요. 사진은 이 브라우저에만 저장되고, 사진 다시 만들기를 누를 때만 서버로 가요.</p>
            {moodError && <p className={styles.pickerMessage}>{moodError}</p>}
            <label className={styles.noteLabel}>
              <span>사진에 덧붙일 요청 (선택)</span>
              <input value={props.note} maxLength={200} onChange={(event) => props.onNote(event.target.value)} placeholder="예: 조명을 더 따뜻하게, 벽은 흰색으로" />
            </label>
            <p className={styles.pickerMeta}>
              <a href={props.moodHref}>색으로 스타일만 고르기</a>
            </p>
            <button type="button" className={styles.pickerClose} onClick={() => setMoodOpen(false)}>
              닫기
            </button>
          </div>
        )}
      </div>

      <span className={styles.spacer} />

      {message && !pickerOpen && (
        <span className={styles.toast} role="status">
          {message}
        </span>
      )}

      {props.onPanoRender && view !== "photo" && (
        <button type="button" className={styles.tool} onClick={props.onPanoRender} disabled={props.panoBusy !== null}>
          {props.panoBusy !== null ? `360 만드는 중 ${props.panoBusy}/4` : "360 다시 만들기"}
        </button>
      )}

      {props.onRender && (
        <button type="button" className={styles.primary} onClick={props.onRender} disabled={props.rendering}>
          {props.rendering ? "렌더링 중" : "사진 다시 만들기"}
        </button>
      )}
    </div>
  );
}
