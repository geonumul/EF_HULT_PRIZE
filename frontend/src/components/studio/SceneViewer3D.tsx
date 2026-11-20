"use client";

// 도면(Scene)을 3D로 보여 준다. 두 가지 보기가 있다.
//  - 3D 둘러보기: 공간 바깥에서 돌려 보고, 가구를 끌어서 옮긴다.
//  - 360 보기: 방 안에 서서 사방을 돌려 본다. 더블클릭하면 그 자리로 이동하고, 화살표 키로 걷는다.
// 3D는 Scene만 읽는다. 가구를 옮기면 onChange로 Scene을 고치고, 평면도와 견적이 같은 Scene을 읽어 같이 바뀐다.
// 사진 같은 질감은 AI 렌더링 이미지가 맡고, 여기는 크기와 위치가 정확한 모형이다.
import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DIM, pendantBottomMm } from "@/lib/dimensions";
import { findProduct } from "@/mocks/products";
import { GUIDE_CALIB } from "@/lib/guideCalib";
import { GuideCamera } from "@/lib/guideRender";
import { panoPosition } from "@/lib/panoViews";
import type { PanoSet } from "@/lib/panoViews";
import { moveItem, wallOf } from "@/lib/scene";
import { kstDate, skyColor, sunPosition, sunVector } from "@/lib/sun";
import { fetchNeighbors } from "@/lib/surroundings";
import type { Neighbor } from "@/lib/surroundings";
import { entryZone } from "@/lib/sceneCheck";
import type { RenderStyleKey } from "@/types/studio";
import type { Scene, SceneItem } from "@/types/scene";
import styles from "./SceneViewer3D.module.css";

export type ViewMode = "orbit" | "pano";

type Props = {
  scene: Scene;
  styleKey: RenderStyleKey;
  mode: ViewMode;
  onModeChange?: (mode: ViewMode) => void;
  onChange: (next: Scene) => void;
  onClose?: () => void;
  /** AI가 만든 렌더링 이미지와 그 공간의 사진 번호. 있으면 사진을 찍은 자리에서 이 이미지를 모형 위에 입힌다. */
  photo?: { url: string; number: string } | null;
  /** 방 안 한 자리에서 사방을 찍은 AI 이미지 묶음. 있으면 사진 한 장보다 우선한다. */
  pano?: PanoSet | null;
  /** 360 보기에서 서 있을 자리를 바꾸라는 명령(도면 좌표 mm). nonce가 바뀔 때마다 한 번 옮긴다. */
  eyeCommand?: { x: number; y: number; nonce: number } | null;
  /** 서 있는 자리와 바라보는 방향이 바뀌면 알린다(도면 좌표 mm, 방향은 도). */
  onEye?: (eye: { x: number; y: number; yawDeg: number }) => void;
  /** 부모가 부르면 지금 배치의 3D 모형을 방 안 한 자리에서 네 방향으로 찍어 PNG data URL 네 개를 돌려주는 함수가 여기에 들어간다. */
  captureRef?: MutableRefObject<((position?: [number, number, number]) => string[]) | null>;
  /** 공간의 위치(위도, 경도). 있으면 그 자리의 해 위치로 햇빛을 내고 주변 건물을 세운다. */
  site?: { lat: number; lng: number } | null;
  /** 이미지 속 가구가 지금 배치와 맞지 않으면 true. 정하지 않으면 배치를 고쳤는지로 정한다. */
  overlayStale?: boolean;
};

const EYE_HEIGHT_MM = 1500;
/** 벽 두께와 바닥, 천장 슬래브 두께(mm). 방 안쪽 치수에는 들어가지 않는다. */
const WALL_THICKNESS_MM = 200;
const SLAB_THICKNESS_MM = 250;
/** 창은 바닥에서 900~2400mm, 문은 바닥에서 2100mm까지 벽을 뚫는다. */
const WINDOW_SILL_MM = 900;
const WINDOW_HEAD_MM = 2400;
const DOOR_HEAD_MM = 2100;

type Opening = { from: number; to: number; bottom: number; top: number };
type WallPiece = { from: number; to: number; bottom: number; top: number };

/** 벽(start~end)에서 창과 문 구멍을 뺀 나머지를 직사각형 조각으로 나눈다. */
function wallPieces(start: number, end: number, height: number, openings: Opening[]): WallPiece[] {
  const marks = [...new Set([start, end, ...openings.flatMap((o) => [o.from, o.to])].filter((v) => v >= start && v <= end))].sort((a, b) => a - b);
  const pieces: WallPiece[] = [];
  for (let i = 0; i < marks.length - 1; i += 1) {
    const from = marks[i];
    const to = marks[i + 1];
    if (to - from < 1) continue;
    const mid = (from + to) / 2;
    const cover = openings.filter((o) => o.from <= mid && mid <= o.to);
    if (cover.length === 0) {
      pieces.push({ from, to, bottom: 0, top: height });
      continue;
    }
    const lowTop = Math.min(...cover.map((o) => o.bottom));
    const highBottom = Math.max(...cover.map((o) => o.top));
    if (lowTop > 0) pieces.push({ from, to, bottom: 0, top: lowTop });
    if (highBottom < height) pieces.push({ from, to, bottom: highBottom, top: height });
  }
  return pieces;
}

const PALETTES: Record<RenderStyleKey, { floor: string; wall: string; wood: string; chair: string; counter: string; metal: string }> = {
  wood: { floor: "#cfb38a", wall: "#efe6d8", wood: "#b5835a", chair: "#c99a6b", counter: "#8d5f3c", metal: "#7a7a7a" },
  white: { floor: "#e9e6e0", wall: "#ffffff", wood: "#ead9bf", chair: "#f3f3f3", counter: "#d9c6a5", metal: "#c8c8c8" },
  industrial: { floor: "#6d6d6a", wall: "#8b8b86", wood: "#4a3d36", chair: "#2b2b2b", counter: "#2f2926", metal: "#1f1f1f" },
};

// AI 이미지를 모형 위에 입히는 투영 값. 카메라(projector) 여러 대가 각자 이미지를 보고, 그 카메라에서 보이는 모형 표면에 그대로 얹는다.
// 같은 자리를 여러 카메라가 보면 이미지 가장자리에서 서로 섞는다. 가려진 곳은 깊이를 비교해 원래 색을 둔다.
const MAX_PROJECTORS = 4;
const PROJECTION: Record<string, { value: unknown }> = {
  uProjCount: { value: 0 },
  uProjMatrix: { value: Array.from({ length: MAX_PROJECTORS }, () => new THREE.Matrix4()) },
  uProjCamPos: { value: Array.from({ length: MAX_PROJECTORS }, () => new THREE.Vector3()) },
  uNear: { value: 200 },
  uFar: { value: 60000 },
};
for (let i = 0; i < MAX_PROJECTORS; i += 1) {
  PROJECTION[`uProjMap${i}`] = { value: null };
  PROJECTION[`uDepthMap${i}`] = { value: null };
}

