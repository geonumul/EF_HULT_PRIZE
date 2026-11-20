"use client";

// 스튜디오의 배치 편집에 쓰는 Scene을 들고 있는 훅. 저장된 것이 있으면 그것을, 없으면 처음 배치를 불러온다.
// 고칠 때마다 localStorage에 저장하고, 되돌리기 목록(최대 30개)을 쌓는다.
import { useCallback, useEffect, useRef, useState } from "react";
import { clearScene, loadScene, saveScene, seedScene } from "@/lib/scene";
import type { Listing, UseType } from "@/types";
import type { Scene } from "@/types/scene";

export type SceneEditor = {
  scene: Scene | null;
  status: "idle" | "loading" | "ready" | "failed";
  canUndo: boolean;
  change: (next: Scene) => void;
  undo: () => void;
  reset: () => void;
};

const HISTORY_LIMIT = 30;

export function useSceneEditor(listing: Listing, useType: UseType, enabled: boolean): SceneEditor {
  const [scene, setScene] = useState<Scene | null>(null);
  const [status, setStatus] = useState<SceneEditor["status"]>("idle");
  const [canUndo, setCanUndo] = useState(false);
  const history = useRef<Scene[]>([]);
  const current = useRef<Scene | null>(null);
  current.current = scene;

  const seed = useCallback(
    (cancelled: () => boolean) => {
      setStatus("loading");
      seedScene(listing, useType).then((seeded) => {
        if (cancelled()) return;
        if (seeded) {
          saveScene(seeded);
          setScene(seeded);
          setStatus("ready");
        } else {
          setStatus("failed");
        }
      });
    },
    // listing 객체는 같은 공간이면 같은 값이다. id가 바뀔 때만 다시 불러온다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listing.id, useType],
  );

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    history.current = [];
    setCanUndo(false);
    const saved = loadScene(listing.id, useType);
    if (saved) {
      setScene(saved);
      setStatus("ready");
    } else {
      setScene(null);
      seed(() => stopped);
    }
    return () => {
      stopped = true;
    };
  }, [enabled, listing.id, useType, seed]);

  const change = useCallback((next: Scene) => {
    if (current.current) {
      history.current.push(current.current);
      if (history.current.length > HISTORY_LIMIT) history.current.shift();
      setCanUndo(true);
    }
    setScene(next);
    saveScene(next);
  }, []);

  const undo = useCallback(() => {
    const previous = history.current.pop();
    if (previous) {
      setScene(previous);
      saveScene(previous);
    }
    setCanUndo(history.current.length > 0);
  }, []);

  const reset = useCallback(() => {
    clearScene(listing.id, useType);
    history.current = [];
    setCanUndo(false);
    setScene(null);
    seed(() => false);
  }, [listing.id, useType, seed]);

  return { scene, status, canUndo, change, undo, reset };
}
