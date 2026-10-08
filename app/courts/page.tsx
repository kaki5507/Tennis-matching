"use client";

// app/courts/page.tsx
// 메인 기능: 부천 테니스장 빈 코트 찾기. 당일 예약은 안 되므로 내일부터 (내일 / 7일 / 이번 달) 가능한 날짜·시간대를 보여줍니다.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw, Bell, Clock } from "lucide-react";
import { BUCHEON_COURTS } from "@/lib/bucheonCourts";
import { getCourtRange } from "@/app/actions/courtNow";
import type { CourtRangeResult, RangeKey } from "@/lib/courtToday";
import { getAccessToken } from "@/lib/authToken";
import { useAuthUser } from "@/lib/useAuthUser";
import TennisMascot from "@/components/TennisMascot";
import { dayKind } from "@/lib/koHolidays";
import CourtCrawlAdmin from "@/components/CourtCrawlAdmin";

const RANGES: { key: RangeKey; label: string; hint: string }[] = [
  { key: "tomorrow", label: "내일", hint: "내일 가능한 시간" },
  { key: "week", label: "7일", hint: "내일부터 7일" },
  { key: "month", label: "이번 달", hint: "이번 달 남은 날" },
];

const fmt = (iso: string) => new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" });
const isAm = (t: string) => Number(t.slice(0, 2)) < 12;

type Bucket = { results: CourtRangeResult[]; updatedAt: string | null; rangeLabel: string; truncated: boolean; loaded: boolean };
const EMPTY: Bucket = { results: [], updatedAt: null, rangeLabel: "", truncated: false, loaded: false };

