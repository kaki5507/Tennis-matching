"use client";

// app/courts/page.tsx
// 메인 기능: 지금 이 시각 기준으로 오늘 남아 있는 부천 테니스장 시간대를 바로 확인합니다.

import { useState } from "react";
import Link from "next/link";
import { RefreshCw, Clock, Bell } from "lucide-react";
import { BUCHEON_COURTS } from "@/lib/bucheonCourts";
import { getAllCourtsNow, getCourtNow } from "@/app/actions/courtNow";
import type { CourtNowResult } from "@/lib/courtToday";
import { getAccessToken } from "@/lib/authToken";
import { useAuthUser } from "@/lib/useAuthUser";
import TennisMascot from "@/components/TennisMascot";

const fmt = (iso: string) => new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" });

export default function CourtsPage() {
  const { ready, userId } = useAuthUser();
  const [results, setResults] = useState<Record<string, CourtNowResult>>({});
  const [loadingAll, setLoadingAll] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apply = (list: CourtNowResult[], at: string) => {
    setResults((prev) => ({ ...prev, ...Object.fromEntries(list.map((r) => [r.facilityId, r])) }));
    setCheckedAt(at);
  };

  const checkAll = async () => {
    setLoadingAll(true);
    setError(null);
    const r = await getAllCourtsNow(await getAccessToken());
    if (r.success) apply(r.results, r.checkedAt);
    else setError(r.error);
    setLoadingAll(false);
  };

  const checkOne = async (facilityId: string) => {
    setLoadingId(facilityId);
    setError(null);
    const r = await getCourtNow(await getAccessToken(), facilityId);
    if (r.success) apply(r.results, r.checkedAt);
    else setError(r.error);
    setLoadingId(null);
  };

  const checked = Object.values(results);
  const openCount = checked.filter((r) => r.ok && r.times.length > 0).length;

  return (
    <div className="min-h-screen page-bg pb-16">
      <section className="hero-blue relative overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 pt-7 pb-8 grid grid-cols-[1fr_auto] items-center gap-2">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl leading-tight text-white">지금 빈 코트 찾기</h1>
            <p className="mt-2 text-sm sm:text-base text-white/85">
              오늘, 지금부터 쓸 수 있는 부천 테니스장 시간대를 바로 보여드려요.
            </p>
            <button
              type="button"
              onClick={checkAll}
              disabled={loadingAll || !userId}
              className="btn-clay mt-5 h-12 px-6 rounded-xl text-base inline-flex items-center gap-2 disabled:opacity-60"
            >
              <RefreshCw className={`w-5 h-5 ${loadingAll ? "animate-spin" : ""}`} />
              {loadingAll ? "확인하는 중..." : checked.length ? "다시 확인하기" : "지금 전체 확인하기"}
            </button>
          </div>
          <TennisMascot pose="search" className="w-24 sm:w-36 h-auto mascot-float" />
        </div>
        <div className="surface-band" />
      </section>

      <div className="max-w-3xl mx-auto px-4 mt-5">
        {ready && !userId && (
          <div className="surface rounded-2xl p-5 text-sm text-center">
            로그인하면 바로 확인할 수 있어요.{" "}
            <Link href="/login" className="font-bold underline text-court">로그인</Link>
          </div>
        )}

        {error && <p className="alert-danger rounded-xl p-3 text-sm mb-3">{error}</p>}

        {checkedAt && (
          <p className="text-xs text-ink-muted mb-3" aria-live="polite">
            {fmt(checkedAt)} 기준 · 오늘 자리가 있는 곳 <b className="text-court">{openCount}곳</b>
            <span className="block sm:inline"> (같은 시설은 3분 안에 다시 확인하면 직전 결과를 보여줘요)</span>
          </p>
        )}

        <ul className="space-y-3">
          {BUCHEON_COURTS.map((court) => {
            const r = results[court.facilityId];
            const busy = loadingAll || loadingId === court.facilityId;
            return (
              <li key={court.facilityId} className="surface rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-bold text-ink truncate">{court.name}</div>
                    {court.indoor && <div className="text-xs text-ink-muted">실내</div>}
                  </div>
                  <button
                    type="button"
                    onClick={() => checkOne(court.facilityId)}
                    disabled={busy || !userId}
                    className="btn-outline-court border-2 shrink-0 text-xs font-bold px-3 py-1.5 rounded-full disabled:opacity-60"
                  >
                    {busy ? "확인 중..." : r ? "다시 확인" : "지금 확인"}
                  </button>
                </div>

                {r && (
                  <div className="mt-3">
                    {!r.ok ? (
                      <p className="text-sm text-danger">{r.error}</p>
                    ) : r.times.length === 0 ? (
                      <p className="text-sm text-ink-muted">오늘 남은 시간대가 없어요.</p>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-ok mb-2">오늘 {r.times.length}개 시간대 가능해요</p>
                        <div className="flex flex-wrap gap-2">
                          {r.times.map((t) => (
                            <span key={t} className="badge-ok inline-flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-full">
                              <Clock className="w-3.5 h-3.5" /> {t}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <Link href="/mypage#court-watch" className="surface rounded-2xl p-4 mt-5 flex items-center gap-3">
          <Bell className="w-5 h-5 text-clay shrink-0" />
          <span className="text-sm">
            <b className="text-court">3시간마다 자동으로 확인</b>하고 알림받고 싶다면 알림 받을 테니스장을 골라 보세요.
          </span>
        </Link>
        <p className="text-xs text-ink-muted mt-3">예약은 부천시 공공서비스예약 사이트에서 직접 해야 해요. 여기서는 조회만 합니다.</p>
      </div>
    </div>
  );
}
