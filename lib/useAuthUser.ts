"use client";

// lib/useAuthUser.ts
// 로그인 상태를 "네트워크 호출 없이" 읽는 훅. (getUser()는 매번 서버에 물어봐서 느림)
// getSession()은 브라우저에 저장된 세션을 바로 읽고, 토큰 갱신은 supabase-js가 알아서 합니다.
// 여러 컴포넌트(헤더/종/메뉴)가 같이 써도 구독은 하나만 유지합니다.

import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";

export type AuthSnapshot = { ready: boolean; userId: string | null; email: string | null };

const SERVER: AuthSnapshot = { ready: false, userId: null, email: null };
let snapshot: AuthSnapshot = SERVER;
const listeners = new Set<() => void>();
let started = false;

function set(next: AuthSnapshot) {
  if (next.ready === snapshot.ready && next.userId === snapshot.userId && next.email === snapshot.email) return;
  snapshot = next;
  listeners.forEach((l) => l());
}

function start() {
  if (started) return;
  started = true;
  supabase.auth.getSession().then(({ data }) => {
    set({ ready: true, userId: data.session?.user.id ?? null, email: data.session?.user.email ?? null });
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    set({ ready: true, userId: session?.user.id ?? null, email: session?.user.email ?? null });
  });
}

function subscribe(cb: () => void) {
  start();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useAuthUser(): AuthSnapshot {
  return useSyncExternalStore(subscribe, () => snapshot, () => SERVER);
}
