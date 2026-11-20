// 고친 배치(Scene)를 공간 사진과 같은 카메라로 투영해서, 가구 자리를 색 상자로 표시한 가이드 그림을 만든다.
// functions/tools/guide_render.py와 같은 계산이다. 바탕은 사진에서 뽑은 건축 선화(public/images/spaces/guide/<번호>-edges.png)다.
// 이 그림을 이미지 생성 모델에 보내면 모델이 상자 자리에 실제 가구를 그린다.
import { GUIDE_CALIB } from "@/lib/guideCalib";
import type { GuideCalib } from "@/lib/guideCalib";
import type { Scene, SceneItem } from "@/types/scene";

type Vec = [number, number, number];
type Rgb = [number, number, number];

const COLORS: Record<string, Rgb> = {
  counter: [150, 90, 40],
  showcase: [50, 140, 210],
  table: [235, 150, 40],
  chair: [40, 170, 120],
  shelf: [80, 100, 210],
  display: [160, 80, 180],
  reformer: [220, 60, 60],
  lamp: [250, 210, 40],
  other: [110, 110, 110],
};
const HEIGHTS: Record<string, number> = { counter: 1000, showcase: 1100, table: 720, chair: 450, shelf: 1800, display: 800, reformer: 450, lamp: 300, other: 800 };

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec): Vec => {
  const n = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / n, a[1] / n, a[2] / n];
};
const scale = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k, a[2] * k];

export class GuideCamera {
  private d1: Vec;
  private d2: Vec;
  private down: Vec;
  private cx: number;
  private cy: number;
  private left = 0;
  private back = 0;

  constructor(private calib: GuideCalib) {
    this.cx = calib.width / 2;
    this.cy = calib.height / 2;
    this.d1 = unit(this.ray(calib.vp1[0], calib.vp1[1]));
    const raw2 = this.ray(calib.vp2[0], calib.vp2[1]);
    const k = dot(raw2, this.d1);
    let d2 = unit([raw2[0] - k * this.d1[0], raw2[1] - k * this.d1[1], raw2[2] - k * this.d1[2]]);
    if (calib.vp2[0] < this.cx) d2 = scale(d2, -1); // 가로 소실점이 왼쪽이면 도면 x가 오른쪽으로 커지게 뒤집는다.
    this.d2 = d2;
    const down = cross(this.d1, this.d2);
    this.down = down[1] > 0 ? down : scale(down, -1);
    const [lateral, depth] = this.ground(calib.anchor.u, calib.anchor.v);
    this.left = lateral - calib.anchor.x;
    this.back = depth + calib.anchor.y;
  }

  private ray(u: number, v: number): Vec {
    return [(u - this.cx) / this.calib.f, (v - this.cy) / this.calib.f, 1];
  }

  private ground(u: number, v: number): [number, number] {
    const r = this.ray(u, v);
    const p = scale(r, this.calib.h / dot(r, this.down));
    return [dot(p, this.d2), dot(p, this.d1)];
  }

  /** 도면 좌표 (x, y)와 바닥에서의 높이 z(mm) -> 사진 픽셀. 카메라 뒤쪽이면 null */
  project(x: number, y: number, z: number): [number, number] | null {
    const lateral = x + this.left;
    const depth = this.back - y;
    const p: Vec = [
      lateral * this.d2[0] + depth * this.d1[0] + (this.calib.h - z) * this.down[0],
      lateral * this.d2[1] + depth * this.d1[1] + (this.calib.h - z) * this.down[1],
      lateral * this.d2[2] + depth * this.d1[2] + (this.calib.h - z) * this.down[2],
    ];
    if (p[2] < 150) return null;
    return [this.cx + (this.calib.f * p[0]) / p[2], this.cy + (this.calib.f * p[1]) / p[2]];
  }
}

const css = (c: Rgb, k = 1) => `rgb(${c.map((v) => Math.max(0, Math.min(255, Math.round(v * k)))).join(",")})`;

