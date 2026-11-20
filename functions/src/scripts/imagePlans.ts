// 미리 만든 렌더링 이미지에서 가구와 구조물 위치를 읽어 도면으로 옮긴 값을 frontend/src/lib/imagePlans.ts로 쓴다.
// 위치는 이미지를 눈으로 보고 어림한 값(mm)이다. 간격과 법령 항목은 배치 계산과 같은 함수로 다시 잰다.
//   npm run build && node lib/scripts/imagePlans.js
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { entryZone } from "../pipeline/knowledge";
import { legalNotes } from "../pipeline/legal";
import { measureClearances } from "../http/plan";
import type { PlacedItem } from "../pipeline/layout";
import type { Room } from "../types";

type Structure = { kind: "column" | "stairs" | "window" | "door" | "ring"; label: string; x: number; y: number; widthMm: number; depthMm: number };

function roomFromArea(areaM2: number, ceilingM: number): Room {
  const depthM = Math.sqrt(areaM2 * 1.4);
  return { widthMm: Math.round((areaM2 / depthM) * 1000), depthMm: Math.round(depthM * 1000), ceilingMm: Math.round(ceilingM * 1000) };
}

const base = { chairProductId: null };

// ---- 이미지 좌표(픽셀)를 도면 좌표(mm)로 바꾼다 ----
// 이미지 속 선(벽, 천장 보, 바닥 줄눈)에서 소실점 두 개를 구해 카메라를 세운다.
//   vp1: 깊이 방향 소실점, vp2: 가로 방향 소실점, f: 두 소실점이 직교한다는 조건에서 나온 초점거리.
// 바닥의 점 (u, v)는 카메라에서 나온 광선이 바닥(카메라 아래 h)과 만나는 점이다.
// 도면 좌표는 안쪽 벽을 y = 0, 왼쪽 벽을 x = 0으로 잡고, 전체를 scale로 줄여 방 면적을 목록의 면적에 맞춘다.
interface Camera { f: number; h: number; cx: number; cy: number; vp1: [number, number]; vp2: [number, number]; backDepth: number; leftLateral: number; scale: number }
const CAM_08: Camera = { f: 1302, h: 1275, cx: 688, cy: 384, vp1: [501.9, 422.5], vp2: [9804.6, 445.2], backDepth: 14362, leftLateral: -1836, scale: 0.879 };

type Vec = [number, number, number];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec): Vec => { const n = Math.hypot(a[0], a[1], a[2]); return [a[0] / n, a[1] / n, a[2] / n]; };

function ground(cam: Camera, u: number, v: number): { x: number; y: number } {
  const ray = (pu: number, pv: number): Vec => [(pu - cam.cx) / cam.f, (pv - cam.cy) / cam.f, 1];
  const d1 = unit(ray(cam.vp1[0], cam.vp1[1]));
  const raw2 = ray(cam.vp2[0], cam.vp2[1]);
  const k = dot(raw2, d1);
  const d2 = unit([raw2[0] - k * d1[0], raw2[1] - k * d1[1], raw2[2] - k * d1[2]]);
  let down = cross(d1, d2);
  if (down[1] < 0) down = [-down[0], -down[1], -down[2]];
  const r = ray(u, v);
  const t = cam.h / dot(r, down);
  const p: Vec = [r[0] * t, r[1] * t, r[2] * t];
  return { x: Math.round((dot(p, d2) - cam.leftLateral) * cam.scale), y: Math.round((cam.backDepth - dot(p, d1)) * cam.scale) };
}

/** 둥근 테이블. (u, v)는 바닥에 닿는 다리 가운데이고, angles는 의자가 있는 방향이다. */
function roundTable(cam: Camera, u: number, v: number, angles: number[], dia = 700): PlacedItem {
  const g = ground(cam, u, v);
  const footprint = dia + 2 * 450;
  return {
    ...base, productId: "table", name: "원형 테이블", category: "table", kind: "table", widthMm: footprint, depthMm: footprint, chairs: angles.length,
    x: g.x - footprint / 2, y: g.y - footprint / 2, round: true, tableDiaMm: dia, chairAngles: angles,
  } as PlacedItem;
}

/** 이미지에서 앞쪽 아래 모서리 두 점(왼쪽, 오른쪽)과 깊이로 직사각형 가구를 만든다. */
function boxFromFront(cam: Camera, name: string, category: string, left: [number, number], right: [number, number], depthMm: number): PlacedItem {
  const a = ground(cam, left[0], left[1]);
  const b = ground(cam, right[0], right[1]);
  const front = Math.round((a.y + b.y) / 2);
  return fixture(name, category, a.x, front - depthMm, b.x - a.x, depthMm);
}

