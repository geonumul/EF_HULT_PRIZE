// planLayout 응답을 그리는 평면도(SVG). 안쪽 벽이 위, 입구는 아래 벽 가운데다.
// 길이는 mm이고 화면 좌표로 바꿀 때 scale을 곱한다. viewBox 덕분에 화면 폭에 맞게 줄어든다.
import type { MutableRefObject, PointerEvent as ReactPointerEvent, ReactNode, RefObject } from "react";
import type { Clearance, PlacedItem, PlanResult } from "@/lib/api/functions";
import styles from "./LayoutPlan.module.css";

const MAX_DRAW_W = 300; // 방 그림의 최대 가로(viewBox 단위)
const MAX_DRAW_H = 340;
const MIN_VIEW_W = 360;
const DOOR_MM = 900;

const COLORS = {
  table: "#e0c293",
  tableChairs: "#f0b95c",
  chair: "#aab6c4",
  counter: "#b88a5a",
  shelf: "#8fb0d3",
  fixture: "#a7afb9",
};

const LEGEND = [
  { label: "테이블", color: COLORS.table },
  { label: "의자 딸린 테이블", color: COLORS.tableChairs },
  { label: "카운터", color: COLORS.counter },
  { label: "선반", color: COLORS.shelf },
  { label: "기구", color: COLORS.fixture },
];

function colorOf(item: PlacedItem): string {
  if (item.category === "counter") return COLORS.counter;
  if (item.category === "shelf") return COLORS.shelf;
  if (item.kind === "chair") return COLORS.chair;
  if (item.kind === "table") return item.chairs > 0 ? COLORS.tableChairs : COLORS.table;
  return COLORS.fixture;
}

/** 양 끝에 화살표가 있는 치수선 */
function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const length = Math.hypot(x2 - x1, y2 - y1);
  if (length < 1) return null;
  const ux = (x2 - x1) / length;
  const uy = (y2 - y1) / length;
  const head = Math.min(6, length / 3);
  const headPath = (px: number, py: number, dir: number) => {
    const bx = px + ux * head * dir;
    const by = py + uy * head * dir;
    return `M${bx - uy * 3},${by + ux * 3} L${px},${py} L${bx + uy * 3},${by - ux * 3}`;
  };
  return (
    <g fill="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <path d={headPath(x1, y1, 1)} />
      <path d={headPath(x2, y2, -1)} />
    </g>
  );
}

type Line = { x1: number; y1: number; x2: number; y2: number };

/** 간격 하나를 도면 어디에 그릴지(mm). 위치를 알 수 없으면 null */
function clearanceLine(c: Clearance, plan: PlanResult): Line | null {
  const { room, placed, entryZone } = plan;
  const floor = placed.filter((item) => !item.hanging);
  const counter = floor.find((item) => item.category === "counter");
  const others = floor.filter((item) => item.category !== "counter");

  if (c.id === "counter_front" && counter) {
    const x = counter.x + counter.widthMm / 2;
    const y = counter.y + counter.depthMm;
    return { x1: x, y1: y, x2: x, y2: Math.min(room.depthMm, y + c.valueMm) };
  }
  if (c.id === "counter_back" && counter) {
    const x = counter.x + counter.widthMm / 2;
    return { x1: x, y1: Math.max(0, counter.y - c.valueMm), x2: x, y2: counter.y };
  }
  if (c.id === "wall_seat" && others.length > 0) {
    const first = others.reduce((a, b) => (b.x < a.x ? b : a));
    const y = first.y + first.depthMm / 2;
    return { x1: 0, y1: y, x2: Math.min(first.x, c.valueMm), y2: y };
  }
  if (c.id === "aisle") {
    // 위아래로 겹쳐 있으면서 가장 가까운 두 물건 사이
    let best: Line | null = null;
    for (const a of others) {
      for (const b of others) {
        const gap = b.y - (a.y + a.depthMm);
        const overlap = Math.min(a.x + a.widthMm, b.x + b.widthMm) - Math.max(a.x, b.x);
        if (gap > 0 && overlap > 0 && (!best || gap < best.y2 - best.y1)) {
          const x = Math.max(a.x, b.x) + overlap / 2;
          best = { x1: x, y1: a.y + a.depthMm, x2: x, y2: b.y };
        }
      }
    }
    return best;
  }
  if (c.id === "entry") {
    const x = (entryZone.left + entryZone.right) / 2;
    return { x1: x, y1: entryZone.top, x2: x, y2: room.depthMm };
  }
  return null;
}

