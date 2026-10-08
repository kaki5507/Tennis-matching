"use client";

// 관리자 · 매칭 분석: 지역·코트별 주간 추이, 요일·시간대별 인기 경기 시간
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/authToken";
import { getMatchTimeStats, getMatchTrend } from "@/app/actions/admin";
import MatchTrend, { type TrendRow } from "@/components/MatchTrend";
import MatchTimeHeatmap, { type TimeCell } from "@/components/MatchTimeHeatmap";
import { AdminGate, Panel, PanelSkeleton, type GateStatus } from "@/components/admin/AdminUi";

export default function AdminMatchesPage() {
  const router = useRouter();
  const [status, setStatus] = useState<GateStatus>("checking");
  const [trend, setTrend] = useState<{ weeks: string[]; weekTotals: number[]; regions: TrendRow[]; courts: TrendRow[] } | null>(null);
  const [timeCells, setTimeCells] = useState<{ days: number; total: number; cells: TimeCell[] } | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (!token) return router.push("/login");
      getMatchTrend(token, 12).then((r) => {
        if (!r.success) return setStatus("denied");
        setTrend(r);
        setStatus("ok");
      });
      getMatchTimeStats(token, 90).then((r) => r.success && setTimeCells({ days: r.days, total: r.totalRooms, cells: r.cells }));
    })();
  }, [router]);

  return (
    <AdminGate status={status}>
      <div className="min-h-screen page-bg py-8 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <h1 className="text-2xl heading">🎾 매칭 분석</h1>
          {trend && (
            <Panel title="📊 지역·코트별 주간 매칭 수 추이 (최근 12주)">
              <MatchTrend weeks={trend.weeks} weekTotals={trend.weekTotals} regions={trend.regions} courts={trend.courts} />
            </Panel>
          )}
          {timeCells ? (
            <Panel title={`🎾 요일·시간대별 인기 경기 시간 (최근 ${timeCells.days}일 ~ 앞으로 30일, 경기 ${timeCells.total}개)`}>
              <MatchTimeHeatmap cells={timeCells.cells} />
            </Panel>
          ) : (
            <PanelSkeleton h="h-48" />
          )}
        </div>
      </div>
    </AdminGate>
  );
}