/** 기둥 바닥 가운데 점으로 기둥 자리를 만든다. */
function columnAt(cam: Camera, u: number, v: number, size = 500): Structure {
  const g = ground(cam, u, v);
  return { kind: "column", label: "기둥", x: g.x - size / 2, y: g.y - size / 2, widthMm: size, depthMm: size };
}


function table(name: string, x: number, y: number, width: number, chairs: number): PlacedItem {
  // 의자 자리는 테이블 위아래 450mm씩이다. plan.ts의 계산과 같다.
  return { ...base, productId: "table", name, category: "table", kind: "table", widthMm: width, depthMm: 600 + (chairs > 0 ? 900 : 0), chairs, x, y };
}
function fixture(name: string, category: string, x: number, y: number, widthMm: number, depthMm: number): PlacedItem {
  return { ...base, productId: category, name, category, kind: "fixture", widthMm, depthMm, chairs: 0, x, y };
}
function lamp(x: number, y: number): PlacedItem {
  return { ...base, productId: "lamp", name: "펜던트 조명", category: "lamp", kind: "fixture", widthMm: 300, depthMm: 300, chairs: 0, x, y, hanging: true };
}
function reformer(x: number, y: number): PlacedItem {
  return fixture("필라테스 리포머", "reformer", x, y, 2400, 700);
}

const ROOM_08 = roomFromArea(89.21, 3);
// 소실점으로 읽은 이 공간은 가로 약 10.2m이고, 보이는 바닥 끝에서 입구까지 2m를 더하면 깊이는 약 11.3m이다. 면적을 목록의 89.21㎡에 맞춰 0.879배로 줄여 8970 x 9945mm로 했다.
const ROOM_08_WIDE: Room = { widthMm: 8970, depthMm: 9945, ceilingMm: ROOM_08.ceilingMm };
const ROOM_02 = roomFromArea(89.6, 3);

// 사진 08: 기둥 세 개, 왼쪽 안쪽 벽 쪽 계단. 입구는 아래 벽이다.
const STRUCT_08: Structure[] = [
  { kind: "column", label: "기둥", x: 1100, y: 5000, widthMm: 400, depthMm: 400 },
  { kind: "column", label: "기둥", x: 4200, y: 8000, widthMm: 400, depthMm: 400 },
  { kind: "column", label: "기둥", x: 7300, y: 5600, widthMm: 400, depthMm: 400 },
  { kind: "stairs", label: "계단", x: 250, y: 1100, widthMm: 1300, depthMm: 2600 },
];

// 사진 02: 왼쪽 벽 전체가 창이고, 안쪽 벽 오른쪽에 문, 천장 가운데에 원형 구조물이 있다.
const STRUCT_02: Structure[] = [
  { kind: "window", label: "창", x: 0, y: 1200, widthMm: 200, depthMm: 8200 },
  { kind: "door", label: "문", x: 6300, y: 0, widthMm: 900, depthMm: 200 },
  { kind: "ring", label: "천장 구조물", x: 3300, y: 3300, widthMm: 2800, depthMm: 2800 },
];

const STRUCT_08_CAFE: Structure[] = [
  columnAt(CAM_08, 433, 603),
  columnAt(CAM_08, 872, 735),
  columnAt(CAM_08, 1190, 642),
  { kind: "stairs", label: "계단", x: 100, y: 0, widthMm: 900, depthMm: 1100 },
];

const cafe08: PlacedItem[] = [
  boxFromFront(CAM_08, "바 카운터", "counter", [470, 558], [722, 555], 600),
  boxFromFront(CAM_08, "디저트 쇼케이스", "fixture", [722, 548], [808, 545], 600),
  // 카운터 앞에 붙어 보이는 안쪽 테이블 한 개(640, 555)는 카운터와 겹쳐서 뺐다.
  roundTable(CAM_08, 645, 705, [180, 0, 270]),
  roundTable(CAM_08, 655, 589, [180, 0]),
  roundTable(CAM_08, 1090, 690, [180, 0, 270]),
  roundTable(CAM_08, 985, 610, [180, 0]),
  roundTable(CAM_08, 1015, 541, [180, 0]),
  roundTable(CAM_08, 1290, 590, [180, 270]),
  lamp(2300, 1100),
  lamp(3000, 1100),
  lamp(3700, 1100),
  lamp(4400, 1100),
  lamp(7200, 1500),
  lamp(8600, 3300),
];