function fillPolygon(ctx: CanvasRenderingContext2D, points: [number, number][], fill: string, stroke: string) {
  ctx.beginPath();
  points.forEach(([x, y], index) => (index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawBox(ctx: CanvasRenderingContext2D, cam: GuideCamera, x: number, y: number, z: number, w: number, d: number, h: number, color: Rgb) {
  const base = [[0, 0], [w, 0], [w, d], [0, d]];
  const bottom = base.map(([dx, dy]) => cam.project(x + dx, y + dy, z));
  const top = base.map(([dx, dy]) => cam.project(x + dx, y + dy, z + h));
  if ([...bottom, ...top].some((p) => p === null)) return;
  const b = bottom as [number, number][];
  const t = top as [number, number][];
  const faces: [[number, number][], number][] = [
    [[b[3], b[2], t[2], t[3]], 1.0], // 앞면
    [[b[0], b[3], t[3], t[0]], 0.78], // 왼쪽 면
    [[b[1], b[2], t[2], t[1]], 0.78], // 오른쪽 면
    [[t[0], t[1], t[2], t[3]], 1.2], // 윗면
  ];
  for (const [points, k] of faces) fillPolygon(ctx, points, css(color, k), css(color, 0.55));
}

function convexHull(points: [number, number][]): [number, number][] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length <= 2) return pts;
  const turn = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const p of pts) {
    while (lower.length >= 2 && turn(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: [number, number][] = [];
  for (const p of [...pts].reverse()) {
    while (upper.length >= 2 && turn(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function drawCylinder(ctx: CanvasRenderingContext2D, cam: GuideCamera, cx: number, cy: number, radius: number, height: number, color: Rgb) {
  const steps = 28;
  const ring = (z: number) =>
    Array.from({ length: steps }, (_, i) => cam.project(cx + radius * Math.cos((2 * Math.PI * i) / steps), cy + radius * Math.sin((2 * Math.PI * i) / steps), z));
  const top = ring(height);
  const bottom = ring(height - 60);
  if ([...top, ...bottom].some((p) => p === null)) return;
  fillPolygon(ctx, convexHull([...(top as [number, number][]), ...(bottom as [number, number][])]), css(color, 0.8), css(color, 0.5));
  fillPolygon(ctx, top as [number, number][], css(color, 1.15), css(color, 0.6));
}

function kindOf(item: SceneItem): string {
  if (item.category === "counter") return "counter";
  if (item.round || (item.category === "table" && (item.chairs ?? 0) > 0)) return "table";
  if (item.category === "shelf") return "shelf";
  if (item.category === "reformer") return "reformer";
  if (item.category === "table") return "display";
  if (item.name.includes("쇼케이스")) return "showcase";
  return "other";
}

/** 이 공간 사진으로 가이드를 그릴 수 있는지. 사진 번호별 카메라 보정값이 있어야 한다. */
export function guideNumberOf(thumbnail: string): string | null {
  const number = thumbnail.match(/\/images\/spaces\/space-(\d\d)\.jpg$/)?.[1];
  return number && GUIDE_CALIB[number] ? number : null;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("가이드 바탕 이미지를 읽지 못했어요."));
    image.src = src;
  });
}

export type GuideDrawing = { dataUrl: string; aspectRatio: string };

/** 장면을 가이드 그림(PNG data URL)으로 그린다. */
export async function drawGuide(scene: Scene, number: string): Promise<GuideDrawing> {
  const calib = GUIDE_CALIB[number];
  const edges = await loadImage(`/images/spaces/guide/${number}-edges.png`);
  const canvas = document.createElement("canvas");
  canvas.width = calib.width;
  canvas.height = calib.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("그림을 그릴 수 없어요.");
  ctx.drawImage(edges, 0, 0, calib.width, calib.height);
  const cam = new GuideCamera(calib);

  // 바닥 윤곽
  const floor = [cam.project(0, 0, 0), cam.project(scene.room.widthMm, 0, 0), cam.project(scene.room.widthMm, scene.room.depthMm, 0), cam.project(0, scene.room.depthMm, 0)];
  if (floor.every((p) => p !== null)) {
    ctx.beginPath();
    (floor as [number, number][]).forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.strokeStyle = "rgb(120,120,120)";
    ctx.stroke();
  }

  type Drawable = { depth: number; draw: () => void };
  const drawables: Drawable[] = [];
  for (const item of scene.items) {
    drawables.push({
      depth: item.y + item.depthMm / 2,
      draw: () => {
        if (item.hanging) return drawBox(ctx, cam, item.x, item.y, 1800, item.widthMm, item.depthMm, 350, COLORS.lamp);
        if (item.round && item.tableDiaMm) {
          const cx = item.x + item.widthMm / 2;
          const cy = item.y + item.depthMm / 2;
          const r = item.tableDiaMm / 2;
          for (const deg of item.chairAngles ?? []) {
            const a = (deg * Math.PI) / 180;
            drawBox(ctx, cam, cx + Math.cos(a) * (r + 260) - 200, cy + Math.sin(a) * (r + 260) - 200, 0, 400, 400, 450, COLORS.chair);
          }
          drawBox(ctx, cam, cx - 45, cy - 45, 0, 90, 90, 700, COLORS.table.map((v) => v * 0.7) as Rgb);
          return drawCylinder(ctx, cam, cx, cy, r, 720, COLORS.table);
        }
        const kind = kindOf(item);
        drawBox(ctx, cam, item.x, item.y, 0, item.widthMm, item.depthMm, kind === "shelf" ? 1800 : HEIGHTS[kind] ?? 800, COLORS[kind] ?? COLORS.other);
      },
    });
  }
  for (const s of scene.structures) {
    if (s.kind !== "column") continue;
    drawables.push({ depth: s.y + s.depthMm / 2, draw: () => drawBox(ctx, cam, s.x, s.y, 0, s.widthMm, s.depthMm, 3000, [150, 150, 150]) });
  }
  // 먼 것부터 그린다.
  for (const drawable of drawables.sort((a, b) => a.depth - b.depth)) drawable.draw();

  return { dataUrl: canvas.toDataURL("image/png"), aspectRatio: calib.aspectRatio };
}
