"use client";

// 공간 실측. 줄자로 잰 방 크기, 입구 위치, 기둥, 창, 문, 계단의 위치와 크기를 넣으면 평면도, 3D, 견적이 그 값으로 바뀐다.
// 방 크기는 m, 구조물은 cm로 입력한다. 방이 바뀌면 가구는 새 크기 안으로 옮겨진다.
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { PlanStructure } from "@/lib/api/functions";
import { addStructure, applyRoom, removeStructure, setStructure } from "@/lib/scene";
import type { Scene } from "@/types/scene";
import styles from "./SpaceMeasure.module.css";

type Props = {
  scene: Scene;
  onChange: (next: Scene) => void;
};

const ADDABLE: { kind: PlanStructure["kind"]; label: string }[] = [
  { kind: "column", label: "기둥" },
  { kind: "window", label: "창" },
  { kind: "door", label: "문" },
  { kind: "stairs", label: "계단" },
];

const meter = (mm: number) => (mm / 1000).toFixed(2);

export default function SpaceMeasure({ scene, onChange }: Props) {
  const { room } = scene;
  const [width, setWidth] = useState(meter(room.widthMm));
  const [depth, setDepth] = useState(meter(room.depthMm));
  const [ceiling, setCeiling] = useState(meter(room.ceilingMm));
  const [entry, setEntry] = useState(meter(scene.entryX ?? room.widthMm / 2));
  const [message, setMessage] = useState("");

  // 다른 곳(처음으로 되돌리기 등)에서 방이 바뀌면 입력 칸도 맞춘다.
  useEffect(() => {
    setWidth(meter(room.widthMm));
    setDepth(meter(room.depthMm));
    setCeiling(meter(room.ceilingMm));
    setEntry(meter(scene.entryX ?? room.widthMm / 2));
  }, [room.widthMm, room.depthMm, room.ceilingMm, scene.entryX]);

  function submitRoom(event: FormEvent) {
    event.preventDefault();
    const result = applyRoom(scene, { widthMm: Number(width) * 1000, depthMm: Number(depth) * 1000, ceilingMm: Number(ceiling) * 1000, entryX: Number(entry) * 1000 });
    setMessage(result.message);
    if (result.ok) onChange(result.scene);
  }

  /** 입력 칸에서 포커스를 벗어나거나 엔터를 누르면 구조물 값을 적용한다. cm를 mm로 바꾼다. */
  function commit(index: number, field: "x" | "y" | "widthMm" | "depthMm", raw: string) {
    const cm = Number(raw);
    if (!Number.isFinite(cm) || cm < 0) return;
    const mm = Math.round(cm * 10);
    if (mm === scene.structures[index]?.[field]) return;
    onChange(setStructure(scene, index, { [field]: mm }));
  }

  const area = (Number(width) * Number(depth)).toFixed(1);

  return (
    <div className={styles.root}>
      <p className={styles.lead}>줄자로 잰 값을 넣으면 평면도, 3D, 견적이 그 크기로 바뀌어요. 가구는 새 크기 안으로 옮겨져요.</p>

      <form className={styles.section} onSubmit={submitRoom}>
        <h3>방 크기</h3>
        <div className={styles.grid}>
          <label>
            가로(m)
            <input type="number" step="0.01" min="2" max="40" value={width} onChange={(event) => setWidth(event.target.value)} />
          </label>
          <label>
            깊이(m)
            <input type="number" step="0.01" min="2" max="40" value={depth} onChange={(event) => setDepth(event.target.value)} />
          </label>
          <label>
            천장 높이(m)
            <input type="number" step="0.01" min="2" max="8" value={ceiling} onChange={(event) => setCeiling(event.target.value)} />
          </label>
          <label>
            입구 위치(m)
            <input type="number" step="0.01" min="0.6" value={entry} onChange={(event) => setEntry(event.target.value)} />
          </label>
        </div>
        <p className={styles.note}>입구는 아래쪽 벽에 있고, 입구 위치는 왼쪽 벽에서 입구 가운데까지의 거리예요. 면적 약 {area}㎡</p>
        <button type="submit" className={styles.apply}>
          방 크기 적용
        </button>
      </form>

      <section className={styles.section}>
        <h3>기둥, 창, 문, 계단</h3>
        <p className={styles.note}>위치는 왼쪽 위 모서리 기준이에요. x는 왼쪽 벽에서, y는 안쪽 벽에서 잰 거리(cm)예요.</p>
        {scene.structures.length === 0 && <p className={styles.empty}>등록된 구조물이 없어요.</p>}
        <ul className={styles.list}>
          {scene.structures.map((s, index) => (
            <li key={`${s.label}-${index}-${scene.updatedAt}`} className={styles.row}>
              <span className={styles.name}>{s.label}</span>
              {(
                [
                  ["x", "x", s.x],
                  ["y", "y", s.y],
                  ["widthMm", "폭", s.widthMm],
                  ["depthMm", "깊이", s.depthMm],
                ] as const
              ).map(([field, label, value]) => (
                <label key={field} className={styles.cell}>
                  {label}
                  <input
                    type="number"
                    step="1"
                    min="0"
                    defaultValue={Math.round(value / 10)}
                    onBlur={(event) => commit(index, field, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                  />
                </label>
              ))}
              <button type="button" className={styles.remove} onClick={() => onChange(removeStructure(scene, index))} aria-label={`${s.label} 지우기`}>
                삭제
              </button>
            </li>
          ))}
        </ul>
        <div className={styles.addRow}>
          {ADDABLE.map((item) => (
            <button key={item.kind} type="button" className={styles.add} onClick={() => onChange(addStructure(scene, item.kind))}>
              {item.label} 더하기
            </button>
          ))}
        </div>
      </section>

      {message && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}
      <p className={styles.note}>실측값을 고치면 AI 이미지는 원래 공간 기준이라 맞지 않아요. "사진 다시 만들기"를 누르면 이 크기로 새로 만들어요.</p>
    </div>
  );
}
