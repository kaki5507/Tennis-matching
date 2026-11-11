"use client";

import { useEffect, useState } from "react";
import { BUCHEON_COURTS } from "@/lib/bucheonCourts";
import { subscribeCourtWatch, unsubscribeCourtWatch, getMyCourtWatches, setCourtAlertTimes } from "@/app/actions/courtWatch";
import { COURT_ALERT_OPTIONS } from "@/lib/courtAlert";
import TennisLoader from "@/components/TennisLoader";
import { Bell, BellOff } from "lucide-react";
import { getAccessToken } from "@/lib/authToken";
import { getCourtRange } from "@/app/actions/courtNow";
import type { CourtRangeResult } from "@/lib/courtToday";

interface Props {
  userId: string;
}

export default function CourtWatchList({ userId }: Props) {
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [nowResults, setNowResults] = useState<Record<string, CourtRangeResult>>({});
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [alertTimes, setAlertTimes] = useState<string[]>([]);
  const [savingTimes, setSavingTimes] = useState(false);
  const [timesError, setTimesError] = useState("");

  // 시간대 칩을 누르면 바로 저장 (실패하면 원래대로 되돌림)
  const toggleTime = async (key: string) => {
    if (savingTimes) return;
    const prev = alertTimes;
    const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
    setAlertTimes(next);
    setSavingTimes(true);
    setTimesError("");
    const r = await setCourtAlertTimes(await getAccessToken(), next);
    if (r.success) setAlertTimes(r.alertTimes);
    else { setAlertTimes(prev); setTimesError(r.error ?? "저장에 실패했습니다."); }
    setSavingTimes(false);
  };

  // 코트를 누르면 내일 가능한 시간대를 바로 확인
  const checkNow = async (facilityId: string) => {
    setCheckingId(facilityId);
    const r = await getCourtRange(await getAccessToken(), "tomorrow", facilityId);
    if (r.success) setNowResults((prev) => ({ ...prev, [facilityId]: r.results[0] }));
    setCheckingId(null);
  };

  useEffect(() => {
    let isMounted = true;
    getAccessToken().then((tk) => getMyCourtWatches(tk)).then((result) => {
      if (!isMounted) return;
      setWatchedIds(new Set(result.facilityIds));
      setAlertTimes(result.alertTimes ?? []);
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
        부천시 공공서비스예약 기준 (알림 수신 동의 필요)
      </p>
      <div className="tint rounded-lg p-3 mb-3">
        <p className="text-sm font-bold text-slate-800">받고 싶은 시간대</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {COURT_ALERT_OPTIONS.map((o) => {
            const on = alertTimes.includes(o.key);
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => toggleTime(o.key)}
                aria-pressed={on}
                disabled={savingTimes}
                className={`text-xs px-3 py-1.5 rounded-full font-bold border ${on ? "chip-on border-transparent" : "bg-white border-slate-200 text-slate-600"}`}
              >
                {o.label} <span className="font-medium opacity-80">{o.hint}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {alertTimes.length === 0
            ? "아무것도 고르지 않으면 모든 시간대의 새 자리를 알려드려요."
            : "고른 시간대에 새 자리가 났을 때만 알려드려요. 아래에서 알림을 켠 테니스장에만 적용돼요."}
        </p>
        {timesError && <p className="text-xs text-red-600 mt-1">{timesError}</p>}
      </div>
      <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
        {BUCHEON_COURTS.map((court) => {
          const isWatching = watchedIds.has(court.facilityId);
          return (
            <li key={court.facilityId} className="px-4 py-3 surface">
             <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={() => checkNow(court.facilityId)} className="text-left min-w-0" aria-label={`${court.name} 내일 가능한 시간 확인`}>
                <div className="text-sm font-medium text-slate-800 truncate">{court.name}</div>
                <div className="text-xs text-court font-bold">
                  {checkingId === court.facilityId ? "확인 중..." : "눌러서 내일 가능한 시간 보기"}
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
               <p className={`mt-2 text-xs font-bold ${nowResults[court.facilityId].ok && (nowResults[court.facilityId].days[0]?.times.length ?? 0) ? "text-ok" : "text-ink-muted"}`}>
                 {!nowResults[court.facilityId].ok
                   ? nowResults[court.facilityId].error
                   : (nowResults[court.facilityId].days[0]?.times.length ?? 0)
                     ? `내일 가능: ${(nowResults[court.facilityId].days[0]?.times ?? []).join(", ")}`
                     : "내일 가능한 시간대가 없어요."}
               </p>
             )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
