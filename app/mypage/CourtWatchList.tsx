"use client";

import { useEffect, useState } from "react";
import { BUCHEON_COURTS } from "@/lib/bucheonCourts";
import { subscribeCourtWatch, unsubscribeCourtWatch, getMyCourtWatches } from "@/app/actions/courtWatch";
import TennisLoader from "@/components/TennisLoader";
import { Bell, BellOff } from "lucide-react";

interface Props {
  userId: string;
}

export default function CourtWatchList({ userId }: Props) {
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    getMyCourtWatches(userId).then((result) => {
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
      ? await unsubscribeCourtWatch(userId, facilityId)
      : await subscribeCourtWatch(userId, facilityId, facilityName);

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
            <li key={court.facilityId} className="flex items-center justify-between px-4 py-3 bg-white">
              <div>
                <div className="text-sm font-medium text-slate-800">{court.name}</div>
                {court.indoor && <div className="text-xs text-slate-400">실내</div>}
              </div>
              <button
                type="button"
                onClick={() => toggle(court.facilityId, court.name)}
                disabled={pendingId === court.facilityId}
                className={`text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1 ${
                  isWatching
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {isWatching ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                {isWatching ? "알림 켜짐" : "알림 받기"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
