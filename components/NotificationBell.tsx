"use client";

// components/NotificationBell.tsx
// 헤더에 놓는 종 아이콘. 안 읽은 알림 개수를 배지로 보여주고 알림함으로 이동합니다.
// 로그인하지 않았으면 아무것도 렌더링하지 않습니다.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { getUnreadNotificationCount } from "@/app/actions/notification";
import { getAccessToken } from "@/lib/authToken";
import { useAuthUser } from "@/lib/useAuthUser";

const POLL_MS = 120_000; // 2분마다 갱신 (탭이 보일 때만)
const MIN_GAP_MS = 20_000; // 페이지 이동/탭 복귀로 인한 재조회 최소 간격

export default function NotificationBell({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const { userId } = useAuthUser();
  const [count, setCount] = useState(0);
  const lastFetch = useRef(0);

  const refresh = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetch.current < MIN_GAP_MS) return;
    lastFetch.current = now;
    const result = await getUnreadNotificationCount(await getAccessToken());
    if (result.success) setCount(result.count);
  }, []);

  // 로그인 직후 한 번 + 주기적 갱신(탭이 숨겨진 동안은 쉼)
  useEffect(() => {
    if (!userId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh(true);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId, refresh]);

  // 알림함에서 돌아오는 등 페이지 이동 시: 최소 간격이 지났을 때만 갱신
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (userId) refresh();
  }, [pathname, userId, refresh]);

  if (!userId) return null;
  const shown = count;

  return (
    <Link
      href="/notifications"
      className={`relative inline-flex items-center justify-center w-9 h-9 rounded-full text-court ${className}`}
      aria-label={shown > 0 ? `알림 ${shown}개 안 읽음` : "알림"}
    >
      <Bell className="w-5 h-5" />
      {shown > 0 && (
        <span className="notif-dot absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center">
          {shown > 99 ? "99+" : shown}
        </span>
      )}
    </Link>
  );
}