const SAMPLERS = Array.from({ length: MAX_PROJECTORS }, (_, i) => `uniform sampler2D uProjMap${i}; uniform sampler2D uDepthMap${i};`).join("\n");
const SAMPLE_ALL = Array.from(
  { length: MAX_PROJECTORS },
  (_, i) => `if (uProjCount > ${i}) {
  vec4 pc = uProjMatrix[${i}] * vec4(vPW, 1.0);
  if (pc.w > 0.0) {
    vec3 ndc = pc.xyz / pc.w;
    vec2 uv = ndc.xy * 0.5 + 0.5;
    if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) {
      float stored = linDepth(texture2D(uDepthMap${i}, uv).r);
      float mine = linDepth(ndc.z * 0.5 + 0.5);
      float facing = abs(dot(normalize(vPN), normalize(uProjCamPos[${i}] - vPW)));
      if (mine <= stored + 90.0 && facing > 0.06) {
        float w = smoothstep(0.0, 0.4, 1.0 - max(abs(ndc.x), abs(ndc.y)));
        projSum += texture2D(uProjMap${i}, uv).rgb * w;
        projWeight += w;
      }
    }
  }
}`,
).join("\n");

function withProjection(material: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, PROJECTION);
    shader.vertexShader = shader.vertexShader
      .replace("void main() {", "varying vec3 vPW; varying vec3 vPN;\nvoid main() {")
      .replace("#include <project_vertex>", "#include <project_vertex>\n vPW = (modelMatrix * vec4(transformed, 1.0)).xyz; vPN = normalize(mat3(modelMatrix) * objectNormal);");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "void main() {",
        `${SAMPLERS}
uniform mat4 uProjMatrix[${MAX_PROJECTORS}]; uniform vec3 uProjCamPos[${MAX_PROJECTORS}];
uniform int uProjCount; uniform float uNear; uniform float uFar; varying vec3 vPW; varying vec3 vPN;
float linDepth(float d) { float z = d * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
void main() {`,
      )
      .replace(
        "#include <opaque_fragment>",
        `if (uProjCount > 0) {
  vec3 projSum = vec3(0.0); float projWeight = 0.0;
${SAMPLE_ALL}
  if (projWeight > 0.001) outgoingLight = projSum / projWeight;
}
#include <opaque_fragment>`,
      );
  };
  return material;
}

function mat(color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05, ...extra });
  return extra.transparent ? material : withProjection(material);
}

function box(w: number, h: number, d: number, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** 의자 종류(look)에 따른 좌면과 다리 재질 */
function chairMaterials(look: string, palette: (typeof PALETTES)[RenderStyleKey]): { seat: THREE.Material; frame: THREE.Material } {
  if (look === "cushion") return { seat: mat("#8c9c8a"), frame: mat(palette.chair) };
  if (look === "metal") return { seat: mat("#2f3235", { metalness: 0.5, roughness: 0.45 }), frame: mat("#2f3235", { metalness: 0.5, roughness: 0.45 }) };
  if (look === "lounge") return { seat: mat("#b4906b"), frame: mat(palette.metal) };
  return { seat: mat(palette.chair), frame: mat(palette.chair) };
}

/** 가구 하나의 모형. 원점은 바닥 면적의 가운데이고 y는 바닥이다. 상품을 골랐으면 그 상품의 look에 따라 색과 재질이 달라진다. */
function buildItem(item: SceneItem, palette: (typeof PALETTES)[RenderStyleKey], ceilingMm: number): THREE.Group {
  const group = new THREE.Group();
  const look = (item.catalogId ? findProduct(item.catalogId)?.look : undefined) ?? "";
  const wood = look === "metal" ? mat("#6b6f74", { metalness: 0.4, roughness: 0.5 }) : mat(palette.wood);
  const chair = mat(palette.chair);

  if (item.hanging) {
    // 갓 아래가 식탁 상판에서 750 위(건축 치수 사전 p.18)가 되게 매단다.
    const bottom = Math.min(pendantBottomMm(), ceilingMm - 400);
    const drop = ceilingMm - bottom - 220;
    const wire = box(8, drop, 8, mat(palette.metal), 0, ceilingMm - drop, 0);
    let shade: THREE.Mesh;
    if (look === "rattan") {
      shade = new THREE.Mesh(new THREE.SphereGeometry(175, 20, 16), mat("#c49a63", { roughness: 0.95 }));
      shade.position.set(0, bottom + 175, 0);
    } else if (look === "dome") {
      shade = new THREE.Mesh(new THREE.SphereGeometry(160, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat("#232323", { emissive: "#f4d98a", emissiveIntensity: 0.15, side: THREE.DoubleSide, metalness: 0.4 }));
      shade.position.set(0, bottom + 110, 0);
    } else {
      shade = new THREE.Mesh(new THREE.ConeGeometry(190, 220, 24, 1, true), mat("#f4d98a", { emissive: "#f4c84a", emissiveIntensity: 0.6, side: THREE.DoubleSide }));
      shade.position.set(0, bottom + 110, 0);
    }
    group.add(wire, shade);
    return group;
  }

  if (item.round && item.tableDiaMm) {
    const radius = item.tableDiaMm / 2;
    const topMaterial = look === "steel" ? mat("#3a3d40", { metalness: 0.5, roughness: 0.4 }) : look === "marble" ? mat("#e6e2dc", { roughness: 0.3 }) : wood;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, DIM.table.topThicknessMm, 36), topMaterial);
    top.position.y = DIM.table.heightMm - DIM.table.topThicknessMm / 2;
    top.castShadow = true;
    top.receiveShadow = true;
    const legHeight = DIM.table.heightMm - DIM.table.topThicknessMm;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(40, 60, legHeight, 14), mat(palette.metal));
    leg.position.y = legHeight / 2;
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(220, 220, 20, 24), mat(palette.metal));
    foot.position.y = 10;
    group.add(top, leg, foot);
    for (const deg of item.chairAngles ?? []) {
      const rad = (deg * Math.PI) / 180;
      const chairGroup = new THREE.Group();
      const { seatWidthMm: sw, seatDepthMm: sd, seatHeightMm: sh, seatThicknessMm: st, backHeightMm: bh } = DIM.chair;
      const mats = chairMaterials(findProduct(item.chairCatalogId ?? "chair-oak")?.look ?? "wood", palette);
      chairGroup.add(box(sw, st, sd, mats.seat, 0, sh - st, 0));
      chairGroup.add(box(sw, bh - sh, 40, mats.seat, 0, sh, sd / 2 - 20)); // 등받이는 테이블 반대쪽
      for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) chairGroup.add(box(30, sh - st, 30, mats.frame, (lx * (sw - 50)) / 2, 0, (lz * (sd - 50)) / 2));
      const dist = radius + 260;
      chairGroup.position.set(Math.cos(rad) * dist, 0, Math.sin(rad) * dist);
      chairGroup.rotation.y = -rad + Math.PI / 2; // 등받이(+z 쪽)가 바깥을 보게 돌린다.
      group.add(chairGroup);
    }
    return group;
  }

  const w = item.widthMm;
  const d = item.depthMm;
  if (item.category === "chair") {
    // 낱개 의자와 바 스툴. 스툴은 좌면이 카운터 상면보다 250~300 낮다(건축 치수 사전 p.19).
    const stool = item.name.includes("스툴");
    const seat = stool ? DIM.counter.barHeightMm - 300 : DIM.chair.seatHeightMm;
    const sw = Math.min(w, DIM.chair.seatWidthMm);
    const sd = Math.min(d, DIM.chair.seatDepthMm);
    const mats = chairMaterials(look || "wood", palette);
    group.add(box(sw, DIM.chair.seatThicknessMm, sd, mats.seat, 0, seat - DIM.chair.seatThicknessMm, 0));
    if (!stool) group.add(box(sw, DIM.chair.backHeightMm - seat, 40, mats.seat, 0, seat, sd / 2 - 20));
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) group.add(box(30, seat - DIM.chair.seatThicknessMm, 30, mats.frame, (lx * (sw - 50)) / 2, 0, (lz * (sd - 50)) / 2));
    return group;
  }
  if (item.category === "counter") {
    // 바 카운터 1100, 계산대 950 (건축 치수 사전 p.19)
    const height = item.name.includes("계산") ? DIM.counter.cashierHeightMm : DIM.counter.barHeightMm;
    const body = height - DIM.counter.topThicknessMm;
    const concrete = look === "concrete";
    group.add(box(w, body, d, mat(concrete ? "#8a8a86" : palette.counter)));
    group.add(box(w + DIM.counter.topOverhangMm * 2, DIM.counter.topThicknessMm, d + DIM.counter.topOverhangMm * 2, concrete ? mat("#6f6f6b") : wood, 0, body, 0));
  } else if (item.category === "shelf") {
    const top = DIM.shelf.heightMm;
    group.add(box(w, top, 30, wood, 0, 0, -d / 2 + 15));
    for (let level = 0; level <= Math.floor(top / DIM.shelf.levelGapMm) - 1; level += 1) group.add(box(w, 30, d, wood, 0, level * DIM.shelf.levelGapMm, 0));
    group.add(box(w, 30, d, wood, 0, top - 30, 0));
    group.add(box(30, top, d, wood, -w / 2 + 15, 0, 0), box(30, top, d, wood, w / 2 - 15, 0, 0));
  } else if (item.category === "reformer") {
    group.add(box(w, 280, d - 200, wood, 0, 120, 0));
    group.add(box(w * 0.6, 80, d - 200, mat("#222222"), w * 0.1, 400, 0));
    group.add(box(80, 700, d, mat(palette.metal), -w / 2 + 60, 0, 0));
  } else if (item.category === "table") {
    const legHeight = DIM.table.displayHeightMm - DIM.table.topThicknessMm;
    const topMaterial = look === "steel" ? mat("#3a3d40", { metalness: 0.5, roughness: 0.4 }) : look === "marble" ? mat("#e6e2dc", { roughness: 0.3 }) : wood;
    group.add(box(w, DIM.table.topThicknessMm, d, topMaterial, 0, legHeight, 0));
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) group.add(box(50, legHeight, 50, wood, (lx * (w - 100)) / 2, 0, (lz * (d - 100)) / 2));
  } else if (item.name.includes("쇼케이스")) {
    const caseBody = DIM.showcase.heightMm - 400;
    group.add(box(w, caseBody, d, mat(palette.counter)));
    group.add(box(w - 40, 400, d - 40, mat("#cfe8f3", { transparent: true, opacity: 0.45 }), 0, caseBody, 0));
  } else {
    group.add(box(w, item.heightMm ?? 800, d, wood));
  }
  return group;
}

