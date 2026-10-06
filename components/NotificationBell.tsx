"use client";

// components/NotificationBell.tsx
// 헤더에 놓는 종 아이콘. 안 읽은 알림 개수를 배지로 보여주고 알림함으로 이동합니다.
// 로그인하지 않았으면 아무것도 렌더링하지 않습니다.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getUnreadNotificationCount } from "@/app/actions/notification";
import { getAccessToken } from "@/lib/authToken";

const POLL_MS = 60_000; // 1분마다 갱신

export default function NotificationBell({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    const result = await getUnreadNotificationCount(await getAccessToken());
    if (result.success) setCount(result.count);
  }, []);

  // 로그인 상태 추적
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      if (!session?.user) setCount(0);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // 페이지를 옮길 때마다 + 1분마다 안 읽은 개수 갱신
  useEffect(() => {
    if (!userId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const timer = setInterval(() => refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [userId, pathname, refresh]);

  if (!userId) return null;

  return (
    <Link
      href="/notifications"
      className={`relative inline-flex items-center justify-center w-9 h-9 rounded-full text-court ${className}`}
      aria-label={count > 0 ? `알림 ${count}개 안 읽음` : "알림"}
    >
      <Bell className="w-5 h-5" />
      {count > 0 && (
        <span className="notif-dot absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
