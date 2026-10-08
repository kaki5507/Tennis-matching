"use client";

import { useEffect, useState } from "react";
import { BUCHEON_COURTS } from "@/lib/bucheonCourts";
import { subscribeCourtWatch, unsubscribeCourtWatch, getMyCourtWatches } from "@/app/actions/courtWatch";
import TennisLoader from "@/components/TennisLoader";
import { Bell, BellOff } from "lucide-react";
import { getAccessToken } from "@/lib/authToken";
import { getCourtNow } from "@/app/actions/courtNow";
import type { CourtNowResult } from "@/lib/courtToday";

interface Props {
  userId: string;
}

export default function CourtWatchList({ userId }: Props) {
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [nowResults, setNowResults] = useState<Record<string, CourtNowResult>>({});
  const [checkingId, setCheckingId] = useState<string | null>(null);

  // 코트를 누르면 오늘 남은 시간대를 바로 확인
  const checkNow = async (facilityId: string) => {
    setCheckingId(facilityId);
    const r = await getCourtNow(await getAccessToken(), facilityId);
    if (r.success) setNowResults((prev) => ({ ...prev, [facilityId]: r.results[0] }));
    setCheckingId(null);
  };

  useEffect(() => {
    let isMounted = true;
    getAccessToken().then((tk) => getMyCourtWatches(tk)).then((result) => {
      if (!isMounted) return;
      setWatchedIds(new Set(result.facilityIds));
      setIsLoading(false);
    });
    return () => { isMounted = false; };
  }, [userId]);

  const toggle = async (facilityId: string, facilityName: string) => {
    setPendingId(facilityId);
    const isWatching = watchedIds.has(facilityId);

    const result = isWatching
      ? await unsubscribeCourtWatch(await getAccessToken(), facilityId)
      : await subscribeCourtWatch(await getAccessToken(), facilityId, facilityName);

    if (result.success) {
      setWatchedIds((prev) => {
        const next = new Set(prev);
        if (isWatching) next.delete(facilityId);
        else next.add(facilityId);
        return next;
      });
    }
    setPendingId(null);
  };

  if (isLoading) {
    return <TennisLoader size="inline" label="불러오는 중..." />;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400 mb-2">
        부천시 공공서비스예약 기준 (3시간마다 자동 확인 · 알림 수신 동의 필요)
      </p>
      <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
        {BUCHEON_COURTS.map((court) => {
          const isWatching = watchedIds.has(court.facilityId);
          return (
            <li key={court.facilityId} className="px-4 py-3 surface">
             <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={() => checkNow(court.facilityId)} className="text-left min-w-0" aria-label={`${court.name} 오늘 남은 시간 확인`}>
                <div className="text-sm font-medium text-slate-800 truncate">{court.name}</div>
                <div className="text-xs text-court font-bold">
                  {checkingId === court.facilityId ? "확인 중..." : "눌러서 오늘 남은 시간 보기"}
                  {court.indoor ? " · 실내" : ""}
                </div>
              </button>
              <button
                type="button"
                onClick={() => toggle(court.facilityId, court.name)}
                disabled={pendingId === court.facilityId}
                className={`text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1 ${
                  isWatching
                    ? "badge-ok"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {isWatching ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                {isWatching ? "알림 켜짐" : "알림 받기"}
              </button>
             </div>
             {nowResults[court.facilityId] && (
               <p className={`mt-2 text-xs font-bold ${nowResults[court.facilityId].ok && nowResults[court.facilityId].times.length ? "text-ok" : "text-ink-muted"}`}>
                 {!nowResults[court.facilityId].ok
                   ? nowResults[court.facilityId].error
                   : nowResults[court.facilityId].times.length
                     ? `오늘 가능: ${nowResults[court.facilityId].times.join(", ")}`
                     : "오늘 남은 시간대가 없어요."}
               </p>
             )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
