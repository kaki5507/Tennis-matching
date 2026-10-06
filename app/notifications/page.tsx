"use client";

// app/notifications/page.tsx
// 푸시를 놓치거나 받지 못한 알림도 여기서 다시 볼 수 있는 인앱 알림함.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/app/actions/notification";
import TennisLoader from "@/components/TennisLoader";
import TennisMascot from "@/components/TennisMascot";
import { getAccessToken } from "@/lib/authToken";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  url: string | null;
  isRead: boolean;
  createdAt: string | Date;
}

/** "방금 전 / 5분 전 / 3시간 전 / 2일 전 / 날짜" 형태로 표시 */
function timeAgo(value: string | Date): string {
  const diff = Date.now() - new Date(value).getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "방금 전";
  if (diff < hour) return `${Math.floor(diff / minute)}분 전`;
  if (diff < day) return `${Math.floor(diff / hour)}시간 전`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}일 전`;
  return new Date(value).toLocaleDateString("ko-KR");
}

const isExternal = (url: string) => /^https?:\/\//i.test(url);

export default function NotificationsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
        return;
      }
      setUserId(data.user.id);
      const result = await getMyNotifications(await getAccessToken());
      setItems(result.notifications as NotificationItem[]);
      setHasMore(result.hasMore);
      setIsLoading(false);
    };
    init();
  }, [router]);

  const loadMore = useCallback(async () => {
    if (!userId || items.length === 0) return;
    setIsLoadingMore(true);
    const result = await getMyNotifications(await getAccessToken(), items[items.length - 1].id);
    setItems((prev) => [...prev, ...(result.notifications as NotificationItem[])]);
    setHasMore(result.hasMore);
    setIsLoadingMore(false);
  }, [userId, items]);

  // 알림을 누르면: 읽음 처리(화면 먼저 반영) → 링크로 이동
  const open = async (item: NotificationItem) => {
    if (!userId) return;
    if (!item.isRead) {
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
      await markNotificationAsRead(await getAccessToken(), item.id);
    }
    if (!item.url) return;
    if (isExternal(item.url)) window.open(item.url, "_blank", "noopener,noreferrer");
    else router.push(item.url);
  };

  const readAll = async () => {
    if (!userId) return;
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await markAllNotificationsAsRead(await getAccessToken());
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <TennisLoader label="알림을 불러오는 중..." />
      </div>
    );
  }

  const unreadCount = items.filter((n) => !n.isRead).length;
  const visible = filter === "unread" ? items.filter((n) => !n.isRead) : items;

  return (
    <div className="page-bg min-h-screen py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-end justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl heading">🔔 알림</h1>
            <p className="text-sm text-ink-muted mt-1">
              {unreadCount > 0 ? `안 읽은 알림 ${unreadCount}개` : "모두 확인했어요"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button type="button" onClick={readAll} className="text-xs font-bold text-court underline shrink-0">
              모두 읽음
            </button>
          )}
        </div>

        <div className="flex rounded-full p-0.5 text-xs font-medium w-fit mb-4 surface">
          {(
            [
              { value: "all", label: "전체" },
              { value: "unread", label: "안 읽음" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter(opt.value)}
              className={`px-4 py-1.5 rounded-full ${filter === opt.value ? "chip-on" : "chip-off-court"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="surface rounded-2xl py-14 text-center">
            <TennisMascot pose="sad" className="w-24 h-24 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              {filter === "unread" ? "안 읽은 알림이 없어요." : "아직 받은 알림이 없어요."}
            </p>
            <Link href="/mypage" className="inline-block mt-4 text-xs font-bold text-court underline">
              마이페이지에서 알림 설정하기
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {visible.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => open(n)}
                  className={`w-full text-left rounded-xl px-4 py-3 shadow-sm ${n.isRead ? "notif-read" : "notif-unread"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`text-sm break-words ${n.isRead ? "text-slate-600" : "font-bold text-ink"}`}>
                      {n.title}
                    </span>
                    <span className="text-[11px] text-slate-400 shrink-0 mt-0.5">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className={`text-xs mt-1 break-words ${n.isRead ? "text-slate-400" : "text-slate-600"}`}>{n.body}</p>
                  {n.url && isExternal(n.url) && (
                    <span className="text-[11px] text-court underline mt-1.5 inline-block">외부 사이트에서 보기 ↗</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {hasMore && filter === "all" && (
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="w-full mt-4 py-3 rounded-xl text-sm font-medium surface text-court"
          >
            {isLoadingMore ? "불러오는 중..." : "이전 알림 더 보기"}
          </button>
        )}
      </div>
    </div>
  );
}
