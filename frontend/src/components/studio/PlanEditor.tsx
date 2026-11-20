"use client";

// 스튜디오 오른쪽 위에 떠 있는 배치 편집기. 평면도에서 가구를 끌어 옮기고, 더하고 빼고 돌리고, 문장으로도 고친다.
// 고칠 때마다 설계 기준을 다시 재서 바로 보여 준다. 견적은 부모가 같은 Scene에서 다시 계산한다.
import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { PlanResult } from "@/lib/api/functions";
import { KINDS_BY_USE, KIND_LABELS, addItem, moveItem, removeItem, rotateItem } from "@/lib/scene";
import { checkScene, entryZone } from "@/lib/sceneCheck";
import { applyText } from "@/lib/sceneText";
import type { Scene } from "@/types/scene";
import LayoutPlan from "./LayoutPlan";
import type { PlanInteraction } from "./LayoutPlan";
import styles from "./PlanEditor.module.css";

type Props = {
  scene: Scene;
  canUndo: boolean;
  /** 고친 Scene을 넘긴다. 부모가 저장하고 되돌리기 목록에 쌓는다. */
  onChange: (next: Scene) => void;
  onUndo: () => void;
  onReset: () => void;
  /** 3D가 열려 있으면 평면도가 3D를 가리지 않게 작은 지도로 시작한다. */
  viewing3D?: boolean;
};

const EXAMPLES = ["테이블 2개 더 놔줘", "의자 하나 빼줘", "카운터를 입구 쪽으로"];