/** 평면도에서 가구를 끌어 옮길 때 쓰는 값. 편집기(PlanEditor)가 넘긴다. */
export type PlanInteraction = {
  /** plan.placed의 몇 번째 가구가 선택됐는지 */
  selectedIndex: number | null;
  /** 겹치거나 방 밖으로 나가 빨갛게 보일 가구의 번호 */
  badIndexes: Set<number>;
  onPointerDown: (index: number, event: ReactPointerEvent<SVGGElement>) => void;
  onBackgroundPointerDown: () => void;
  /** 360 보기에서 서 있는 자리와 방향(도면 좌표 mm, 방향은 도). 있으면 카메라 표시를 그린다. */
  eye?: { x: number; y: number; yawDeg: number } | null;
  /** 카메라 표시를 끌 때 */
  onEyePointerDown?: (event: ReactPointerEvent<SVGGElement>) => void;
  /** 기둥, 창, 문, 계단을 끌어 옮길 때 */
  onStructurePointerDown?: (index: number, event: ReactPointerEvent<SVGGElement>) => void;
  svgRef: RefObject<SVGSVGElement | null>;
  /** 화면 좌표를 mm로 바꿀 때 쓰는 값. 그릴 때마다 채워진다. */
  geometryRef: MutableRefObject<{ ox: number; oy: number; scale: number }>;
};