const popup08: PlacedItem[] = [
  fixture("계산대", "counter", 700, 7300, 800, 2200),
  fixture("벽 선반", "shelf", 2300, 300, 1500, 400),
  fixture("벽 선반", "shelf", 4000, 300, 1500, 400),
  fixture("벽 선반", "shelf", 150, 5200, 400, 1300),
  fixture("벽 선반", "shelf", 6400, 2600, 1200, 400),
  fixture("벽 선반", "shelf", 7500, 4000, 400, 1200),
  fixture("전시 테이블", "table", 2700, 3500, 1200, 700),
  fixture("전시 테이블", "table", 4300, 4200, 1200, 700),
  fixture("전시 테이블", "table", 3100, 5600, 1200, 700),
  fixture("큰 전시 테이블", "table", 5200, 6300, 2000, 900),
];

const pilates08: PlacedItem[] = [
  ...[3000, 4600, 6200, 7800].flatMap((y) => [reformer(1700, y), reformer(4900, y)]),
  fixture("요가 매트 거치대", "fixture", 700, 9900, 1500, 400),
];

const popup02: PlacedItem[] = [
  fixture("계산대", "counter", 700, 6800, 1500, 2600),
  fixture("벽 선반", "shelf", 2800, 300, 1300, 400),
  fixture("벽 선반", "shelf", 4100, 300, 1300, 400),
  fixture("벽 선반", "shelf", 6300, 300, 1300, 400),
  fixture("벽 선반", "shelf", 7500, 3500, 400, 1800),
  fixture("전시 테이블", "table", 3300, 6400, 1500, 800),
  fixture("전시 테이블", "table", 2400, 4700, 1500, 800),
  fixture("전시 테이블", "table", 4300, 3500, 1500, 800),
  fixture("전시 테이블", "table", 5500, 5300, 1500, 800),
  fixture("큰 전시 테이블", "table", 5300, 7500, 1600, 800),
];

const pilates02: PlacedItem[] = [...[2800, 4400, 6000, 7600].flatMap((y) => [reformer(700, y), reformer(4800, y)])];

type Entry = { key: string; room: Room; useType: string; placed: PlacedItem[]; structures: Structure[]; camera?: unknown; pins?: unknown };
const ENTRIES: Entry[] = [
  { key: "08-cafe", room: ROOM_08_WIDE, useType: "cafe", placed: cafe08, structures: STRUCT_08_CAFE },
  { key: "08-popup", room: ROOM_08, useType: "popup", placed: popup08, structures: STRUCT_08 },
  { key: "08-pilates", room: ROOM_08, useType: "pilates", placed: pilates08, structures: STRUCT_08 },
  { key: "02-popup", room: ROOM_02, useType: "popup", placed: popup02, structures: STRUCT_02 },
  { key: "02-pilates", room: ROOM_02, useType: "pilates", placed: pilates02, structures: STRUCT_02 },
];

function overlaps(a: { x: number; y: number; widthMm: number; depthMm: number }, b: { x: number; y: number; widthMm: number; depthMm: number }): boolean {
  return a.x < b.x + b.widthMm && b.x < a.x + a.widthMm && a.y < b.y + b.depthMm && b.y < a.y + a.depthMm;
}


/**
 * 이미지는 가구가 서로 붙거나 겹쳐 보일 수 있다(멀리 있는 물건은 한 픽셀이 40cm이다).
 * 겹친 가구는 입구 쪽(y가 큰 쪽)으로 겹침이 사라질 때까지, 카운터 앞은 1200mm가 될 때까지만 옮긴다.
 * 옮긴 거리는 콘솔에 남긴다.
 */
