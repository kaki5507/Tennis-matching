"use client";

// 관리자 · 방문 통계: 방문자/페이지뷰/가입 추이, 시간대, 많이 방문한 페이지 (최근 30일), 기기 비율
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/authToken";
import { getVisitStats, getPageStats } from "@/app/actions/admin";
import { AdminGate, BarRow, DailyBars, Panel, PanelSkeleton, StatCard, type GateStatus } from "@/components/admin/AdminUi";

type VisitStats = Extract<Awaited<ReturnType<typeof getVisitStats>>, { success: true }>;
type PageStats = Extract<Awaited<ReturnType<typeof getPageStats>>, { success: true }>;

export default function AdminTrafficPage() {
  const router = useRouter();
  const [status, setStatus] = useState<GateStatus>("checking");
  const [visit, setVisit] = useState<VisitStats | null>(null);
  const [pages, setPages] = useState<PageStats | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (!token) return router.push("/login");
      getVisitStats(token, 30).then((r) => {
        if (!r.success) return setStatus("denied");
        setVisit(r);
        setStatus("ok");
      });
      getPageStats(token).then((r) => r.success && setPages(r));
    })();
  }, [router]);

  const maxPath = Math.max(1, ...(pages?.pageViewsByPath ?? []).map((p) => p.count));
  const totalDevice = (pages?.deviceBreakdown ?? []).reduce((sum, d) => sum + d.count, 0);

  return (
    <AdminGate status={status}>
      <div className="min-h-screen page-bg py-8 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <h1 className="text-2xl heading">👀 방문 통계</h1>

          {visit && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatCard label="오늘 방문자" value={visit.summary.visitorsToday.toLocaleString()} />
                <StatCard label="최근 7일 방문자" value={visit.summary.visitorsWeek.toLocaleString()} />
                <StatCard label="최근 30일 방문자" value={visit.summary.visitorsMonth.toLocaleString()} />
                <StatCard label="누적 방문자" value={visit.summary.visitorsTotal.toLocaleString()} />
                <StatCard label="오늘 페이지뷰" value={visit.summary.pageViewsToday.toLocaleString()} />
                <StatCard label="누적 페이지뷰" value={visit.summary.pageViewsTotal.toLocaleString()} />
              </div>
              <p className="text-[11px] text-ink-muted -mt-3">
                방문자는 브라우저(또는 로그인 계정) 기준 고유 수이며, 방문자 집계 도입 이전의 비로그인 기록은 포함되지 않아요.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <Panel title="👀 일별 방문자 (최근 30일)">
                  <DailyBars data={visit.series} valueKey="visitors" unit="명" barClass="bg-court" />
                </Panel>
                <Panel title="📈 일별 가입자 (최근 30일)">
                  <DailyBars data={visit.series} valueKey="signups" unit="명" barClass="bg-clay" />
                </Panel>
              </div>

              <Panel title="🕐 시간대별 방문 (최근 30일, 한국 시간)">
                <div className="flex items-end gap-1 h-24">
                  {visit.hourly.map((h) => {
                    const max = Math.max(1, ...visit.hourly.map((x) => x.pageViews));
                    return (
                      <div
                        key={h.hour}
                        title={`${h.hour}시: ${h.pageViews}회`}
                        className="flex-1 rounded-sm bg-ball hover:opacity-70"
                        style={{ height: `${Math.max(h.pageViews === 0 ? 2 : 6, Math.round((h.pageViews / max) * 100))}%` }}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-ink-muted mt-2">
                  <span>0시</span><span>6시</span><span>12시</span><span>18시</span><span>23시</span>
                </div>
              </Panel>
            </>
          )}

          {!pages ? (
            <PanelSkeleton />
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <Panel title="🔍 많이 방문한 페이지 (최근 30일) Top 15">
                {pages.pageViewsByPath.length === 0 ? (
                  <p className="text-sm text-ink-muted">아직 방문 기록이 없어요.</p>
                ) : (
                  pages.pageViewsByPath.map((p) => <BarRow key={p.path} label={p.path} count={p.count} max={maxPath} />)
                )}
              </Panel>
              <Panel title="📱 모바일 vs PC 사용률">
                {totalDevice === 0 ? (
                  <p className="text-sm text-ink-muted">아직 방문 기록이 없어요.</p>
                ) : (
                  <div className="space-y-3">
                    {pages.deviceBreakdown.map((d) => {
                      const pct = Math.round((d.count / totalDevice) * 100);
                      return (
                        <div key={d.device}>
                          <div className="flex justify-between text-xs text-ink-muted mb-1">
                            <span>{d.device === "mobile" ? "📱 모바일" : "💻 PC"}</span>
                            <span className="font-medium">{pct}% ({d.count}회)</span>
                          </div>
                          <div className="h-2 tint rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${d.device === "mobile" ? "bg-clay" : "bg-court"}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Panel>
            </div>
          )}
        </div>
      </div>
    </AdminGate>
  );
}
