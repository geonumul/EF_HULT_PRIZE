"use client";

// 파트너 콘솔의 가짜 저장소. 서버 대신 localStorage에 목록을 쌓는다.
// 처음 열면 가짜 데이터로 시작하고, 등록하거나 지우면 그 목록을 그대로 저장한다.
import { useEffect, useState } from "react";

export function useStoredList<T>(key: string, initial: T[]): [T[], (next: T[]) => void] {
  const [list, setList] = useState<T[]>(initial);

  useEffect(() => {
    try {
      const text = localStorage.getItem(key);
      if (text) setList(JSON.parse(text) as T[]);
    } catch {
      // 저장소가 막혀 있거나 값이 깨졌으면 가짜 데이터로 시작한다.
    }
  }, [key]);

  function save(next: T[]) {
    setList(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // 저장하지 못해도 화면에는 반영된다.
    }
  }

  return [list, save];
}

/** 새 항목 id. 시간과 난수를 이어 붙인다. */
export function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
