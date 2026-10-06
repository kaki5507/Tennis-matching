"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getAdminStats, getVisitStats, getRecentActivity, getMatchTimeStats } from "@/app/actions/admin";
import TennisLoader from "@/components/TennisLoader";
import MatchTimeHeatmap, { type TimeCell } from "@/components/MatchTimeHeatmap";

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

type VisitStats = Extract<Awaited<ReturnType<typeof getVisitStats>>, { success: true }>;
type Recent = Extract<Awaited<ReturnType<typeof getRecentActivity>>, { success: true }>;

const MATCH_STATUS: Record<string, string> = { OPEN: "모집중", FULL: "마감", COMPLETED: "완료", CANCELED: "취소" };

/** 일자별 막대 그래프 (값 위에 마우스를 올리면 날짜/수치 표시) */
function DailyBars({
  data,
  valueKey,
  unit,
  barClass,
}: {
  data: { date: string; visitors: number; pageViews: number; signups: number }[];
  valueKey: "visitors" | "pageViews" | "signups";
  unit: string;
  barClass: string;
}) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]));
  return (
    <>
      <div className="flex items-end gap-[2px] h-24">
        {data.map((d) => (
          <div
            key={d.date}
            title={`${d.date}: ${d[valueKey]}${unit}`}
            className={`flex-1 rounded-sm hover:opacity-70 ${barClass}`}
            style={{ height: `${Math.max(d[valueKey] === 0 ? 2 : 6, Math.round((d[valueKey] / max) * 100))}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-ink-muted mt-2">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="surface rounded-xl p-4">
      <div className="text-xs text-ink-muted mb-1">{label}</div>
      <div className="text-2xl heading">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface rounded-xl p-5">
      <h3 className="font-bold text-ink mb-3">{title}</h3>
      {children}
    </div>
  );
}

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-ink-muted mb-1">
        <span className="truncate max-w-[70%]">{label}</span>
        <span className="font-medium">{count}</span>
      </div>
      <div className="h-2 tint rounded-full overflow-hidden">
        <div className="h-full bg-court rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "denied" | "ok">("checking");
  const [stats, setStats] = useState<Stats | null>(null);
  const [visit, setVisit] = useState<VisitStats | null>(null);
  const [recent, setRecent] = useState<Recent | null>(null);
  const [timeCells, setTimeCells] = useState<{ days: number; total: number; cells: TimeCell[] } | null>(null);

  useEffect(() => {
    const load = async () => {
      // 서버가 토큰을 직접 검증하므로 userId가 아니라 로그인 토큰을 보냅니다.
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? null;
      if (!token) {
        router.push("/login");
        return;
      }

      const [statsResult, visitResult, recentResult, timeResult] = await Promise.all([
        getAdminStats(token),
        getVisitStats(token, 30),
        getRecentActivity(token),
        getMatchTimeStats(token, 90),
      ]);

      if (!statsResult.success) {
        setStatus("denied");
        return;
      }
      setStats(statsResult as unknown as Stats);
      if (visitResult.success) setVisit(visitResult);
      if (recentResult.success) setRecent(recentResult);
      if (timeResult.success) setTimeCells({ days: timeResult.days, total: timeResult.totalRooms, cells: timeResult.cells });
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
        <p className="text-ink-muted">관리자만 접근할 수 있는 페이지입니다.</p>
      </div>
    );
  }
  if (!stats) {
    return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-ink-muted">데이터를 불러오지 못했습니다.</div>;
  }

  const maxLevel = Math.max(1, ...stats.levelBreakdown.map((l) => l.count));
  const maxCourt = Math.max(1, ...stats.courtUsage.map((c) => c.count));
  const maxPath = Math.max(1, ...stats.pageViewsByPath.map((p) => p.count));
  const totalDeviceViews = stats.deviceBreakdown.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="min-h-screen page-bg py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl heading">🛠️ 관리자 대시보드</h1>
          <a
            href="/admin/tournaments/create"
            className="text-sm font-medium px-4 py-2 rounded-lg text-white bg-clay text-white"
          >
            🏆 대회 개설
          </a>
        </div>

        {/* 방문자 지표 (한국 시간 기준, 브라우저 단위 고유 방문자) */}
        {visit && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="오늘 방문자" value={visit.summary.visitorsToday.toLocaleString()} />
              <StatCard label="최근 7일 방문자" value={visit.summary.visitorsWeek.toLocaleString()} />
              <StatCard label="최근 30일 방문자" value={visit.summary.visitorsMonth.toLocaleString()} />
              <StatCard label="누적 방문자" value={visit.summary.visitorsTotal.toLocaleString()} />
              <StatCard label="오늘 페이지뷰" value={visit.summary.pageViewsToday.toLocaleString()} />
              <StatCard label="누적 페이지뷰" value={visit.summary.pageViewsTotal.toLocaleString()} />
            </div>
            <p className="text-[11px] text-ink-muted -mt-5">
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
                <span>0시</span>
                <span>6시</span>
                <span>12시</span>
                <span>18시</span>
                <span>23시</span>
              </div>
            </Panel>
          </>
        )}

        {timeCells && (
          <Panel title={`🎾 요일·시간대별 인기 경기 시간 (최근 ${timeCells.days}일 ~ 앞으로 30일, 경기 ${timeCells.total}개)`}>
            <MatchTimeHeatmap cells={timeCells.cells} />
          </Panel>
        )}

        {/* 핵심 지표 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="전체 회원" value={stats.users.total} />
          <StatCard label="오늘 가입" value={stats.users.today} />
          <StatCard label="최근 7일 가입" value={stats.users.week} />
          <StatCard label="이번 달 가입" value={stats.users.month} />
          <StatCard label="전체 매칭 수" value={stats.matches.total} />
          <StatCard label="완료된 경기" value={stats.matches.completed} />
          <StatCard label="모집 중인 방" value={stats.matches.open} />
        </div>

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
                  <span className="text-ink">{i + 1}. {u.nickname || "익명"}</span>
                  <span className="font-medium text-ink">{u.mannerScore.toFixed(1)}도</span>
                </li>
              ))}
            </ol>
          </Panel>

          {/* 전체 NTRP 랭킹 */}
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

          {/* 이번달 랭킹 */}
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

          {/* 기기 사용률 */}
          <Panel title="📱 모바일 vs PC 사용률">
            {totalDeviceViews === 0 ? (
              <p className="text-sm text-ink-muted">아직 방문 기록이 없어요.</p>
            ) : (
              <div className="space-y-3">
                {stats.deviceBreakdown.map((d) => {
                  const pct = Math.round((d.count / totalDeviceViews) * 100);
                  return (
                    <div key={d.device}>
                      <div className="flex justify-between text-xs text-ink-muted mb-1">
                        <span>{d.device === "mobile" ? "📱 모바일" : "💻 PC"}</span>
                        <span className="font-medium">{pct}% ({d.count}회)</span>
                      </div>
                      <div className="h-2 tint rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${d.device === "mobile" ? "bg-clay" : "bg-court"}`}
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

        {/* 최근 활동 */}
        {recent && (
          <div className="grid md:grid-cols-2 gap-6">
            <Panel title="🆕 최근 가입 회원">
              <ul className="space-y-1 text-sm">
                {recent.users.map((u) => (
                  <li key={u.id}>
                    <Link
                      href={`/admin/users?q=${u.id}`}
                      className="row-link flex justify-between items-center rounded-lg px-2 py-1.5"
                    >
                      <span className="truncate">
                        {u.nickname}
                        {u.isBanned && <span className="badge-live ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full">정지</span>}
                      </span>
                      <span className="text-xs text-ink-muted shrink-0">
                        {u.tennisLevel} · {new Date(u.createdAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" })}
                      </span>
                    </Link>
                  </li>
                ))}
                {recent.users.length === 0 && <p className="text-sm text-ink-muted">아직 회원이 없어요.</p>}
              </ul>
              <Link href="/admin/users" className="block text-xs font-bold underline text-court mt-3">회원 전체 보기 →</Link>
            </Panel>

            <Panel title="🎾 최근 개설된 방">
              <ul className="space-y-1 text-sm">
                {recent.matches.map((m) => (
                  <li key={m.id}>
                    <Link href={`/matches/${m.id}`} className="row-link flex justify-between items-center rounded-lg px-2 py-1.5">
                      <span className="truncate">
                        {m.courtName} · {m.gameType}
                        <span className="text-xs text-ink-muted"> · {m.hostNickname}</span>
                      </span>
                      <span className="text-xs text-ink-muted shrink-0">{MATCH_STATUS[m.status] ?? m.status}</span>
                    </Link>
                  </li>
                ))}
                {recent.matches.length === 0 && <p className="text-sm text-ink-muted">아직 개설된 방이 없어요.</p>}
              </ul>
            </Panel>
          </div>
        )}

        {/* 메뉴별 방문 통계 (개선사항 파악용) */}
        <Panel title="🔍 많이 방문한 페이지 Top 15 (개선 우선순위 참고용)">
          {stats.pageViewsByPath.length === 0 ? (
            <p className="text-sm text-ink-muted">아직 방문 기록이 없어요.</p>
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
