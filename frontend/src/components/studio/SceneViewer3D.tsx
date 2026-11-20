"use client";

// 도면(Scene)을 3D로 보여 준다. 두 가지 보기가 있다.
//  - 3D 둘러보기: 공간 바깥에서 돌려 보고, 가구를 끌어서 옮긴다.
//  - 360 보기: 방 안에 서서 사방을 돌려 본다. 더블클릭하면 그 자리로 이동하고, 화살표 키로 걷는다.
// 3D는 Scene만 읽는다. 가구를 옮기면 onChange로 Scene을 고치고, 평면도와 견적이 같은 Scene을 읽어 같이 바뀐다.
// 사진 같은 질감은 AI 렌더링 이미지가 맡고, 여기는 크기와 위치가 정확한 모형이다.
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { moveItem } from "@/lib/scene";
import { entryZone } from "@/lib/sceneCheck";
import type { RenderStyleKey } from "@/types/studio";
import type { Scene, SceneItem } from "@/types/scene";
import styles from "./SceneViewer3D.module.css";

export type ViewMode = "orbit" | "pano";

type Props = {
  scene: Scene;
  styleKey: RenderStyleKey;
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  onChange: (next: Scene) => void;
  onClose: () => void;
};

const EYE_HEIGHT_MM = 1500;

const PALETTES: Record<RenderStyleKey, { floor: string; wall: string; wood: string; chair: string; counter: string; metal: string }> = {
  wood: { floor: "#cfb38a", wall: "#efe6d8", wood: "#b5835a", chair: "#c99a6b", counter: "#8d5f3c", metal: "#7a7a7a" },
  white: { floor: "#e9e6e0", wall: "#ffffff", wood: "#ead9bf", chair: "#f3f3f3", counter: "#d9c6a5", metal: "#c8c8c8" },
  industrial: { floor: "#6d6d6a", wall: "#8b8b86", wood: "#4a3d36", chair: "#2b2b2b", counter: "#2f2926", metal: "#1f1f1f" },
};

function mat(color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05, ...extra });
}