export default function PlanEditor({ scene, canUndo, onChange, onUndo, onReset, viewing3D = false }: Props) {
  const [open, setOpen] = useState(!viewing3D);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Scene | null>(null); // 끄는 동안의 임시 배치
  const [message, setMessage] = useState("");
  const [text, setText] = useState("");

  const svgRef = useRef<SVGSVGElement | null>(null);
  const geometryRef = useRef({ ox: 0, oy: 0, scale: 1 });
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const latest = useRef(scene);
  latest.current = scene;
  const draftRef = useRef<Scene | null>(null);

  // 좁은 화면에서는 처음에 접어 둔다. 3D를 열고 닫을 때도 맞춰서 줄이고 늘린다.
  useEffect(() => {
    setOpen(!viewing3D && !window.matchMedia("(max-width: 768px)").matches);
  }, [viewing3D]);

  const shown = draft ?? scene;
  const check = useMemo(() => checkScene(shown), [shown]);

  const plan: PlanResult = useMemo(
    () => ({
      room: shown.room,
      useType: shown.useType,
      placed: shown.items,
      unplaced: [],
      violations: [],
      notes: [],
      entryZone: entryZone(shown.room),
      clearances: check.clearances,
      structures: shown.structures,
    }),
    [shown, check],
  );

  const selectedItem = shown.items.find((item) => item.id === selectedId) ?? null;
  const badIndexes = useMemo(() => new Set(shown.items.flatMap((item, index) => (check.badIds.has(item.id) ? [index] : []))), [shown, check]);

  /** 화면 좌표를 도면 mm로 바꾼다. */
  function toMm(clientX: number, clientY: number): { x: number; y: number } | null {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return null;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const local = point.matrixTransform(matrix.inverse());
    const { ox, oy, scale } = geometryRef.current;
    return { x: (local.x - ox) / scale, y: (local.y - oy) / scale };
  }

  function startDrag(index: number, event: ReactPointerEvent<SVGGElement>) {
    const item = latest.current.items[index];
    const start = toMm(event.clientX, event.clientY);
    if (!item || !start) return;
    event.stopPropagation();
    setSelectedId(item.id);
    setMessage("");
    dragRef.current = { id: item.id, offsetX: start.x - item.x, offsetY: start.y - item.y };

    const move = (e: PointerEvent) => {
      const drag = dragRef.current;
      const point = toMm(e.clientX, e.clientY);
      if (!drag || !point) return;
      const next = moveItem(latest.current, drag.id, point.x - drag.offsetX, point.y - drag.offsetY);
      draftRef.current = next;
      setDraft(next);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const finished = draftRef.current;
      dragRef.current = null;
      draftRef.current = null;
      setDraft(null);
      if (finished) onChange(finished);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  const interaction: PlanInteraction = {
    selectedIndex: selectedId ? shown.items.findIndex((item) => item.id === selectedId) : null,
    badIndexes,
    onPointerDown: startDrag,
    onBackgroundPointerDown: () => setSelectedId(null),
    svgRef,
    geometryRef,
  };

  function add(kind: Parameters<typeof addItem>[1]) {
    const result = addItem(scene, kind);
    if (!result.ok) {
      setMessage(`${KIND_LABELS[kind]}을(를) 놓을 자리가 없어요. 설계 기준을 지키면서 들어갈 빈자리가 없습니다.`);
      return;
    }
    onChange(result.scene);
    setSelectedId(result.item?.id ?? null);
    setMessage(`${KIND_LABELS[kind]} 1개를 더했어요.`);
  }

  function submitText() {
    const result = applyText(scene, text);
    setMessage(result.message);
    if (result.changed) {
      onChange(result.scene);
      setText("");
    }
  }

  const kinds = KINDS_BY_USE[scene.useType] ?? [];
  const okCount = check.total - check.clearances.filter((c) => !c.ok).length;
  const allOk = check.failed === 0;

  const chip = (
    <span className={allOk ? styles.chipOk : styles.chipBad}>{allOk ? `기준 충족 ${okCount}/${check.total}` : `기준 미달 ${check.failed}건`}</span>
  );

  // 작은 지도. 누르면 편집 패널로 커진다. 3D에서 가구를 옮기면 이 지도도 같이 바뀐다.
  if (!open) {
    return (
      <button
        type="button"
        className={styles.mini}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        aria-label="배치 편집 크게 보기"
      >
        <span className={styles.miniPlan}>
          <LayoutPlan plan={plan} compact />
        </span>
        <span className={styles.miniFoot}>
          {chip}
          <span className={styles.miniHint}>눌러서 크게</span>
        </span>
      </button>
    );
  }

  return (
    <section className={styles.panel} onClick={(event) => event.stopPropagation()} aria-label="배치 편집">
      <button type="button" className={styles.head} onClick={() => setOpen(false)} aria-expanded>
        <span className={styles.title}>배치 편집</span>
        {chip}
        <span className={styles.toggle}>작게</span>
      </button>

      {open && (
        <div className={styles.body}>
          <div className={styles.plan}>
            <LayoutPlan plan={plan} interactive={interaction} compact />
          </div>

          <ul className={styles.checks}>
            {check.clearances.map((c) => (
              <li key={c.id} className={c.ok ? styles.ok : styles.bad}>
                <span>{c.label}</span>
                <span>
                  {c.valueMm.toLocaleString("ko-KR")} / {c.requiredMm.toLocaleString("ko-KR")}mm
                </span>
              </li>
            ))}
          </ul>
          {check.problems.length > 0 && (
            <ul className={styles.problems}>
              {check.problems.slice(0, 3).map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          )}

          <div className={styles.selection}>
            {selectedItem ? (
              <>
                <span className={styles.selectedName}>{selectedItem.name}</span>
                {!selectedItem.hanging && (
                  <button type="button" className={styles.small} onClick={() => onChange(rotateItem(scene, selectedItem.id))}>
                    돌리기
                  </button>
                )}
                <button
                  type="button"
                  className={styles.small}
                  onClick={() => {
                    onChange(removeItem(scene, selectedItem.id));
                    setSelectedId(null);
                  }}
                >
                  삭제
                </button>
              </>
            ) : (
              <span className={styles.hint}>평면도의 가구를 끌어서 옮기세요.</span>
            )}
          </div>

          <div className={styles.addRow}>
            {kinds.map((kind) => (
              <button key={kind} type="button" className={styles.small} onClick={() => add(kind)}>
                {KIND_LABELS[kind]} 더하기
              </button>
            ))}
          </div>

          <form
            className={styles.textRow}
            onSubmit={(event) => {
              event.preventDefault();
              submitText();
            }}
          >
            <input className={styles.input} value={text} onChange={(event) => setText(event.target.value)} placeholder="예: 테이블 2개 더 놔줘" aria-label="문장으로 고치기" />
            <button type="submit" className={styles.send}>
              적용
            </button>
          </form>
          <div className={styles.examples}>
            {EXAMPLES.map((example) => (
              <button key={example} type="button" className={styles.example} onClick={() => setText(example)}>
                {example}
              </button>
            ))}
          </div>

          {message && (
            <p className={styles.message} role="status">
              {message}
            </p>
          )}

          <div className={styles.footer}>
            <button type="button" className={styles.small} onClick={onUndo} disabled={!canUndo}>
              되돌리기
            </button>
            <button type="button" className={styles.small} onClick={onReset}>
              처음 배치로
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
