"use client";

// 로그인 세션을 localStorage에 두고 읽고 쓰는 함수 모음.
// Supabase 로그인도 이 세션에 이메일과 회원 유형을 복사해 둔다. 화면은 이 세션만 본다.
import { useEffect, useState } from "react";
import type { Session } from "@/types/auth";
import { getSupabase } from "@/lib/supabase";

const KEY = "shopportunity-session";
const CHANGE_EVENT = "shopportunity-session-change"; // 같은 탭에서 세션이 바뀌면 알린다.

export function readSession(): Session | null {
  try {
    const text = localStorage.getItem(KEY);
    return text ? (JSON.parse(text) as Session) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // 저장소가 막혀 있으면 로그인 상태만 유지하지 못한다.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 위와 같다.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** 로그아웃. Supabase 세션도 함께 끊는다. */
export async function signOut() {
  const supabase = getSupabase();
  if (supabase) await supabase.auth.signOut();
  clearSession();
}

/**
 * 현재 세션을 돌려주는 훅. 서버 렌더링 때는 읽을 수 없어서 ready가 false다.
 * ready가 true가 된 뒤에 session이 null이면 로그아웃 상태다.
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function refresh() {
      setSession(readSession());
      setReady(true);
    }
    refresh();
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh); // 다른 탭의 변경
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return { session, ready };
}
