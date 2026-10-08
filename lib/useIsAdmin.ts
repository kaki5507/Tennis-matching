"use client";

// lib/useIsAdmin.ts
// 관리자 여부를 "바로" 알려주는 훅. 서버에 한 번 물어본 결과를 브라우저 탭(sessionStorage)에 기억해 두어서
// 메뉴를 열 때마다 기다리지 않아요. 로그인 직후 미리 확인해 두고, 실제 권한 검사는 각 서버 액션이 따로 합니다.

import { useEffect, useState } from "react";
import { checkAdminAccess } from "@/app/actions/admin";
import { getAccessToken } from "@/lib/authToken";

const KEY = "tm_admin_flag"; // "userId:1" | "userId:0"
const inflight = new Map<string, Promise<boolean>>();

function readCache(userId: string | null): boolean | null {
  if (!userId) return null;
  try {
    const v = sessionStorage.getItem(KEY);
    if (v?.startsWith(userId + ":")) return v.endsWith(":1");
  } catch {
    /* 저장소를 못 쓰는 환경이면 그냥 서버에 물어봄 */
  }
  return null;
}

function fetchAdmin(userId: string): Promise<boolean> {
  let p = inflight.get(userId);
  if (!p) {
    p = (async () => {
      const ok = await checkAdminAccess(await getAccessToken());
      try {
        sessionStorage.setItem(KEY, `${userId}:${ok ? 1 : 0}`);
      } catch {
        /* 무시 */
      }
      return ok;
    })().finally(() => inflight.delete(userId));
    inflight.set(userId, p);
  }
  return p;
}

export function useIsAdmin(userId: string | null): boolean {
  const [fetched, setFetched] = useState<{ id: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    fetchAdmin(userId).then((ok) => alive && setFetched({ id: userId, ok }));
    return () => {
      alive = false;
    };
  }, [userId]);

  if (!userId) return false;
  if (fetched?.id === userId) return fetched.ok;
  return readCache(userId) ?? false;
}