/** 구조물(기둥, 계단, 창, 문, 천장 구조물)의 모형 */
function buildStructure(s: Scene["structures"][number], ceilingMm: number): THREE.Group {
  const group = new THREE.Group();
  const cx = s.x + s.widthMm / 2;
  const cz = s.y + s.depthMm / 2;
  if (s.kind === "column") {
    group.add(box(s.widthMm, ceilingMm, s.depthMm, mat("#9b9b98"), cx, 0, cz));
  } else if (s.kind === "stairs") {
    const steps = 9;
    for (let i = 0; i < steps; i += 1) {
      const depth = s.depthMm / steps;
      group.add(box(s.widthMm, 180 * (i + 1), depth, mat("#c8c4bc"), cx, 0, s.y + depth * i + depth / 2));
    }
  } else if (s.kind === "window") {
    // 창은 방 모형을 만들 때 벽에 구멍을 내고 그린다.
  } else if (s.kind === "door") {
    group.add(box(s.widthMm, 2100, 60, mat("#6b5a4c"), cx, 0, s.y + 30));
  } else if (s.kind === "ring") {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(s.widthMm / 2, 60, 10, 48), mat("#8d8d8a"));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(cx, ceilingMm - 350, cz);
    group.add(ring);
  }
  return group;
}

export default function SceneViewer3D({ scene, styleKey, mode, onChange, photo = null, pano = null, captureRef, overlayStale, eyeCommand = null, onEye, site = null }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [hint, setHint] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [photoOn, setPhotoOn] = useState(true);
  const [hour, setHour] = useState(14); // 해가 드는 모습을 볼 시각(한국 시간)
  const [showNeighbors, setShowNeighbors] = useState(true);
  const [neighbors, setNeighbors] = useState<Neighbor[]>([]);
  const [neighborsState, setNeighborsState] = useState<"idle" | "loading" | "none">("idle");
  const [far, setFar] = useState(false); // 이미지를 찍은 자리에서 멀리 벗어났는지
  const edited = overlayStale ?? scene.edited === true;
  const photoReady = pano !== null || (photo !== null && GUIDE_CALIB[photo.number] !== undefined);

  // 최신 값을 이벤트 처리기에서 읽는다.
  const latest = useRef({ scene, onChange, photo, pano, photoOn, onEye, site, hour, neighbors, showNeighbors });
  latest.current = { scene, onChange, photo, pano, photoOn, onEye, site, hour, neighbors, showNeighbors };
  const api = useRef<{ rebuild: () => void; setMode: (mode: ViewMode) => void; exportPanorama: () => void; moveEye: (x: number, y: number) => void; applySun: () => void; rebuildNeighbors: () => void } | null>(null);

  // 한 번만 만든다: 렌더러, 카메라, 이벤트
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xe9e5dd);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);
    renderer.domElement.className = styles.canvas;

    const threeScene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 100, 400000);
    const content = new THREE.Group();
    threeScene.add(content);

    const hemi = new THREE.HemisphereLight("#ffffff", "#b9a98f", 0.9);
    threeScene.add(hemi);
    const sun = new THREE.DirectionalLight("#fff6e5", 1.0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 15;
    threeScene.add(sun, sun.target);
    const neighborRoot = new THREE.Group(); // 주변 건물과 땅. 방 모형과 따로 두어 가구를 옮길 때마다 다시 만들지 않는다.
    threeScene.add(neighborRoot);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;

    const raycaster = new THREE.Raycaster();
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const itemRoots = new Map<string, THREE.Group>();

    let currentMode: ViewMode = mode;
    let selectedId: string | null = null;
    let drag: { id: string; offsetX: number; offsetZ: number; x: number; y: number } | null = null;
    let yaw = 0;
    let pitch = 0;
    const eye = new THREE.Vector3();

    // ---- AI 이미지 입히기 ----
    // 두 가지가 있다. pano: 방 안 한 자리에서 사방을 찍은 이미지 묶음. photo: 사진을 찍은 카메라 자리에서 이미지 한 장.
    type Projector = { camera: THREE.PerspectiveCamera; url: string; texture: THREE.Texture | null; depth: THREE.WebGLRenderTarget };
    let projectors: Projector[] = [];
    let projectorKey = "";
    let startPose: { position: THREE.Vector3; yaw: number; pitch: number; fov: number } | null = null;
    let capturing = false; // 시점 사진을 찍는 동안에는 AI 이미지를 입히지 않는다.
    let farFromImage = false; // 사방 이미지를 찍은 자리에서 1.5m 넘게 벗어나면 이미지를 끈다(시차 때문에 늘어나 보인다).

    function projectionKind(): "pano" | "photo" | null {
      if (capturing || farFromImage || currentMode !== "pano" || !latest.current.photoOn) return null;
      const { pano: set, photo: current } = latest.current;
      if (set) return "pano";
      return current !== null && GUIDE_CALIB[current.number] !== undefined ? "photo" : null;
    }

    function disposeProjectors() {
      for (const item of projectors) {
        item.depth.dispose();
        item.texture?.dispose();
      }
      projectors = [];
      projectorKey = "";
      PROJECTION.uProjCount.value = 0;
    }

    /** 각 카메라에서 모형을 한 번씩 그려 깊이를 저장한다. 어디가 가려졌는지 알려면 필요하다. */
    function renderDepth() {
      if (projectors.length === 0) return;
      PROJECTION.uProjCount.value = 0;
      for (const item of projectors) {
        renderer.setRenderTarget(item.depth);
        renderer.clear();
        renderer.render(threeScene, item.camera);
      }
      renderer.setRenderTarget(null);
      projectors.forEach((item, index) => {
        PROJECTION[`uProjMap${index}`].value = item.texture;
        PROJECTION[`uDepthMap${index}`].value = item.depth.depthTexture;
        (PROJECTION.uProjMatrix.value as THREE.Matrix4[])[index].multiplyMatrices(item.camera.projectionMatrix, item.camera.matrixWorldInverse);
        (PROJECTION.uProjCamPos.value as THREE.Vector3[])[index].copy(item.camera.position);
      });
      // 이미지가 아직 안 읽힌 카메라가 있으면 켜지 않는다.
      PROJECTION.uProjCount.value = projectors.some((item) => item.texture === null) ? 0 : projectors.length;
    }

    function addProjector(camera: THREE.PerspectiveCamera, url: string, width: number, height: number) {
      camera.updateMatrixWorld(true);
      const depth = new THREE.WebGLRenderTarget(width, height);
      depth.depthTexture = new THREE.DepthTexture(width, height);
      const item: Projector = { camera, url, texture: null, depth };
      projectors.push(item);
      new THREE.TextureLoader().load(url, (texture) => {
        if (!projectors.includes(item)) return;
        texture.colorSpace = THREE.SRGBColorSpace;
        item.texture = texture;
        renderDepth();
      });
    }

    function setupProjectors() {
      const kind = projectionKind();
      const { pano: set, photo: current } = latest.current;
      const key = kind === "pano" && set ? `pano:${set.id}` : kind === "photo" && current ? `photo:${current.url}:${current.number}` : "";
      if (key !== "" && key === projectorKey) {
        renderDepth();
        return;
      }
      disposeProjectors();
      startPose = null;
      if (!kind || !key) return;
      projectorKey = key;
      if (kind === "pano" && set) {
        const [x, y, z] = set.position;
        const vfov = (2 * Math.atan(Math.tan((set.hfovDeg * Math.PI) / 360) / set.aspect) * 180) / Math.PI;
        for (const view of set.views.slice(0, MAX_PROJECTORS)) {
          const camera = new THREE.PerspectiveCamera(vfov, set.aspect, PROJECTION.uNear.value as number, PROJECTION.uFar.value as number);
          const rad = (view.yaw * Math.PI) / 180;
          camera.position.set(x, y, z);
          camera.lookAt(x + Math.sin(rad), y, z - Math.cos(rad));
          addProjector(camera, view.url, 1024, Math.round(1024 / set.aspect));
        }
        startPose = { position: new THREE.Vector3(x, y, z), yaw: 0, pitch: 0, fov: 75 };
      } else if (kind === "photo" && current) {
        const calib = GUIDE_CALIB[current.number];
        const pose = new GuideCamera(calib).pose();
        const camera = new THREE.PerspectiveCamera(pose.vfovDeg, pose.aspect, PROJECTION.uNear.value as number, PROJECTION.uFar.value as number);
        camera.position.set(pose.x, pose.y, pose.z);
        const right = new THREE.Vector3(...pose.right);
        const up = new THREE.Vector3(...pose.imageDown).negate();
        const back = new THREE.Vector3(...pose.forward).negate();
        camera.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, back));
        addProjector(camera, current.url, calib.width, calib.height);
        startPose = {
          position: new THREE.Vector3(pose.x, pose.y, pose.z),
          yaw: Math.atan2(pose.forward[0], -pose.forward[2]),
          pitch: Math.asin(pose.forward[1]),
          fov: pose.vfovDeg,
        };
      }
    }

    function setSelected(id: string | null) {
      selectedId = id;
      const item = latest.current.scene.items.find((other) => other.id === id);
      setSelectedName(item ? item.name : "");
      for (const [key, root] of itemRoots) {
        root.traverse((child) => {
          const material = (child as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
          if (material && "emissive" in material && !material.transparent) material.emissive.set(key === id ? "#3182f6" : "#000000");
        });
      }
    }

    function rebuild() {
      const { scene: current } = latest.current;
      const palette = PALETTES[styleKey];
      const { room } = current;
      // 이전 모형을 지운다.
      for (const child of [...content.children]) {
        content.remove(child);
        child.traverse((node) => {
          const mesh = node as THREE.Mesh;
          mesh.geometry?.dispose();
          const material = mesh.material;
          if (Array.isArray(material)) material.forEach((m) => m.dispose());
          else material?.dispose();
        });
      }
      itemRoots.clear();

      // 바닥, 벽, 천장에는 두께를 준다. 방 안쪽 치수는 그대로이고 바깥쪽으로 두꺼워진다.
      // 안쪽 면은 방의 마감색, 윗면(단면)과 바깥은 콘크리트 색이라 두께가 보인다.
      const T = WALL_THICKNESS_MM;
      const S = SLAB_THICKNESS_MM;
      const inner = mat(palette.wall);
      const cap = mat("#e2ded6");
      const outer = mat("#c4bfb6");
      const slabSide = mat("#b4afa6");
      const solid = (w: number, h: number, d: number, faces: THREE.Material[], x: number, y: number, z: number) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), faces); // 면 순서: +x, -x, +y, -y, +z, -z
        mesh.position.set(x, y + h / 2, z);
        mesh.receiveShadow = true;
        return mesh;
      };
      const spanW = room.widthMm + 2 * T;
      // 바닥 슬래브: 윗면이 바닥이다.
      content.add(solid(spanW, S, room.depthMm + 2 * T, [slabSide, slabSide, mat(palette.floor), slabSide, slabSide, slabSide], room.widthMm / 2, -S, room.depthMm / 2));
      // 창과 문 자리는 벽을 뚫는다. 어느 벽의 어디인지는 창과 문의 위치로 정한다.
      const openingsOn = (wall: "left" | "right" | "back" | "front"): Opening[] =>
        current.structures.flatMap((st) => {
          if ((st.kind !== "window" && st.kind !== "door") || wallOf(room, st) !== wall) return [];
          const along = wall === "left" || wall === "right" ? [st.y, st.y + st.depthMm] : [st.x, st.x + st.widthMm];
          const top = st.kind === "window" ? WINDOW_HEAD_MM : DOOR_HEAD_MM;
          return [{ from: along[0], to: along[1], bottom: st.kind === "window" ? WINDOW_SILL_MM : 0, top: Math.min(top, room.ceilingMm - 100) }];
        });
      const wallMesh = (piece: WallPiece, faces: THREE.Material[], horizontal: boolean, fixed: number) => {
        const length = piece.to - piece.from;
        const mid = (piece.from + piece.to) / 2;
        const height = piece.top - piece.bottom;
        const mesh = horizontal ? solid(length, height, T, faces, mid, piece.bottom, fixed) : solid(T, height, length, faces, fixed, piece.bottom, mid);
        mesh.castShadow = true;
        return mesh;
      };
      for (const piece of wallPieces(-T, room.widthMm + T, room.ceilingMm, openingsOn("back"))) content.add(wallMesh(piece, [outer, outer, cap, outer, inner, outer], true, -T / 2));
      for (const piece of wallPieces(0, room.depthMm, room.ceilingMm, openingsOn("left"))) content.add(wallMesh(piece, [inner, outer, cap, outer, outer, outer], false, -T / 2));
      for (const piece of wallPieces(0, room.depthMm, room.ceilingMm, openingsOn("right"))) content.add(wallMesh(piece, [outer, inner, cap, outer, outer, outer], false, room.widthMm + T / 2));
      if (currentMode === "pano") {
        const withFront = projectionKind() !== "photo"; // 사진 카메라는 방 밖에 있을 수 있어서, 이미지를 입힐 때는 앞쪽 벽을 둔다.
        const ceilingFace = mat("#f4f1ec");
        const ceilingSlab = solid(spanW, S, room.depthMm + 2 * T, [outer, outer, cap, ceilingFace, outer, outer], room.widthMm / 2, room.ceilingMm, room.depthMm / 2);
        ceilingSlab.castShadow = true;
        content.add(ceilingSlab);
        if (withFront) for (const piece of wallPieces(-T, room.widthMm + T, room.ceilingMm, openingsOn("front"))) content.add(wallMesh(piece, [outer, outer, cap, outer, outer, inner], true, room.depthMm + T / 2));
      }

      // 창: 유리와 틀을 벽 구멍에 끼운다. 문은 구멍만 뚫고 문짝은 구조물 모형이 그린다.
      for (const st of current.structures) {
        const wall = st.kind === "window" ? wallOf(room, st) : null;
        if (!wall) continue;
        if (wall === "front" && currentMode !== "pano") continue;
        const horizontal = wall === "back" || wall === "front";
        const from = horizontal ? st.x : st.y;
        const to = horizontal ? st.x + st.widthMm : st.y + st.depthMm;
        const top = Math.min(WINDOW_HEAD_MM, room.ceilingMm - 100);
        const heightMm = top - WINDOW_SILL_MM;
        const fixed = wall === "back" ? -T / 2 : wall === "front" ? room.depthMm + T / 2 : wall === "left" ? -T / 2 : room.widthMm + T / 2;
        const place = (alongMid: number, alongLength: number, yBase: number, thick: number, tall: number, material: THREE.Material) => {
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? alongLength : thick, tall, horizontal ? thick : alongLength), material);
          mesh.position.set(horizontal ? alongMid : fixed, yBase + tall / 2, horizontal ? fixed : alongMid);
          content.add(mesh);
        };
        // AI 이미지를 입힐 때는 창 자리도 이미지의 창밖 풍경이 보이도록 불투명하게 둔다.
        const glass = projectionKind() !== null ? mat("#bfe3f5") : mat("#bfe3f5", { transparent: true, opacity: 0.22 });
        place((from + to) / 2, to - from, WINDOW_SILL_MM, 16, heightMm, glass);
        const frame = mat("#2b2d30");
        place((from + to) / 2, to - from, WINDOW_SILL_MM, 60, 50, frame); // 아래틀
        place((from + to) / 2, to - from, top - 50, 60, 50, frame); // 윗틀
        place(from + 25, 50, WINDOW_SILL_MM, 60, heightMm, frame);
        place(to - 25, 50, WINDOW_SILL_MM, 60, heightMm, frame);
        if (to - from > 1800) place((from + to) / 2, 40, WINDOW_SILL_MM, 60, heightMm, frame); // 가운데 세로틀
      }

      // 입구 앞 비움 자리
      const zone = entryZone(room, current.entryX);
      const entry = new THREE.Mesh(new THREE.PlaneGeometry(zone.right - zone.left, room.depthMm - zone.top), new THREE.MeshBasicMaterial({ color: "#00b368", transparent: true, opacity: 0.18 }));
      entry.rotation.x = -Math.PI / 2;
      entry.position.set((zone.left + zone.right) / 2, 4, (zone.top + room.depthMm) / 2);
      content.add(entry);

      for (const structure of current.structures) content.add(buildStructure(structure, room.ceilingMm));
      for (const item of current.items) {
        const root = buildItem(item, palette, room.ceilingMm);
        root.position.x += item.x + item.widthMm / 2;
        root.position.z += item.y + item.depthMm / 2;
        root.userData.itemId = item.id;
        content.add(root);
        itemRoots.set(item.id, root);
      }
      setSelected(selectedId && itemRoots.has(selectedId) ? selectedId : null);

      applySun();
      renderDepth();
    }

    /** 시각과 공간 위치, 방위로 해를 놓고 하늘 색을 바꾼다. */
    function applySun() {
      const { scene: cur, site: place, hour: h } = latest.current;
      const lat = place?.lat ?? 37.5446;
      const lng = place?.lng ?? 127.0557;
      const position = sunPosition(kstDate(new Date(), h), lat, lng);
      const v = sunVector(position.bearingDeg, position.altitudeDeg, cur.facingDeg ?? 0);
      const { room } = cur;
      const span = Math.max(room.widthMm, room.depthMm);
      const dist = span * 5;
      sun.position.set(room.widthMm / 2 + v.x * dist, Math.max(300, v.y * dist), room.depthMm / 2 + v.z * dist);
      sun.target.position.set(room.widthMm / 2, 0, room.depthMm / 2);
      sun.shadow.camera.left = sun.shadow.camera.bottom = -span * 1.2;
      sun.shadow.camera.right = sun.shadow.camera.top = span * 1.2;
      sun.shadow.camera.near = 100;
      sun.shadow.camera.far = dist * 2.5;
      sun.shadow.camera.updateProjectionMatrix();
      const up = Math.max(0, Math.sin((position.altitudeDeg * Math.PI) / 180));
      sun.intensity = up > 0 ? 0.35 + 1.6 * up : 0;
      sun.castShadow = up > 0.02;
      hemi.intensity = 0.45 + 0.45 * up;
      threeScene.background = new THREE.Color(skyColor(position.altitudeDeg));
    }

    /** 주변 건물과 땅을 다시 세운다. 건물 윤곽(동쪽, 북쪽 m)을 방 좌표로 바꾸고, 방과 겹치는 건물은 뺀다. */
    function rebuildNeighbors() {
      for (const child of [...neighborRoot.children]) {
        neighborRoot.remove(child);
        child.traverse((node) => {
          const mesh = node as THREE.Mesh;
          mesh.geometry?.dispose();
          const material = mesh.material;
          if (Array.isArray(material)) material.forEach((m) => m.dispose());
          else material?.dispose();
        });
      }
      const { scene: cur, neighbors: list, showNeighbors: on } = latest.current;
      const own = cur.buildings ?? [];
      if (!on || (list.length === 0 && own.length === 0)) return;
      const { room } = cur;
      const heading = ((cur.facingDeg ?? 0) * Math.PI) / 180;
      const forward = { e: Math.sin(heading), n: Math.cos(heading) };
      const right = { e: Math.cos(heading), n: -Math.sin(heading) };
      const cx = room.widthMm / 2;
      const cz = room.depthMm / 2;
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(300000, 300000), new THREE.MeshStandardMaterial({ color: "#c9ccc2", roughness: 1 }));
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(cx, -SLAB_THICKNESS_MM - 2, cz);
      ground.receiveShadow = true;
      neighborRoot.add(ground);
      const material = new THREE.MeshStandardMaterial({ color: "#dad6ce", roughness: 0.95 });
      // 직접 넣은 건물
      for (const b of own) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.widthMm, b.heightMm, b.depthMm), material);
        mesh.position.set(b.x + b.widthMm / 2, -SLAB_THICKNESS_MM + b.heightMm / 2, b.y + b.depthMm / 2);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        neighborRoot.add(mesh);
      }
      for (const building of list) {
        const points = building.points.map((p) => ({ x: cx + (p.e * right.e + p.n * right.n) * 1000, z: cz - (p.e * forward.e + p.n * forward.n) * 1000 }));
        const xs = points.map((p) => p.x);
        const zs = points.map((p) => p.z);
        // 방 둘레 1m 안에 걸치는 건물은 방과 겹쳐 보여서 뺀다.
        if (Math.max(...xs) > -1000 && Math.min(...xs) < room.widthMm + 1000 && Math.max(...zs) > -1000 && Math.min(...zs) < room.depthMm + 1000) continue;
        const shape = new THREE.Shape(points.map((p) => new THREE.Vector2(p.x, -p.z)));
        const geometry = new THREE.ExtrudeGeometry(shape, { depth: building.heightM * 1000, bevelEnabled: false });
        geometry.rotateX(-Math.PI / 2);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = -SLAB_THICKNESS_MM;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        neighborRoot.add(mesh);
      }
    }

    function applyMode(next: ViewMode) {
      currentMode = next;
      setSelected(null);
      const { room } = latest.current.scene;
      if (next === "orbit") {
        setupProjectors();
        controls.enabled = true;
        camera.fov = 50;
        camera.position.set(room.widthMm * 0.5, Math.max(room.widthMm, room.depthMm) * 0.9, room.depthMm + Math.max(room.widthMm, room.depthMm) * 0.8);
        controls.target.set(room.widthMm / 2, 600, room.depthMm / 2);
        controls.update();
        setHint("끌면 돌려 보고, 가구를 끌면 옮겨요.");
      } else {
        controls.enabled = false;
        farFromImage = false; // 새로 들어올 때와 이미지 묶음이 바뀔 때는 그 이미지의 자리에서 시작한다.
        setFar(false);
        setupProjectors();
        if (startPose) {
          // 이미지를 만든 자리에서 시작한다. 이 자리에서는 AI 이미지가 그대로 보인다.
          camera.fov = startPose.fov;
          eye.copy(startPose.position);
          yaw = startPose.yaw;
          pitch = startPose.pitch;
          setHint(
            projectionKind() === "pano"
              ? "AI 이미지가 사방에 입혀져 있어요. 끌면 돌려 보고, 걸으면 모형이 보이고 이미지가 어긋나요."
              : "사진을 찍은 자리예요. 끌면 돌려 보고, 이미지가 없는 쪽은 모형으로 보여요. 방향키로 걸으면 이미지가 어긋나요.",
          );
        } else {
          camera.fov = 75;
          eye.set(room.widthMm / 2, EYE_HEIGHT_MM, room.depthMm - 900);
          yaw = 0; // 안쪽 벽(z가 줄어드는 쪽)을 본다.
          pitch = 0;
          setHint("끌면 사방을 돌려 보고, 더블클릭하면 그 자리로 이동해요. 방향키로 걸을 수 있어요.");
        }
      }
      camera.updateProjectionMatrix();
      rebuild();
      if (next === "pano") reportEye();
    }


    /** 지금 서 있는 자리에서 사방을 찍어 2:1 파노라마(정방형도법) PNG로 저장한다. */
    function exportPanorama() {
      const { room } = latest.current.scene;
      const position = currentMode === "pano" ? eye.clone() : new THREE.Vector3(room.widthMm / 2, EYE_HEIGHT_MM, room.depthMm - 900);
      // 저장할 사진에는 천장을 넣는다.
      const cubeTarget = new THREE.WebGLCubeRenderTarget(1024);
      const cubeCamera = new THREE.CubeCamera(100, 80000, cubeTarget);
      cubeCamera.position.copy(position);
      threeScene.add(cubeCamera);
      const hadPano = currentMode === "pano";
      if (!hadPano) {
        currentMode = "pano";
        rebuild();
      }
      cubeCamera.update(renderer, threeScene);
      threeScene.remove(cubeCamera);

      const width = 2048;
      const height = 1024;
      const output = new THREE.WebGLRenderTarget(width, height);
      const material = new THREE.ShaderMaterial({
        uniforms: { tCube: { value: cubeTarget.texture } },
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
        fragmentShader:
          "uniform samplerCube tCube; varying vec2 vUv; const float PI = 3.14159265359;" +
          "void main(){ float lon = (vUv.x - 0.5) * 2.0 * PI; float lat = (vUv.y - 0.5) * PI;" +
          "vec3 dir = vec3(cos(lat) * sin(lon), sin(lat), -cos(lat) * cos(lon));" +
          "vec3 c = textureCube(tCube, dir).rgb; gl_FragColor = vec4(pow(c, vec3(1.0 / 2.2)), 1.0); }",
      });
      const quadScene = new THREE.Scene();
      quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
      const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      renderer.setRenderTarget(output);
      renderer.render(quadScene, quadCamera);
      const pixels = new Uint8Array(width * height * 4);
      renderer.readRenderTargetPixels(output, 0, 0, width, height, pixels);
      renderer.setRenderTarget(null);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (context) {
        const image = context.createImageData(width, height);
        for (let row = 0; row < height; row += 1) {
          // 렌더 타깃은 아래에서 위로 저장되어 있어 뒤집어 옮긴다.
          image.data.set(pixels.subarray((height - 1 - row) * width * 4, (height - row) * width * 4), row * width * 4);
        }
        context.putImageData(image, 0, 0);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.download = `shopportunity-360-${latest.current.scene.useType}.png`;
          link.click();
          setTimeout(() => URL.revokeObjectURL(link.href), 4000);
        }, "image/png");
      }
      output.dispose();
      cubeTarget.dispose();
      material.dispose();
      if (!hadPano) {
        currentMode = "orbit";
        rebuild();
      }
    }

    /**
     * 방 안 한 자리에서 여러 방향으로 모형을 찍어 PNG data URL로 돌려준다. AI에게 방향마다 사진 같은 이미지를 만들게 하는 구조 그림이다.
     * position은 모형 좌표(mm). yaws는 도(0 = 안쪽 벽 방향, 시계 방향).
     */
    function captureViews(position: [number, number, number], yaws: number[], hfovDeg: number, width: number, height: number): string[] {
      capturing = true;
      const before = currentMode;
      currentMode = "pano";
      setupProjectors();
      rebuild();
      const vfov = (2 * Math.atan(Math.tan((hfovDeg * Math.PI) / 360) * (height / width)) * 180) / Math.PI;
      const shot = new THREE.PerspectiveCamera(vfov, width / height, 100, 80000);
      const target = new THREE.WebGLRenderTarget(width, height);
      const out: string[] = [];
      for (const deg of yaws) {
        const rad = (deg * Math.PI) / 180;
        shot.position.set(...position);
        shot.lookAt(position[0] + Math.sin(rad), position[1], position[2] - Math.cos(rad));
        renderer.setRenderTarget(target);
        renderer.render(threeScene, shot);
        const pixels = new Uint8Array(width * height * 4);
        renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) continue;
        const image = context.createImageData(width, height);
        const toSrgb = (c: number) => Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055));
        for (let row = 0; row < height; row += 1) {
          const from = (height - 1 - row) * width * 4;
          for (let col = 0; col < width * 4; col += 4) {
            const to = row * width * 4 + col;
            image.data[to] = toSrgb(pixels[from + col] / 255);
            image.data[to + 1] = toSrgb(pixels[from + col + 1] / 255);
            image.data[to + 2] = toSrgb(pixels[from + col + 2] / 255);
            image.data[to + 3] = 255;
          }
        }
        context.putImageData(image, 0, 0);
        out.push(canvas.toDataURL("image/png"));
      }
      renderer.setRenderTarget(null);
      target.dispose();
      capturing = false;
      applyMode(before);
      return out;
    }

    /** 서 있는 자리와 방향을 부모에게 알린다. 평면도의 카메라 표시가 이 값을 따른다. */
    function reportEye() {
      const set = latest.current.pano;
      const nowFar = !!set && Math.hypot(eye.x - set.position[0], eye.z - set.position[2]) > 1500;
      if (nowFar !== farFromImage) {
        farFromImage = nowFar;
        setFar(nowFar);
        setupProjectors();
      }
      latest.current.onEye?.({ x: Math.round(eye.x), y: Math.round(eye.z), yawDeg: Math.round((yaw * 180) / Math.PI) });
    }

    /** 도면 좌표로 받은 자리로 옮긴다. 방 안으로만 둔다. */
    function moveEye(x: number, y: number) {
      const { room } = latest.current.scene;
      eye.set(Math.min(Math.max(x, 300), room.widthMm - 300), EYE_HEIGHT_MM, Math.min(Math.max(y, 300), room.depthMm - 300));
      reportEye();
    }

    function updatePanoCamera() {
      camera.position.copy(eye);
      const dir = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
      camera.lookAt(eye.clone().add(dir));
    }

    function pointer(event: PointerEvent): THREE.Vector2 {
      const rect = renderer.domElement.getBoundingClientRect();
      return new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    }

    function floorPoint(event: PointerEvent): THREE.Vector3 | null {
      raycaster.setFromCamera(pointer(event), camera);
      const hit = new THREE.Vector3();
      return raycaster.ray.intersectPlane(floorPlane, hit) ? hit : null;
    }

    function pickItem(event: PointerEvent): string | null {
      raycaster.setFromCamera(pointer(event), camera);
      const hits = raycaster.intersectObjects([...itemRoots.values()], true);
      for (const hit of hits) {
        let node: THREE.Object3D | null = hit.object;
        while (node && !node.userData.itemId) node = node.parent;
        if (node) return node.userData.itemId as string;
      }
      return null;
    }

    let panoDragging = false;
    let lastX = 0;
    let lastY = 0;

    function onDown(event: PointerEvent) {
      renderer.domElement.setPointerCapture(event.pointerId);
      if (currentMode === "pano") {
        panoDragging = true;
        lastX = event.clientX;
        lastY = event.clientY;
        return;
      }
      const id = pickItem(event);
      setSelected(id);
      const item = latest.current.scene.items.find((other) => other.id === id);
      const point = floorPoint(event);
      if (item && !item.hanging && point) {
        controls.enabled = false;
        drag = { id: item.id, offsetX: point.x - item.x, offsetZ: point.z - item.y, x: item.x, y: item.y };
      }
    }

    function onMove(event: PointerEvent) {
      if (currentMode === "pano") {
        if (!panoDragging) return;
        yaw += (event.clientX - lastX) * 0.005;
        pitch = Math.max(-1.3, Math.min(1.3, pitch - (event.clientY - lastY) * 0.005));
        lastX = event.clientX;
        lastY = event.clientY;
        return;
      }
      if (!drag) return;
      const point = floorPoint(event);
      const root = itemRoots.get(drag.id);
      const item = latest.current.scene.items.find((other) => other.id === drag?.id);
      if (!point || !root || !item) return;
      const moved = moveItem(latest.current.scene, drag.id, point.x - drag.offsetX, point.z - drag.offsetZ).items.find((other) => other.id === drag?.id);
      if (!moved) return;
      drag.x = moved.x;
      drag.y = moved.y;
      root.position.x = moved.x + item.widthMm / 2;
      root.position.z = moved.y + item.depthMm / 2;
    }

    function onUp(event: PointerEvent) {
      if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
      if (panoDragging) reportEye();
      panoDragging = false;
      if (currentMode === "orbit") controls.enabled = true;
      if (drag) {
        const finished = drag;
        drag = null;
        const base = latest.current.scene;
        const item = base.items.find((other) => other.id === finished.id);
        if (item && (item.x !== finished.x || item.y !== finished.y)) latest.current.onChange(moveItem(base, finished.id, finished.x, finished.y));
      }
    }

    function onDouble(event: PointerEvent | MouseEvent) {
      if (currentMode !== "pano") return;
      const point = floorPoint(event as PointerEvent);
      if (!point) return;
      const { room } = latest.current.scene;
      eye.set(Math.min(Math.max(point.x, 300), room.widthMm - 300), EYE_HEIGHT_MM, Math.min(Math.max(point.z, 300), room.depthMm - 300));
      reportEye();
    }

    function onWheel(event: WheelEvent) {
      if (currentMode !== "pano") return;
      event.preventDefault();
      camera.fov = Math.min(100, Math.max(30, camera.fov + event.deltaY * 0.04));
      camera.updateProjectionMatrix();
    }

    function onKey(event: KeyboardEvent) {
      if (currentMode !== "pano") return;
      const step = 300;
      const forward = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
      const sideways = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
      const move = new THREE.Vector3();
      if (event.key === "ArrowUp") move.add(forward);
      else if (event.key === "ArrowDown") move.sub(forward);
      else if (event.key === "ArrowLeft") move.sub(sideways);
      else if (event.key === "ArrowRight") move.add(sideways);
      else return;
      event.preventDefault();
      const { room } = latest.current.scene;
      eye.x = Math.min(Math.max(eye.x + move.x * step, 300), room.widthMm - 300);
      eye.z = Math.min(Math.max(eye.z + move.z * step, 300), room.depthMm - 300);
      reportEye();
    }

    function resize() {
      const width = host?.clientWidth ?? 1;
      const height = host?.clientHeight ?? 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    const dom = renderer.domElement;
    dom.addEventListener("pointerdown", onDown);
    dom.addEventListener("pointermove", onMove);
    dom.addEventListener("pointerup", onUp);
    dom.addEventListener("pointercancel", onUp);
    dom.addEventListener("dblclick", onDouble);
    dom.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    let frame = 0;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      if (currentMode === "pano") updatePanoCamera();
      else controls.update();
      renderer.render(threeScene, camera);
    };

    api.current = { rebuild, setMode: applyMode, exportPanorama, moveEye, applySun, rebuildNeighbors };
    rebuildNeighbors();
    if (captureRef) captureRef.current = (position) => captureViews(position ?? panoPosition(latest.current.scene.room), [0, 90, 180, 270], 100, 1024, 768);
    if (process.env.NODE_ENV !== "production") (window as unknown as { __viewer3d?: unknown }).__viewer3d = { captureViews, room: () => latest.current.scene.room,
      items: () => latest.current.scene.items.map((item) => ({ id: item.id, name: item.name, x: item.x, y: item.y, w: item.widthMm, d: item.depthMm, hanging: !!item.hanging })),
      screenOf: (id: string) => {
        const root = itemRoots.get(id);
        if (!root) return null;
        const point = new THREE.Vector3(root.position.x, 400, root.position.z).project(camera);
        const rect = renderer.domElement.getBoundingClientRect();
        return { x: rect.left + ((point.x + 1) / 2) * rect.width, y: rect.top + ((1 - point.y) / 2) * rect.height };
      },
    };
    resize();
    applyMode(mode);
    loop();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      dom.removeEventListener("pointerdown", onDown);
      dom.removeEventListener("pointermove", onMove);
      dom.removeEventListener("pointerup", onUp);
      dom.removeEventListener("pointercancel", onUp);
      dom.removeEventListener("dblclick", onDouble);
      dom.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      controls.dispose();
      for (const child of content.children) {
        child.traverse((node) => {
          const mesh = node as THREE.Mesh;
          mesh.geometry?.dispose();
          const material = mesh.material;
          if (Array.isArray(material)) material.forEach((m) => m.dispose());
          else material?.dispose();
        });
      }
      disposeProjectors();
      for (const child of [...neighborRoot.children]) {
        child.traverse((node) => {
          const mesh = node as THREE.Mesh;
          mesh.geometry?.dispose();
        });
      }
      if (captureRef) captureRef.current = null;
      if (process.env.NODE_ENV !== "production") delete (window as unknown as { __viewer3d?: unknown }).__viewer3d;
      renderer.dispose();
      host.removeChild(renderer.domElement);
      api.current = null;
    };
    // 렌더러는 한 번만 만든다. 스타일과 Scene이 바뀌면 아래 effect가 모형만 다시 만든다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 가구를 옮기면 이미지 속 가구는 옛 자리에 남는다. 그래서 고치는 순간 AI 이미지를 끄고 모형만 보여 준다.
  const firstStale = useRef(true);
  useEffect(() => {
    if (firstStale.current) {
      firstStale.current = false;
      if (edited) setPhotoOn(false);
      return;
    }
    setPhotoOn(!edited);
  }, [edited]);

  useEffect(() => {
    api.current?.rebuild();
  }, [scene, styleKey]);

  useEffect(() => {
    api.current?.setMode(mode);
  }, [mode, photo?.url, pano?.id, photoOn]);

  // 시각, 위치, 방위가 바뀌면 해를 다시 놓는다.
  useEffect(() => {
    api.current?.applySun();
  }, [hour, site?.lat, site?.lng, scene.facingDeg]);

  // 공간 위치의 주변 건물을 받는다.
  useEffect(() => {
    if (!site || !showNeighbors) {
      setNeighbors([]);
      setNeighborsState("idle");
      return;
    }
    let alive = true;
    setNeighborsState("loading");
    fetchNeighbors(site.lat, site.lng).then((list) => {
      if (!alive) return;
      setNeighbors(list);
      setNeighborsState(list.length > 0 ? "idle" : "none");
    });
    return () => {
      alive = false;
    };
  }, [site?.lat, site?.lng, showNeighbors]);

  useEffect(() => {
    api.current?.rebuildNeighbors();
  }, [neighbors, showNeighbors, scene.room.widthMm, scene.room.depthMm, scene.facingDeg, scene.buildings]);

  // 도면에서 정한 자리로 옮긴다.
  useEffect(() => {
    if (eyeCommand) api.current?.moveEye(eyeCommand.x, eyeCommand.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eyeCommand?.nonce]);

  return (
    <div className={styles.viewer} onClick={(event) => event.stopPropagation()}>
      <div ref={hostRef} className={styles.host} />
      <div className={styles.bar}>
        <label className={styles.sun}>
          <span>해 {String(Math.floor(hour)).padStart(2, "0")}:{hour % 1 ? "30" : "00"}</span>
          <input type="range" min={6} max={20} step={0.5} value={hour} onChange={(event) => setHour(Number(event.target.value))} aria-label="해가 드는 시각" />
        </label>
        {(site || (scene.buildings?.length ?? 0) > 0) && (
          <button type="button" className={showNeighbors ? `${styles.close} ${styles.closeOn}` : styles.close} aria-pressed={showNeighbors} onClick={() => setShowNeighbors(!showNeighbors)}>
            {neighborsState === "loading" && showNeighbors ? "주변 건물…" : neighborsState === "none" && showNeighbors ? "주변 건물 없음" : "주변 건물"}
          </button>
        )}
        {photoReady && mode === "pano" && (
          <button type="button" className={photoOn ? `${styles.close} ${styles.closeOn}` : styles.close} aria-pressed={photoOn} onClick={() => setPhotoOn((on) => !on)}>
            AI 이미지 입히기
          </button>
        )}
        <button type="button" className={styles.close} onClick={() => api.current?.exportPanorama()}>
          360 이미지 저장
        </button>
      </div>
      <p className={styles.hint}>
        {selectedName ? `선택: ${selectedName}. ` : ""}
        {far && mode === "pano" ? "이 자리에는 AI 이미지가 없어서 모형만 보여요. 360 다시 만들기를 누르면 이 자리에서 만들어요." : photoReady && edited && !photoOn ? "배치를 고쳐서 AI 이미지를 껐어요. 360 다시 만들기를 누르면 새 배치로 입혀요." : hint}
      </p>

    </div>
  );
}