/** "방금 전 / 12분 전 / 3시간 전 / 어제 ..." */
function ago(iso: string, now: number) {
  const min = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h}시간 ${min % 60}분 전` : `${Math.floor(h / 24)}일 전`;
}

function TimeChip({ t }: { t: string }) {
  return (
    <span className={`${isAm(t) ? "time-am" : "time-pm"} inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full`}>
      <Clock className="w-3 h-3" /> {t}
    </span>
  );
}

export default function CourtsPage() {
  const { ready, userId } = useAuthUser();
  const [range, setRange] = useState<RangeKey>("tomorrow");
  // 범위마다 따로 기억 (탭을 바꿨다 돌아와도 유지). 데이터는 DB에 저장된 수집본이라 불러오는 건 가볍고 빨라요.
  const [buckets, setBuckets] = useState<Record<RangeKey, Bucket>>({ tomorrow: EMPTY, week: EMPTY, month: EMPTY });
  const [loading, setLoading] = useState<RangeKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // "N분 전" 표시를 30초마다 갱신
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async (r: RangeKey) => {
    setLoading(r);
    setError(null);
    const res = await getCourtRange(await getAccessToken(), r, null);
    if (res.success) {
      setBuckets((prev) => ({ ...prev, [r]: { results: res.results, updatedAt: res.updatedAt, rangeLabel: res.rangeLabel, truncated: res.truncated, loaded: true } }));
    } else setError(res.error);
    setLoading(null);
    setNow(Date.now());
  }, []);

  // 로그인 후 / 탭을 바꿀 때 처음 한 번 자동으로 불러오기
  useEffect(() => {
    if (!userId || buckets[range].loaded) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(range);
  }, [userId, range, buckets, load]);

  const bucket = buckets[range];

  // 날짜별 정리: 날짜 → 코트 → 시간대
  const byDate = useMemo(() => {
    const map = new Map<string, { label: string; courts: { name: string; times: string[] }[] }>();
    for (const r of bucket.results) {
      if (!r.ok) continue;
      for (const d of r.days) {
        const e = map.get(d.date) ?? { label: d.label, courts: [] };
        e.courts.push({ name: r.name, times: d.times });
        map.set(d.date, e);
      }
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [bucket.results]);

  const checkedCount = bucket.results.filter((r) => r.ok).length;

  return (
    <div className="min-h-screen page-bg pb-16 pt-4">
      <section className="hero-blue relative overflow-hidden max-w-3xl mx-auto rounded-3xl">
        <div className="px-6 pt-7 pb-8 grid grid-cols-[1fr_auto] items-center gap-2">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl leading-tight text-white">빈 코트 찾기</h1>
            <p className="mt-2 text-sm sm:text-base text-white/85">
              당일 예약은 안 돼요. 내일부터 쓸 수 있는 부천 테니스장 시간을 모아서 보여드려요.
            </p>
          </div>
          <TennisMascot pose="search" className="w-24 sm:w-36 h-auto mascot-float" />
        </div>
        <div className="surface-band" />
      </section>

      <div className="max-w-3xl mx-auto px-4 mt-5">
        {ready && !userId && (
          <div className="surface rounded-2xl p-5 text-sm text-center mb-4">
            로그인하면 바로 확인할 수 있어요.{" "}
            <Link href="/login" className="font-bold underline text-court">로그인</Link>
          </div>
        )}

        <CourtCrawlAdmin onRefreshed={() => load(range)} />

        {/* 범위 선택 */}
        <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="검색 범위">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              role="tab"
              aria-selected={range === r.key}
              onClick={() => setRange(r.key)}
              className={`py-2.5 rounded-xl text-sm font-extrabold border ${range === r.key ? "chip-on border-transparent" : "surface border-line chip-off-court"}`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* 마지막 갱신 시각: 모든 사용자가 같은 저장본을 봐요 */}
        <div className="surface rounded-xl mt-3 px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink">
              {bucket.updatedAt ? (
                <>🕘 <span className="text-court">{ago(bucket.updatedAt, now)}</span> 갱신</>
              ) : loading ? "불러오는 중..." : "아직 수집된 정보가 없어요"}
            </p>
            <p className="text-xs text-ink-muted mt-0.5">1시간마다 자동 갱신 · 정보는 저장된 수집본이에요</p>
          </div>
          <button
            type="button"
            onClick={() => load(range)}
            disabled={loading !== null || !userId}
            className="btn-outline-court border-2 shrink-0 text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1 disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            새로고침
          </button>
        </div>

        {error && <p className="alert-danger rounded-xl p-3 text-sm mt-3">{error}</p>}

        {/* 시간 색 안내 */}
        <div className="flex items-center gap-2 mt-4 text-xs text-ink-muted">
          <span className="time-am px-2 py-0.5 rounded-full font-bold">오전</span>
          <span className="time-pm px-2 py-0.5 rounded-full font-bold">오후</span>
          <span>시간대 색으로 구분해요</span>
          <span className="off-day-head px-2 py-0.5 rounded-full font-bold ml-auto">🔥 쉬는 날</span>
        </div>

        {/* 날짜별 정리 */}
        {bucket.loaded && (
          <section className="mt-3" aria-live="polite">
            <p className="text-xs text-ink-muted mb-2">
              {bucket.rangeLabel} · {checkedCount}곳 조회 · 가능한 날 <b className="text-court">{byDate.length}일</b>
            </p>
            {bucket.truncated && range !== "tomorrow" && (
              <p className="text-xs text-warn mb-2">예약 사이트 달력이 이번 달만 보여서, 다음 달 날짜는 빠져 있어요.</p>
            )}
            {byDate.length === 0 ? (
              <div className="surface rounded-2xl p-5 text-sm text-ink-muted text-center">
                {bucket.updatedAt ? "조회한 범위에 가능한 시간대가 없어요." : "아직 수집 전이에요. 첫 수집이 끝나면 여기에 나타나요."}
              </div>
            ) : (
              <ul className="space-y-3">
                {byDate.map(([date, d]) => {
                  const k = dayKind(date);
                  const off = k.kind !== "weekday";
                  return (
                  <li key={date} className={`surface rounded-2xl overflow-hidden ${off ? "off-day-card" : ""}`}>
                    <div className={`px-4 py-2 font-extrabold text-sm flex items-center justify-between gap-2 ${off ? "off-day-head" : "bg-court-solid"}`}>
                      <span>{d.label}</span>
                      {off && (
                        <span className="text-[11px] font-extrabold bg-white/95 text-clay rounded-full px-2.5 py-0.5">
                          🔥 {k.kind === "holiday" ? `공휴일 · ${k.name}` : "주말"} · 경쟁 치열
                        </span>
                      )}
                    </div>
                    <ul className="divide-y divide-line">
                      {d.courts.map((c) => (
                        <li key={c.name} className="px-4 py-3">
                          <div className="text-sm font-bold text-ink mb-1.5">{c.name}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {c.times.map((t) => <TimeChip key={t} t={t} />)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {/* 코트별 요약 */}
        {bucket.loaded && (
          <>
            <h2 className="mt-6 mb-2 text-sm font-extrabold text-court">코트별 요약</h2>
            <ul className="space-y-2">
              {bucket.results.map((r) => (
                <li key={r.facilityId} className="surface rounded-xl px-4 py-3">
                  <div className="font-bold text-sm text-ink truncate">{r.name}</div>
                  <div className={`text-xs mt-0.5 ${r.ok && r.days.length ? "text-ok font-bold" : r.ok ? "text-ink-muted" : "text-danger"}`}>
                    {!r.ok ? r.error : !r.updatedAt ? "수집 전" : r.days.length === 0 ? "가능한 시간대 없음" : `${r.days.length}일 가능 · 가장 빠른 날 ${r.days[0].label}`}
                    {r.ok && r.updatedAt ? ` · ${ago(r.updatedAt, now)} 갱신` : ""}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        <Link href="/mypage#court-watch" className="surface rounded-2xl p-4 mt-5 flex items-center gap-3">
          <Bell className="w-5 h-5 text-clay shrink-0" />
          <span className="text-sm">
            <b className="text-court">3시간마다 자동으로 확인</b>하고 알림받고 싶다면 알림 받을 테니스장을 골라 보세요.
          </span>
        </Link>
        <p className="text-xs text-ink-muted mt-3">예약은 부천시 공공서비스예약 사이트에서 직접 해야 해요. 여기서는 조회만 합니다. (여기 보이는 정보는 저장된 수집본이라 사용자가 눌러도 예약 사이트에는 요청이 가지 않아요)</p>
      </div>
    </div>
  );
}
