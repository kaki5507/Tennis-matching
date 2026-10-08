"use client";

// 관리자 대시보드(첫 화면): 핵심 숫자 + 최근 활동만 가볍게 보여주고,
// 무거운 통계는 메뉴별 화면(방문 통계 / 매칭 분석 / 랭킹·분포)으로 나눠 두었습니다.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/authToken";
import { getAdminOverview, getRecentActivity } from "@/app/actions/admin";
import { AdminGate, Panel, PanelSkeleton, StatCard, type GateStatus } from "@/components/admin/AdminUi";

type Overview = Extract<Awaited<ReturnType<typeof getAdminOverview>>, { success: true }>;
type Recent = Extract<Awaited<ReturnType<typeof getRecentActivity>>, { success: true }>;

const MATCH_STATUS: Record<string, string> = { OPEN: "모집중", FULL: "마감", COMPLETED: "완료", CANCELED: "취소" };

const SHORTCUTS = [
  { href: "/admin/traffic", emoji: "👀", title: "방문 통계", desc: "방문자·가입 추이, 인기 페이지, 기기 비율" },
  { href: "/admin/matches", emoji: "🎾", title: "매칭 분석", desc: "지역·코트별 추이, 인기 경기 시간" },
  { href: "/admin/ranking", emoji: "🏆", title: "랭킹 · 분포", desc: "레벨 분포, 매너·실력·승수 랭킹" },
  { href: "/admin/users", emoji: "👥", title: "회원 관리", desc: "검색, 정지·해제" },
  { href: "/admin/tournaments/create", emoji: "🥇", title: "대회 개설", desc: "새 대회 만들기" },
  { href: "/courts", emoji: "🗓️", title: "빈 코트 수집", desc: "ON/OFF, 지금 갱신" },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [status, setStatus] = useState<GateStatus>("checking");
  const [ov, setOv] = useState<Overview | null>(null);
  const [recent, setRecent] = useState<Recent | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (!token) return router.push("/login");
      getAdminOverview(token).then((r) => {
        if (!r.success) return setStatus("denied");
        setOv(r);
        setStatus("ok");
      });
      getRecentActivity(token).then((r) => r.success && setRecent(r));
    })();
  }, [router]);

  return (
    <AdminGate status={status}>
      <div className="min-h-screen page-bg py-8 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <h1 className="text-2xl heading">🛠️ 관리자 대시보드</h1>

          {ov && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="전체 회원" value={ov.users.total} />
              <StatCard label="오늘 가입" value={ov.users.today} />
              <StatCard label="최근 7일 가입" value={ov.users.week} />
              <StatCard label="이번 달 가입" value={ov.users.month} />
              <StatCard label="전체 매칭 수" value={ov.matches.total} />
              <StatCard label="완료된 경기" value={ov.matches.completed} />
              <StatCard label="모집 중인 방" value={ov.matches.open} />
            </div>
          )}

          {/* 메뉴별 바로가기 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {SHORTCUTS.map((s) => (
              <Link key={s.href} href={s.href} className="card-link surface rounded-xl p-4 block">
                <div className="font-extrabold text-court">{s.emoji} {s.title}</div>
                <div className="text-xs text-ink-muted mt-1">{s.desc}</div>
              </Link>
            ))}
          </div>

          {/* 최근 활동 */}
          {!recent ? (
            <PanelSkeleton h="h-40" />
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <Panel title="🆕 최근 가입 회원">
                <ul className="space-y-1 text-sm">
                  {recent.users.map((u) => (
                    <li key={u.id}>
                      <Link href={`/admin/users?q=${u.id}`} className="row-link flex justify-between items-center rounded-lg px-2 py-1.5">
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
        </div>
      </div>
    </AdminGate>
  );
}
