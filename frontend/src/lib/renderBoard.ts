"use client";

// 렌더링 보드. 집기 마켓에서 담은 상품 목록이다. "상품 먼저" 렌더링이 이 목록을 쓴다.
// 목록은 브라우저 localStorage에 저장해서 화면을 옮겨 다녀도 남는다.
// 사용: const { items, add, remove, setQty, clear } = useRenderBoard();
import { useSyncExternalStore } from "react";

export type BoardItem = { productId: string; qty: number };

const STORAGE_KEY = "shopportunity-render-board";
const EMPTY: BoardItem[] = [];

let items: BoardItem[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

// 저장된 목록을 처음 한 번만 읽는다.
function loadOnce() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) items = JSON.parse(saved);
  } catch {
    items = EMPTY; // 저장된 값이 깨졌으면 빈 목록으로 시작한다.
  }
}

function update(next: BoardItem[]) {
  items = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 저장 공간이 막혀 있어도 화면은 계속 동작한다.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  loadOnce();
  return items;
}

function getServerSnapshot() {
  return EMPTY;
}

/** 상품을 담는다. 이미 있으면 수량만 늘린다. */
function add(productId: string, qty = 1) {
  const found = items.find((item) => item.productId === productId);
  if (found) {
    update(items.map((item) => (item.productId === productId ? { ...item, qty: item.qty + qty } : item)));
  } else {
    update([...items, { productId, qty }]);
  }
}

function remove(productId: string) {
  update(items.filter((item) => item.productId !== productId));
}

/** 수량을 바꾼다. 1보다 작아지면 목록에서 뺀다. */
function setQty(productId: string, qty: number) {
  if (qty < 1) {
    remove(productId);
    return;
  }
  update(items.map((item) => (item.productId === productId ? { ...item, qty } : item)));
}

function clear() {
  update(EMPTY);
}

export function useRenderBoard() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { items: current, add, remove, setQty, clear };
}
