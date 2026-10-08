"use client";

// 관리자 · 랭킹·분포: 레벨 분포, 인기 테니스장, 매너/NTRP/승수 랭킹
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/authToken";
import { getAdminStats } from "@/app/actions/admin";
import { AdminGate, BarRow, Panel, type GateStatus } from "@/components/admin/AdminUi";

type Stats = Extract<Awaited<ReturnType<typeof getAdminStats>>, { success: true }>;

export default function AdminRankingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<GateStatus>("checking");
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (!token) return router.push("/login");
      const r = await getAdminStats(token);
      if (!r.success) return setStatus("denied");
      setStats(r as Stats);
      setStatus("ok");
    })();
  }, [router]);

  const maxLevel = Math.max(1, ...(stats?.levelBreakdown ?? []).map((l) => l.count));
  const maxCourt = Math.max(1, ...(stats?.courtUsage ?? []).map((c) => c.count));

  return (
    <AdminGate status={status}>
      {stats && (
        <div className="min-h-screen page-bg py-8 px-4">
          <div className="max-w-5xl mx-auto space-y-6">
            <h1 className="text-2xl heading">🏆 랭킹 · 분포</h1>
            <div className="grid md:grid-cols-2 gap-6">
              <Panel title="🎾 레벨별 회원 분포">
                {stats.levelBreakdown.map((l) => (
                  <BarRow key={l.level ?? "미설정"} label={l.level ?? "미설정"} count={l.count} max={maxLevel} />
                ))}
              </Panel>
              <Panel title="📍 많이 이용된 테니스장 Top 10">
                {stats.courtUsage.map((c) => (
                  <BarRow key={c.courtName} label={c.courtName} count={c.count} max={maxCourt} />
                ))}
              </Panel>
              <Panel title="🌡️ 매너 온도 랭킹 Top 10">
                <ol className="space-y-1.5 text-sm">
                  {stats.mannerRanking.map((u, i) => (
                    <li key={i} className="flex justify-between">
                      <span className="text-ink">{i + 1}. {u.nickname || "익명"}</span>
                      <span className="font-medium text-ink">{u.mannerScore.toFixed(1)}도</span>
                    </li>
                  ))}
                </ol>
              </Panel>
              <Panel title="🏆 전체 실력(NTRP) 랭킹 Top 10">
                <ol className="space-y-1.5 text-sm">
                  {stats.ntrpRanking.map((u, i) => (
                    <li key={i} className="flex justify-between">
                      <span className="text-ink">{i + 1}. {u.nickname || "익명"}</span>
                      <span className="font-medium text-ink">
                        {u.ntrpScore?.toFixed(1)} <span className="text-ink-muted">({u.ntrpCount}회)</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </Panel>
              <Panel title="🥇 이번 달 승수 랭킹 Top 10">
                {stats.monthlyWinRanking.length === 0 ? (
                  <p className="text-sm text-ink-muted">이번 달 집계된 승수가 아직 없어요.</p>
                ) : (
                  <ol className="space-y-1.5 text-sm">
                    {stats.monthlyWinRanking.map((u, i) => (
                      <li key={i} className="flex justify-between">
                        <span className="text-ink">{i + 1}. {u.nickname || "익명"}</span>
                        <span className="font-medium text-ink">{u.wins}승</span>
                      </li>
                    ))}
                  </ol>
                )}
              </Panel>
            </div>
          </div>
        </div>
      )}
    </AdminGate>
  );
}