function relax(label: string, room: Room, placed: PlacedItem[], structures: Structure[]): void {
  const floor = placed.filter((item) => !item.hanging && item.category !== "counter");
  const fixed = [...placed.filter((item) => item.category === "counter"), ...structures.filter((st) => st.kind === "column" || st.kind === "stairs")];
  const counter = placed.find((item) => item.category === "counter");
  const hit = (a: { x: number; y: number; widthMm: number; depthMm: number }, b: { x: number; y: number; widthMm: number; depthMm: number }) =>
    a.x < b.x + b.widthMm && b.x < a.x + a.widthMm && a.y < b.y + b.depthMm && b.y < a.y + a.depthMm;
  const startY = new Map(floor.map((item) => [item, item.y]));
  floor.sort((a, b) => a.y - b.y);
  for (let pass = 0; pass < 200; pass += 1) {
    let moved = false;
    for (const item of floor) {
      if (item.x < 0) item.x = 0;
      if (item.x + item.widthMm > room.widthMm) item.x = room.widthMm - item.widthMm;
      if (counter && item.x < counter.x + counter.widthMm && counter.x < item.x + item.widthMm) {
        const minY = counter.y + counter.depthMm + 1200;
        if (item.y < minY && item.y + item.depthMm > counter.y) { item.y = minY; moved = true; }
      }
      for (const other of [...fixed, ...floor.filter((o) => o !== item && (o.y < item.y || (o.y === item.y && o.x < item.x)))]) {
        const o = other as { x: number; y: number; widthMm: number; depthMm: number };
        if (hit(item, o)) { item.y = o.y + o.depthMm; moved = true; }
      }
    }
    if (!moved) break;
  }
  for (const item of floor) {
    const d = Math.round(item.y - (startY.get(item) ?? item.y));
    if (Math.abs(d) > 50) console.log(`  ${label}: ${item.name} ${Math.round(item.x)},${Math.round(startY.get(item) ?? 0)} -> y ${Math.round(item.y)} (${d > 0 ? "+" : ""}${d}mm)`);
    if (item.y + item.depthMm > room.depthMm) console.warn(`  ${label}: ${item.name} 방 밖으로 나감`);
  }
}

// tools/plans-src/<키>.json이 있으면 그 도면을 쓴다. 사진에서 보정한 카메라로 가이드를 그리고 이미지를 만든 도면이다.
for (const entry of ENTRIES) {
  const file = resolve(__dirname, `../../tools/plans-src/${entry.key}.json`);
  if (!existsSync(file)) continue;
  const source = JSON.parse(readFileSync(file, "utf8"));
  entry.room = source.room;
  entry.placed = source.placed.map((item: PlacedItem) => ({ ...base, ...item }));
  entry.structures = source.structures ?? [];
  entry.camera = source.camera;
  entry.pins = source.pins;
}

const plans: Record<string, unknown> = {};
for (const entry of ENTRIES) {
  if (entry.key === "08-cafe" && process.env.RELAX === "1") relax(entry.key, entry.room, entry.placed, entry.structures);
  const floor = entry.placed.filter((item) => !item.hanging);
  const solid = entry.structures.filter((s) => s.kind === "column" || s.kind === "stairs");
  for (let i = 0; i < floor.length; i += 1) {
    for (let j = i + 1; j < floor.length; j += 1) {
      if (overlaps(floor[i], floor[j])) console.warn(`${entry.key}: 겹침 ${floor[i].name} ${floor[i].x},${floor[i].y} / ${floor[j].name} ${floor[j].x},${floor[j].y}`);
    }
    for (const s of solid) if (overlaps(floor[i], s)) console.warn(`${entry.key}: 구조물과 겹침 ${floor[i].name} ${floor[i].x},${floor[i].y} / ${s.label}`);
    const item = floor[i];
    if (item.x < 0 || item.y < 0 || item.x + item.widthMm > entry.room.widthMm || item.y + item.depthMm > entry.room.depthMm) console.warn(`${entry.key}: 방 밖 ${item.name} ${item.x},${item.y}`);
  }
  const clearances = measureClearances(entry.room, entry.placed);
  for (const c of clearances) console.log(`${entry.key} ${c.id} ${c.valueMm}/${c.requiredMm} ${c.ok ? "ok" : "미달"}`);
  plans[entry.key] = {
    room: entry.room,
    useType: entry.useType,
    placed: entry.placed.map(({ chairProductId, ...rest }) => rest),
    unplaced: [],
    violations: [],
    notes: legalNotes(entry.room, entry.useType),
    entryZone: entryZone(entry.room),
    clearances,
    structures: entry.structures,
    camera: entry.camera,
    pins: entry.pins,
  };
}

const header = [
  "// 미리 만든 렌더링 이미지에서 가구와 구조물 위치를 읽어 도면으로 옮긴 값이다.",
  "// functions/src/scripts/imagePlans.ts가 만든다. 직접 고치지 않는다.",
  "// 키는 \"<사진 번호>-<업종>\"이고 스타일 3종은 같은 구도라서 도면을 함께 쓴다.",
  'import type { PlanResult } from "@/lib/api/functions";',
  "",
].join("\n");
const target = resolve(__dirname, "../../../frontend/src/lib/imagePlans.ts");
writeFileSync(target, `${header}\nexport const IMAGE_PLANS: Record<string, PlanResult> = ${JSON.stringify(plans, null, 2)};\n`);
console.log("wrote", target);