function box(w: number, h: number, d: number, material: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y + h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** 가구 하나의 모형. 원점은 바닥 면적의 가운데이고 y는 바닥이다. */
function buildItem(item: SceneItem, palette: (typeof PALETTES)[RenderStyleKey], ceilingMm: number): THREE.Group {
  const group = new THREE.Group();
  const wood = mat(palette.wood);
  const chair = mat(palette.chair);

  if (item.hanging) {
    const drop = Math.max(400, ceilingMm - 2000);
    const wire = box(8, drop, 8, mat(palette.metal), 0, ceilingMm - drop, 0);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(190, 220, 24, 1, true), mat("#f4d98a", { emissive: "#f4c84a", emissiveIntensity: 0.6, side: THREE.DoubleSide }));
    shade.position.set(0, ceilingMm - drop - 110, 0);
    group.add(wire, shade);
    return group;
  }

  if (item.round && item.tableDiaMm) {
    const radius = item.tableDiaMm / 2;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 40, 36), wood);
    top.position.y = 720 - 20;
    top.castShadow = true;
    top.receiveShadow = true;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(40, 60, 700, 14), mat(palette.metal));
    leg.position.y = 350;
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(220, 220, 20, 24), mat(palette.metal));
    foot.position.y = 10;
    group.add(top, leg, foot);
    for (const deg of item.chairAngles ?? []) {
      const rad = (deg * Math.PI) / 180;
      const chairGroup = new THREE.Group();
      chairGroup.add(box(400, 40, 400, chair, 0, 410, 0));
      chairGroup.add(box(400, 450, 40, chair, 0, 450, 180)); // 등받이는 테이블 반대쪽
      for (const [lx, lz] of [[-170, -170], [170, -170], [-170, 170], [170, 170]]) chairGroup.add(box(30, 410, 30, chair, lx, 0, lz));
      const dist = radius + 260;
      chairGroup.position.set(Math.cos(rad) * dist, 0, Math.sin(rad) * dist);
      chairGroup.rotation.y = -rad + Math.PI / 2; // 등받이(+z 쪽)가 바깥을 보게 돌린다.
      group.add(chairGroup);
    }
    return group;
  }

  const w = item.widthMm;
  const d = item.depthMm;
  if (item.category === "counter") {
    group.add(box(w, 960, d, mat(palette.counter)));
    group.add(box(w + 60, 40, d + 60, wood, 0, 960, 0));
  } else if (item.category === "shelf") {
    group.add(box(w, 1800, 30, wood, 0, 0, -d / 2 + 15));
    for (let level = 0; level <= 5; level += 1) group.add(box(w, 30, d, wood, 0, level * 340, 0));
    group.add(box(30, 1800, d, wood, -w / 2 + 15, 0, 0), box(30, 1800, d, wood, w / 2 - 15, 0, 0));
  } else if (item.category === "reformer") {
    group.add(box(w, 280, d - 200, wood, 0, 120, 0));
    group.add(box(w * 0.6, 80, d - 200, mat("#222222"), w * 0.1, 400, 0));
    group.add(box(80, 700, d, mat(palette.metal), -w / 2 + 60, 0, 0));
  } else if (item.category === "table") {
    group.add(box(w, 40, d, wood, 0, 760, 0));
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) group.add(box(50, 760, 50, wood, (lx * (w - 100)) / 2, 0, (lz * (d - 100)) / 2));
  } else if (item.name.includes("쇼케이스")) {
    group.add(box(w, 700, d, mat(palette.counter)));
    group.add(box(w - 40, 400, d - 40, mat("#cfe8f3", { transparent: true, opacity: 0.45 }), 0, 700, 0));
  } else {
    group.add(box(w, 800, d, wood));
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
    group.add(box(30, ceilingMm * 0.7, s.depthMm, mat("#bfe3f5", { transparent: true, opacity: 0.35 }), s.x + 15, 800, cz));
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

export default function SceneViewer3D({ scene, styleKey, mode, onModeChange, onChange, onClose }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [hint, setHint] = useState("");
  const [selectedName, setSelectedName] = useState("");

  // 최신 값을 이벤트 처리기에서 읽는다.
  const latest = useRef({ scene, onChange });
  latest.current = { scene, onChange };
  const api = useRef<{ rebuild: () => void; setMode: (mode: ViewMode) => void; exportPanorama: () => void } | null>(null);

  // 한 번만 만든다: 렌더러, 카메라, 이벤트
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);
    renderer.domElement.className = styles.canvas;

    const threeScene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 100, 80000);
    const content = new THREE.Group();
    threeScene.add(content);

    threeScene.add(new THREE.HemisphereLight("#ffffff", "#b9a98f", 0.9));
    const sun = new THREE.DirectionalLight("#ffffff", 1.0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    threeScene.add(sun, sun.target);

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

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(room.widthMm, room.depthMm), mat(palette.floor));
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(room.widthMm / 2, 0, room.depthMm / 2);
      floor.receiveShadow = true;
      content.add(floor);

      const wallMaterial = mat(palette.wall, { side: THREE.DoubleSide });
      const back = new THREE.Mesh(new THREE.PlaneGeometry(room.widthMm, room.ceilingMm), wallMaterial);
      back.position.set(room.widthMm / 2, room.ceilingMm / 2, 0);
      const left = new THREE.Mesh(new THREE.PlaneGeometry(room.depthMm, room.ceilingMm), wallMaterial);
      left.rotation.y = Math.PI / 2;
      left.position.set(0, room.ceilingMm / 2, room.depthMm / 2);
      const right = left.clone();
      right.position.set(room.widthMm, room.ceilingMm / 2, room.depthMm / 2);
      back.receiveShadow = left.receiveShadow = right.receiveShadow = true;
      content.add(back, left, right);
      if (currentMode === "pano") {
        const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(room.widthMm, room.depthMm), mat("#f4f1ec", { side: THREE.DoubleSide }));
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(room.widthMm / 2, room.ceilingMm, room.depthMm / 2);
        const front = new THREE.Mesh(new THREE.PlaneGeometry(room.widthMm, room.ceilingMm), wallMaterial);
        front.position.set(room.widthMm / 2, room.ceilingMm / 2, room.depthMm);
        content.add(ceiling, front);
      }

      // 입구 앞 비움 자리
      const zone = entryZone(room);
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

      sun.position.set(room.widthMm * 0.8, room.ceilingMm * 3, room.depthMm * 0.2);
      sun.target.position.set(room.widthMm / 2, 0, room.depthMm / 2);
      const span = Math.max(room.widthMm, room.depthMm);
      sun.shadow.camera.left = sun.shadow.camera.bottom = -span;
      sun.shadow.camera.right = sun.shadow.camera.top = span;
      sun.shadow.camera.far = span * 8;
      sun.shadow.camera.updateProjectionMatrix();
    }

    function applyMode(next: ViewMode) {
      currentMode = next;
      setSelected(null);
      const { room } = latest.current.scene;
      if (next === "orbit") {
        controls.enabled = true;
        camera.fov = 50;
        camera.position.set(room.widthMm * 0.5, Math.max(room.widthMm, room.depthMm) * 0.9, room.depthMm + Math.max(room.widthMm, room.depthMm) * 0.8);
        controls.target.set(room.widthMm / 2, 600, room.depthMm / 2);
        controls.update();
        setHint("끌면 돌려 보고, 가구를 끌면 옮겨요.");
      } else {
        controls.enabled = false;
        camera.fov = 75;
        eye.set(room.widthMm / 2, EYE_HEIGHT_MM, room.depthMm - 900);
        yaw = 0; // 안쪽 벽(z가 줄어드는 쪽)을 본다.
        pitch = 0;
        setHint("끌면 사방을 돌려 보고, 더블클릭하면 그 자리로 이동해요. 방향키로 걸을 수 있어요.");
      }
      camera.updateProjectionMatrix();
      rebuild();
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

    api.current = { rebuild, setMode: applyMode, exportPanorama };
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
      renderer.dispose();
      host.removeChild(renderer.domElement);
      api.current = null;
    };
    // 렌더러는 한 번만 만든다. 스타일과 Scene이 바뀌면 아래 effect가 모형만 다시 만든다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api.current?.rebuild();
  }, [scene, styleKey]);

  useEffect(() => {
    api.current?.setMode(mode);
  }, [mode]);

  return (
    <div className={styles.viewer} onClick={(event) => event.stopPropagation()}>
      <div ref={hostRef} className={styles.host} />
      <div className={styles.bar}>
        <div className={styles.modes} role="tablist" aria-label="3D 보기 방식">
          <button type="button" role="tab" aria-selected={mode === "orbit"} className={mode === "orbit" ? `${styles.mode} ${styles.modeActive}` : styles.mode} onClick={() => onModeChange("orbit")}>
            3D 둘러보기
          </button>
          <button type="button" role="tab" aria-selected={mode === "pano"} className={mode === "pano" ? `${styles.mode} ${styles.modeActive}` : styles.mode} onClick={() => onModeChange("pano")}>
            360 보기
          </button>
        </div>
        <button type="button" className={styles.close} onClick={() => api.current?.exportPanorama()}>
          360 이미지 저장
        </button>
        <button type="button" className={styles.close} onClick={onClose}>
          닫기
        </button>
      </div>
      <p className={styles.hint}>
        {selectedName ? `선택: ${selectedName}. ` : ""}
        {hint}
      </p>
      <p className={styles.note}>크기와 위치를 맞춘 모형이에요. 사진 같은 이미지는 AI 렌더링이 만들어요.</p>
    </div>
  );
}
