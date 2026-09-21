"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isAdmin, getAdminStats, getSignupTrend } from "@/app/actions/admin";
import TennisLoader from "@/components/TennisLoader";

interface Stats {
  users: { total: number; today: number; week: number; month: number };
  matches: { total: number; completed: number; open: number };
  levelBreakdown: { level: string; count: number }[];
  courtUsage: { courtName: string; count: number }[];
  mannerRanking: { nickname: string | null; mannerScore: number }[];
  ntrpRanking: { nickname: string | null; ntrpScore: number | null; ntrpCount: number }[];
  monthlyWinRanking: { nickname: string | null; wins: number }[];
  pageViewsByPath: { path: string; count: number }[];
  deviceBreakdown: { device: string; count: number }[];
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="font-bold text-slate-900 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-slate-600 mb-1">
        <span className="truncate max-w-[70%]">{label}</span>
        <span className="font-medium">{count}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "denied" | "ok">("checking");
  const [stats, setStats] = useState<Stats | null>(null);
  const [signupTrend, setSignupTrend] = useState<{ date: string; count: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
        return;
      }

      const admin = await isAdmin(data.user.id);
      if (!admin) {
        setStatus("denied");
        return;
      }

      const [statsResult, trendResult] = await Promise.all([
        getAdminStats(data.user.id),
        getSignupTrend(data.user.id, 30),
      ]);

      if (statsResult.success) setStats(statsResult as unknown as Stats);
      if (trendResult.success) setSignupTrend(trendResult.trend);
      setStatus("ok");
    };
    load();
  }, [router]);

  if (status === "checking") {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <TennisLoader label="권한 확인 중..." />
      </div>
    );
  }
  if (status === "denied") {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <p className="text-slate-500">관리자만 접근할 수 있는 페이지입니다.</p>
      </div>
    );
  }
  if (!stats) {
    return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-slate-500">데이터를 불러오지 못했습니다.</div>;
  }

  const maxLevel = Math.max(1, ...stats.levelBreakdown.map((l) => l.count));
  const maxCourt = Math.max(1, ...stats.courtUsage.map((c) => c.count));
  const maxPath = Math.max(1, ...stats.pageViewsByPath.map((p) => p.count));
  const totalDeviceViews = stats.deviceBreakdown.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900">🛠️ 관리자 대시보드</h1>
          <a
            href="/admin/tournaments/create"
            className="text-sm font-medium px-4 py-2 rounded-lg text-white"
            style={{ background: "var(--clay)" }}
          >
            🏆 대회 개설
          </a>
        </div>

        {/* 핵심 지표 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="전체 회원" value={stats.users.total} />
          <StatCard label="오늘 가입" value={stats.users.today} />
          <StatCard label="이번 주 가입" value={stats.users.week} />
          <StatCard label="이번 달 가입" value={stats.users.month} />
          <StatCard label="전체 매칭 수" value={stats.matches.total} />
          <StatCard label="완료된 경기" value={stats.matches.completed} />
          <StatCard label="모집 중인 방" value={stats.matches.open} />
        </div>

        {/* 가입자 추이 (최근 30일) */}
        <Panel title="📈 최근 30일 가입자 추이">
          <div className="flex items-end gap-[2px] h-24">
            {signupTrend.map((d) => {
              const max = Math.max(1, ...signupTrend.map((t) => t.count));
              const heightPct = Math.max(4, Math.round((d.count / max) * 100));
              return (
                <div
                  key={d.date}
                  title={`${d.date}: ${d.count}명`}
                  className="flex-1 bg-indigo-400 rounded-sm hover:bg-indigo-600"
                  style={{ height: `${heightPct}%` }}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-2">
            <span>{signupTrend[0]?.date}</span>
            <span>{signupTrend[signupTrend.length - 1]?.date}</span>
          </div>
        </Panel>

        <div className="grid md:grid-cols-2 gap-6">
          {/* 레벨별 인원 */}
          <Panel title="🎾 레벨별 회원 분포">
            {stats.levelBreakdown.map((l) => (
              <BarRow key={l.level ?? "미설정"} label={l.level ?? "미설정"} count={l.count} max={maxLevel} />
            ))}
          </Panel>

          {/* 코트별 이용 */}
          <Panel title="📍 많이 이용된 테니스장 Top 10">
            {stats.courtUsage.map((c) => (
              <BarRow key={c.courtName} label={c.courtName} count={c.count} max={maxCourt} />
            ))}
          </Panel>

          {/* 매너 랭킹 */}
          <Panel title="🌡️ 매너 온도 랭킹 Top 10">
            <ol className="space-y-1.5 text-sm">
              {stats.mannerRanking.map((u, i) => (
                <li key={i} className="flex justify-between">
                  <span className="text-slate-700">{i + 1}. {u.nickname || "익명"}</span>
                  <span className="font-medium text-slate-900">{u.mannerScore.toFixed(1)}도</span>
                </li>
              ))}
            </ol>
          </Panel>

          {/* 전체 NTRP 랭킹 */}
          <Panel title="🏆 전체 실력(NTRP) 랭킹 Top 10">
            <ol className="space-y-1.5 text-sm">
              {stats.ntrpRanking.map((u, i) => (
                <li key={i} className="flex justify-between">
                  <span className="text-slate-700">{i + 1}. {u.nickname || "익명"}</span>
                  <span className="font-medium text-slate-900">
                    {u.ntrpScore?.toFixed(1)} <span className="text-slate-400">({u.ntrpCount}회)</span>
                  </span>
                </li>
              ))}
            </ol>
          </Panel>

          {/* 이번달 랭킹 */}
          <Panel title="🥇 이번 달 승수 랭킹 Top 10">
            {stats.monthlyWinRanking.length === 0 ? (
              <p className="text-sm text-slate-400">이번 달 집계된 승수가 아직 없어요.</p>
            ) : (
              <ol className="space-y-1.5 text-sm">
                {stats.monthlyWinRanking.map((u, i) => (
                  <li key={i} className="flex justify-between">
                    <span className="text-slate-700">{i + 1}. {u.nickname || "익명"}</span>
                    <span className="font-medium text-slate-900">{u.wins}승</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          {/* 기기 사용률 */}
          <Panel title="📱 모바일 vs PC 사용률">
            {totalDeviceViews === 0 ? (
              <p className="text-sm text-slate-400">아직 방문 기록이 없어요.</p>
            ) : (
              <div className="space-y-3">
                {stats.deviceBreakdown.map((d) => {
                  const pct = Math.round((d.count / totalDeviceViews) * 100);
                  return (
                    <div key={d.device}>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span>{d.device === "mobile" ? "📱 모바일" : "💻 PC"}</span>
                        <span className="font-medium">{pct}% ({d.count}회)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${d.device === "mobile" ? "bg-green-500" : "bg-blue-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>

        {/* 메뉴별 방문 통계 (개선사항 파악용) */}
        <Panel title="🔍 많이 방문한 페이지 Top 15 (개선 우선순위 참고용)">
          {stats.pageViewsByPath.length === 0 ? (
            <p className="text-sm text-slate-400">아직 방문 기록이 없어요.</p>
          ) : (
            stats.pageViewsByPath.map((p) => (
              <BarRow key={p.path} label={p.path} count={p.count} max={maxPath} />
            ))
          )}
        </Panel>
      </div>
    </div>
  );
}