export default function LayoutPlan({ plan, interactive, compact }: { plan: PlanResult; interactive?: PlanInteraction; compact?: boolean }) {
  const { room, placed, entryZone, clearances, violations } = plan;
  const scale = Math.min(MAX_DRAW_W / room.widthMm, MAX_DRAW_H / room.depthMm);
  const px = (mm: number) => mm * scale;
  const drawW = px(room.widthMm);
  const drawH = px(room.depthMm);
  const viewW = Math.max(MIN_VIEW_W, drawW + 130);
  const ox = (viewW - drawW) / 2 + 10;
  const oy = 52;
  const wallY = oy + drawH;
  const legendTop = wallY + 52;
  const viewH = compact ? wallY + 26 : legendTop + 62;

  const badIds = new Set(violations.flatMap((v) => v.productIds));
  if (interactive) interactive.geometryRef.current = { ox, oy, scale };

  const doorCenter = ox + drawW / 2;
  const doorHalf = px(DOOR_MM) / 2;
  const doorR = px(DOOR_MM);
  const scaleBar = px(1000);

  return (
    <svg ref={interactive?.svgRef} className={interactive ? `${styles.svg} ${styles.interactive}` : styles.svg} viewBox={`0 0 ${viewW} ${viewH}`} role="img" aria-label={`배치도. 가로 ${room.widthMm}mm, 깊이 ${room.depthMm}mm`}>
      <rect x={ox} y={oy} width={drawW} height={drawH} className={styles.floor} onPointerDown={interactive?.onBackgroundPointerDown} />

      {/* 입구 앞 비움 구역 */}
      <rect
        x={ox + px(entryZone.left)}
        y={oy + px(entryZone.top)}
        width={px(entryZone.right - entryZone.left)}
        height={px(room.depthMm - entryZone.top)}
        className={styles.entryZone}
      />

      {/* 이미지의 시야. 카메라에서 시야 양 끝으로 뻗은 부채꼴을 방 안쪽만 칠한다. */}
      {plan.camera && (
        <g>
          <clipPath id="plan-room-clip">
            <rect x={ox} y={oy} width={drawW} height={drawH} />
          </clipPath>
          <path
            clipPath="url(#plan-room-clip)"
            d={`M${ox + px(plan.camera.x)},${oy + px(plan.camera.y)} L${ox + px(plan.camera.x + plan.camera.left[0] * 30000)},${oy + px(plan.camera.y + plan.camera.left[1] * 30000)} L${ox + px(plan.camera.x + plan.camera.right[0] * 30000)},${oy + px(plan.camera.y + plan.camera.right[1] * 30000)} Z`}
            className={styles.viewCone}
          />
          <text x={ox + drawW} y={wallY + 14} className={styles.muted} textAnchor="end">
            파란 부채꼴은 이미지에 보이는 범위
          </text>
        </g>
      )}

      {/* 사진에서 읽은 구조물 */}
      {(plan.structures ?? []).map((s, index) => {
        const x = ox + px(s.x);
        const y = oy + px(s.y);
        const w = px(s.widthMm);
        const h = px(s.depthMm);
        if (s.kind === "ring") {
          return (
            <g key={`s${index}`}>
              <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} className={styles.ring} />
              <text x={x + w / 2} y={y + h / 2 + 3} className={styles.structText} textAnchor="middle">
                {s.label}
              </text>
            </g>
          );
        }
        const stairSteps = s.kind === "stairs" ? Array.from({ length: 7 }, (_, i) => y + ((i + 1) * h) / 8) : [];
        const moveStructure = interactive?.onStructurePointerDown;
        return (
          <g key={`s${index}`} onPointerDown={moveStructure ? (event) => moveStructure(index, event) : undefined} className={moveStructure ? styles.draggable : undefined}>
            <rect x={x} y={y} width={w} height={h} className={s.kind === "column" ? styles.column : s.kind === "stairs" ? styles.stairs : styles.opening} />
            {stairSteps.map((sy) => (
              <line key={sy} x1={x} y1={sy} x2={x + w} y2={sy} className={styles.step} />
            ))}
            {s.kind !== "column" && (
              <text x={x + w / 2} y={y + h / 2 + 3} className={styles.structText} textAnchor="middle" transform={s.kind === "window" ? `rotate(-90 ${x + w / 2} ${y + h / 2})` : undefined}>
                {s.label}
              </text>
            )}
          </g>
        );
      })}

      {/* 360 보기의 시점. 끌면 그 자리에서 360으로 본다. */}
      {interactive?.eye && (
        <g
          transform={`translate(${ox + px(interactive.eye.x)} ${oy + px(interactive.eye.y)}) rotate(${interactive.eye.yawDeg})`}
          onPointerDown={interactive.onEyePointerDown}
          className={styles.draggable}
          aria-label="360 시점"
        >
          <path d="M0 0 L-24 -34 A42 42 0 0 1 24 -34 Z" fill="rgba(49,130,246,0.22)" />
          <circle r={8} fill="#3182f6" stroke="#fff" strokeWidth={2} />
          <circle r={14} fill="transparent" />
        </g>
      )}

      {/* 물건 */}
      {placed.map((item, index) => {
        const x = ox + px(item.x);
        const y = oy + px(item.y);
        const w = px(item.widthMm);
        const h = px(item.depthMm);
        const bad = interactive ? interactive.badIndexes.has(index) : badIds.has(item.productId);
        let node: ReactNode;
        if (item.hanging) {
          node = <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} className={bad ? `${styles.lamp} ${styles.bad}` : styles.lamp} />;
        } else if (item.round && item.tableDiaMm) {
          // 둥근 테이블: 원 하나와 지정한 방향의 의자들
          const cx = x + w / 2;
          const cy = y + h / 2;
          const tableR = px(item.tableDiaMm) / 2;
          const seat = px(380);
          node = (
            <g>
              {(item.chairAngles ?? []).map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const dist = tableR + seat * 0.62;
                return <rect key={deg} x={cx + Math.cos(rad) * dist - seat / 2} y={cy + Math.sin(rad) * dist - seat / 2} width={seat} height={seat} rx={1.5} fill={COLORS.chair} className={styles.box} transform={`rotate(${deg + 90} ${cx + Math.cos(rad) * dist} ${cy + Math.sin(rad) * dist})`} />;
              })}
              <circle cx={cx} cy={cy} r={tableR} fill={COLORS.tableChairs} className={bad ? `${styles.box} ${styles.bad}` : styles.box} />
            </g>
          );
        } else {
          const chairs = item.kind === "table" ? item.chairs : 0;
          const topChairs = Math.ceil(chairs / 2);
          const chairSize = Math.max(4, Math.min(8, w / 4));
          const chairRow = (count: number, cy: number) =>
            Array.from({ length: count }, (_, i) => (
              <rect key={`${cy}-${i}`} x={x + (w * (i + 1)) / (count + 1) - chairSize / 2} y={cy} width={chairSize} height={chairSize / 1.5} rx={1.5} fill={COLORS.chair} />
            ));
          node = (
            <g>
              <rect x={x} y={y} width={w} height={h} rx={2} fill={colorOf(item)} className={bad ? `${styles.box} ${styles.bad}` : styles.box} />
              {/* 응답의 상자 크기에 의자 자리가 들어 있어서 의자는 상자 안쪽 위아래에 그린다. */}
              {chairRow(topChairs, y + 1)}
              {chairRow(chairs - topChairs, y + h - chairSize / 1.5 - 1)}
            </g>
          );
        }
        if (!interactive) return <g key={index}>{node}</g>;
        const selected = interactive.selectedIndex === index;
        return (
          <g key={index} onPointerDown={(event) => interactive.onPointerDown(index, event)} className={styles.draggable}>
            {node}
            {selected && <rect x={x - 2} y={y - 2} width={w + 4} height={h + 4} className={styles.selected} />}
          </g>
        );
      })}

      {/* 이미지의 번호표와 같은 번호. 조명은 번호가 없다. */}
      {plan.camera &&
        placed
          .filter((item) => !item.hanging)
          .map((item, index) => (
            <g key={`n${index}`}>
              <circle cx={ox + px(item.x + item.widthMm / 2)} cy={oy + px(item.y + item.depthMm / 2)} r={7} className={styles.numBg} />
              <text x={ox + px(item.x + item.widthMm / 2)} y={oy + px(item.y + item.depthMm / 2) + 3} className={styles.numText} textAnchor="middle">
                {index + 1}
              </text>
            </g>
          ))}

      {/* 벽. 아래 벽은 문 자리를 비운다. */}
      <path d={`M${doorCenter + doorHalf},${wallY} L${ox + drawW},${wallY} L${ox + drawW},${oy} L${ox},${oy} L${ox},${wallY} L${doorCenter - doorHalf},${wallY}`} className={styles.wall} fill="none" />
      <path
        d={`M${doorCenter - doorHalf},${wallY} L${doorCenter - doorHalf},${wallY - doorR} A${doorR},${doorR} 0 0 1 ${doorCenter + doorHalf},${wallY}`}
        className={styles.door}
        fill="none"
      />
      <text x={doorCenter} y={wallY + 14} className={styles.label} textAnchor="middle">
        입구
      </text>
      <text x={ox + drawW / 2} y={14} className={styles.muted} textAnchor="middle">
        안쪽 벽
      </text>

      {/* 방 치수선 */}
      <g className={styles.dim}>
        <Arrow x1={ox} y1={oy - 12} x2={ox + drawW} y2={oy - 12} />
        <Arrow x1={ox - 16} y1={oy} x2={ox - 16} y2={wallY} />
      </g>
      <text x={ox + drawW / 2} y={oy - 17} className={styles.dimText} textAnchor="middle">
        가로 {room.widthMm.toLocaleString("ko-KR")}mm
      </text>
      <text x={ox - 21} y={oy + drawH / 2} className={styles.dimText} textAnchor="middle" transform={`rotate(-90 ${ox - 21} ${oy + drawH / 2})`}>
        깊이 {room.depthMm.toLocaleString("ko-KR")}mm
      </text>

      {/* 간격 치수선 */}
      {!compact && clearances.map((c) => {
        const line = clearanceLine(c, plan);
        if (!line) return null;
        const x1 = ox + px(line.x1);
        const y1 = oy + px(line.y1);
        const x2 = ox + px(line.x2);
        const y2 = oy + px(line.y2);
        return (
          <g key={c.id} className={c.ok ? styles.clearOk : styles.clearBad}>
            <Arrow x1={x1} y1={y1} x2={x2} y2={y2} />
            <text x={(x1 + x2) / 2 + 5} y={(y1 + y2) / 2 + 4} className={styles.clearText}>
              {c.label} {c.valueMm.toLocaleString("ko-KR")}
            </text>
          </g>
        );
      })}

      {/* 축척 */}
      {!compact && <g transform={`translate(${ox},${wallY + 30})`}>
        <path d={`M0,0 L${scaleBar},0 M0,-3 L0,3 M${scaleBar},-3 L${scaleBar},3`} className={styles.scaleLine} />
        <text x={scaleBar + 6} y={4} className={styles.muted}>
          1m
        </text>
      </g>}

      {/* 범례 */}
      {!compact && <g transform={`translate(${Math.max(8, ox - 40)},${legendTop})`} className={styles.legend}>
        {LEGEND.map((entry, i) => (
          <g key={entry.label} transform={`translate(${(i % 3) * 112},${Math.floor(i / 3) * 18})`}>
            <rect width={10} height={10} rx={2} fill={entry.color} />
            <text x={14} y={9}>
              {entry.label}
            </text>
          </g>
        ))}
        <g transform="translate(224,18)">
          <circle cx={5} cy={5} r={5} className={styles.lamp} />
          <text x={14} y={9}>
            조명
          </text>
        </g>
        <g transform="translate(0,36)">
          <rect width={10} height={10} rx={2} fill="none" className={styles.bad} />
          <text x={14} y={9}>
            기준 위반
          </text>
        </g>
        <g transform="translate(112,36)">
          <rect width={10} height={10} className={styles.entryZone} />
          <text x={14} y={9}>
            입구 비움
          </text>
        </g>
      </g>}
    </svg>
  );
}
