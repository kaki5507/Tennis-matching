// app/actions/admin.ts
"use server"

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/tournamentData"
import { requireAdmin } from "@/lib/adminAuth"
import { regionOf } from "@/lib/region"

/** 화면 표시용: 이 로그인 토큰의 주인이 관리자인지 (서버가 토큰을 직접 검증). 실제 권한 검사는 각 액션이 따로 합니다. */
export async function checkAdminAccess(accessToken: string | null): Promise<boolean> {
  const auth = await requireAdmin(accessToken)
  return auth.ok
}

// 모든 날짜 집계는 한국 시간(KST) 기준 "하루"로 계산합니다. (서버는 UTC라 그냥 쓰면 9시간 어긋남)
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/** KST 기준 n일 전 00:00 (UTC Date로 반환). 0이면 오늘 0시 */
function kstDayStart(daysBack: number) {
  const k = new Date(Date.now() + KST_OFFSET_MS)
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate() - daysBack) - KST_OFFSET_MS)
}
function kstMonthStart() {
  const k = new Date(Date.now() + KST_OFFSET_MS)
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), 1) - KST_OFFSET_MS)
}
function kstDateKey(d: Date) {
  return new Date(d.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10)
}

/**
 * 관리자 대시보드에 필요한 모든 통계를 한 번에 모아서 반환합니다.
 * 로그인 토큰을 서버에서 검증해 관리자인지 확인합니다. (requireAdmin)
 */
export async function getAdminStats(accessToken: string | null) {
  const auth = await requireAdmin(accessToken)
  if (!auth.ok) {
    return { success: false, error: auth.error }
  }

  const startOfThisMonth = kstMonthStart()

  const [
    totalUsers,
    signupsToday,
    signupsThisWeek,
    signupsThisMonth,
    totalMatches,
    completedMatches,
    openMatches,
    levelBreakdown,
    courtUsage,
    mannerRanking,
    ntrpRanking,
    monthlyWinRanking,
    pageViewsByPath,
    deviceBreakdown,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { createdAt: { gte: kstDayStart(0) } } }),
    prisma.user.count({ where: { createdAt: { gte: kstDayStart(6) } } }),
    prisma.user.count({ where: { createdAt: { gte: startOfThisMonth } } }),
    prisma.match.count(),
    prisma.match.count({ where: { status: "COMPLETED" } }),
    prisma.match.count({ where: { status: "OPEN" } }),
    prisma.user.groupBy({ by: ["tennisLevel"], where: { deletedAt: null }, _count: true }),
    prisma.match.groupBy({
      by: ["courtId"],
      _count: true,
      orderBy: { _count: { courtId: "desc" } },
      take: 10,
    }),
    prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { mannerScore: "desc" },
      take: 10,
      select: { id: true, nickname: true, mannerScore: true },
    }),
    prisma.user.findMany({
      where: { deletedAt: null, ntrpCount: { gte: 3 } },
      orderBy: { ntrpScore: "desc" },
      take: 10,
      select: { id: true, nickname: true, ntrpScore: true, ntrpCount: true },
    }),
    // 이번 달 승수 랭킹: 이번 달 완료된 매칭에 대한 평가 중 WIN을 가장 많이 받은 유저
    prisma.evaluation.groupBy({
      by: ["evaluateeId"],
      where: { winLoss: "WIN", createdAt: { gte: startOfThisMonth } },
      _count: true,
      orderBy: { _count: { evaluateeId: "desc" } },
      take: 10,
    }),
    prisma.pageView.groupBy({
      by: ["path"],
      _count: true,
      orderBy: { _count: { path: "desc" } },
      take: 15,
    }),
    prisma.pageView.groupBy({ by: ["device"], _count: true }),
  ])

  // 코트 이름 매핑 (courtUsage는 courtId만 주므로 별도 조회)
  const courtIds = courtUsage.map((c) => c.courtId)
  const courts = await prisma.court.findMany({ where: { id: { in: courtIds } }, select: { id: true, name: true } })
  const courtNameMap = new Map(courts.map((c) => [c.id, c.name]))

  // 월간 랭킹의 유저 닉네임 매핑
  const winnerIds = monthlyWinRanking.map((w) => w.evaluateeId)
  const winners = await prisma.user.findMany({ where: { id: { in: winnerIds } }, select: { id: true, nickname: true } })
  const winnerNameMap = new Map(winners.map((w) => [w.id, w.nickname]))

  return {
    success: true as const,
    users: {
      total: totalUsers,
      today: signupsToday,
      week: signupsThisWeek,
      month: signupsThisMonth,
    },
    matches: {
      total: totalMatches,
      completed: completedMatches,
      open: openMatches,
    },
    levelBreakdown: levelBreakdown.map((l) => ({ level: l.tennisLevel, count: l._count })),
    courtUsage: courtUsage.map((c) => ({
      courtName: courtNameMap.get(c.courtId) ?? "알 수 없음",
      count: c._count,
    })),
    mannerRanking: mannerRanking.map((u) => ({
      nickname: u.nickname,
      mannerScore: Number(u.mannerScore),
    })),
    ntrpRanking: ntrpRanking.map((u) => ({
      nickname: u.nickname,
      ntrpScore: u.ntrpScore ? Number(u.ntrpScore) : null,
      ntrpCount: u.ntrpCount,
    })),
    monthlyWinRanking: monthlyWinRanking.map((w) => ({
      nickname: winnerNameMap.get(w.evaluateeId) ?? "알 수 없음",
      wins: w._count,
    })),
    pageViewsByPath: pageViewsByPath.map((p) => ({ path: p.path, count: p._count })),
    deviceBreakdown: deviceBreakdown.map((d) => ({ device: d.device, count: d._count })),
  }
}

/**
 * 일자별 방문자/조회수/가입자 추이 + 방문자 요약 + 시간대별 분포 (KST 기준).
 * "방문자"는 브라우저별 익명 ID(visitor_id) 또는 로그인 유저 ID 기준 고유 수입니다.
 * 익명 ID가 도입되기 전의 옛 기록은 비로그인이면 방문자 수에서 빠집니다(조회수에는 포함).
 */
export async function getVisitStats(accessToken: string | null, days: number = 30) {
  const auth = await requireAdmin(accessToken)
  if (!auth.ok) return { success: false as const, error: auth.error }

  const span = Math.min(Math.max(Math.floor(days), 1), 90)
  const since = kstDayStart(span - 1)
  const today = kstDayStart(0)
  const week = kstDayStart(6)
  const month = kstDayStart(29)

  const kstTs = Prisma.sql`((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul')`
  const visitor = Prisma.sql`COALESCE(visitor_id, user_id::text)`

  const [daily, summary, hourly, signups] = await Promise.all([
    prisma.$queryRaw<{ d: string; pv: bigint; uv: bigint }[]>(Prisma.sql`
      SELECT to_char(${kstTs}::date, 'YYYY-MM-DD') AS d,
             COUNT(*) AS pv,
             COUNT(DISTINCT ${visitor}) AS uv
      FROM page_views
      WHERE created_at >= ${since}
      GROUP BY 1 ORDER BY 1`),
    prisma.$queryRaw<
      { uv_today: bigint; uv_week: bigint; uv_month: bigint; uv_total: bigint; pv_today: bigint; pv_total: bigint }[]
    >(Prisma.sql`
      SELECT COUNT(DISTINCT ${visitor}) FILTER (WHERE created_at >= ${today}) AS uv_today,
             COUNT(DISTINCT ${visitor}) FILTER (WHERE created_at >= ${week}) AS uv_week,
             COUNT(DISTINCT ${visitor}) FILTER (WHERE created_at >= ${month}) AS uv_month,
             COUNT(DISTINCT ${visitor}) AS uv_total,
             COUNT(*) FILTER (WHERE created_at >= ${today}) AS pv_today,
             COUNT(*) AS pv_total
      FROM page_views`),
    prisma.$queryRaw<{ h: number; pv: bigint }[]>(Prisma.sql`
      SELECT EXTRACT(HOUR FROM ${kstTs})::int AS h, COUNT(*) AS pv
      FROM page_views
      WHERE created_at >= ${month}
      GROUP BY 1 ORDER BY 1`),
    prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
  ])

  // 빈 날짜도 0으로 채워서 그래프가 끊기지 않게
  const byDate = new Map<string, { date: string; visitors: number; pageViews: number; signups: number }>()
  for (let i = span - 1; i >= 0; i--) {
    const key = kstDateKey(kstDayStart(i))
    byDate.set(key, { date: key, visitors: 0, pageViews: 0, signups: 0 })
  }
  daily.forEach((r) => {
    const row = byDate.get(r.d)
    if (row) {
      row.visitors = Number(r.uv)
      row.pageViews = Number(r.pv)
    }
  })
  signups.forEach((u) => {
    const row = byDate.get(kstDateKey(u.createdAt))
    if (row) row.signups += 1
  })

  const hourlyFull = Array.from({ length: 24 }, (_, h) => ({ hour: h, pageViews: 0 }))
  hourly.forEach((r) => {
    if (r.h >= 0 && r.h < 24) hourlyFull[r.h].pageViews = Number(r.pv)
  })

  const sm = summary[0]
  return {
    success: true as const,
    series: Array.from(byDate.values()),
    hourly: hourlyFull,
    summary: {
      visitorsToday: Number(sm?.uv_today ?? 0),
      visitorsWeek: Number(sm?.uv_week ?? 0),
      visitorsMonth: Number(sm?.uv_month ?? 0),
      visitorsTotal: Number(sm?.uv_total ?? 0),
      pageViewsToday: Number(sm?.pv_today ?? 0),
      pageViewsTotal: Number(sm?.pv_total ?? 0),
    },
  }
}

/** 최근 가입자 / 최근 개설된 방 (대시보드 "최근 활동" 패널용) */
export async function getRecentActivity(accessToken: string | null) {
  const auth = await requireAdmin(accessToken)
  if (!auth.ok) return { success: false as const, error: auth.error }

  const [users, matches] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, nickname: true, tennisLevel: true, createdAt: true, isBanned: true },
    }),
    prisma.match.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        status: true,
        gameType: true,
        matchDate: true,
        createdAt: true,
        court: { select: { name: true } },
        host: { select: { nickname: true } },
      },
    }),
  ])

  return {
    success: true as const,
    users: users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() })),
    matches: matches.map((m) => ({
      id: m.id,
      status: m.status,
      gameType: m.gameType,
      courtName: m.court.name,
      hostNickname: m.host.nickname,
      matchDate: m.matchDate.toISOString(),
      createdAt: m.createdAt.toISOString(),
    })),
  }
}

/**
 * 요일·시간대별 인기 경기 시간.
 * 경기 날짜/시작 시간은 사용자가 한국 시간으로 직접 입력한 값이라 시간대 변환 없이 그대로 집계합니다.
 * 기간: 오늘 기준 days일 전 ~ 30일 후 사이에 열리는/열린 경기 (취소·삭제된 방 제외).
 * rooms=개설된 방 수, players=수락된 참가자 수(방장 포함), filled=정원 마감/완료된 방 수
 */
export async function getMatchTimeStats(accessToken: string | null, days: number = 90) {
  const auth = await requireAdmin(accessToken)
  if (!auth.ok) return { success: false as const, error: auth.error }

  const span = Math.min(365, Math.max(7, Math.floor(days) || 90))
  const from = kstDayStart(span)
  const to = kstDayStart(-30)

  const rows = await prisma.$queryRaw<
    { dow: number; hour: number; rooms: bigint; players: bigint; filled: bigint }[]
  >(Prisma.sql`
    SELECT EXTRACT(DOW FROM m.match_date)::int AS dow,
           EXTRACT(HOUR FROM m.start_time)::int AS hour,
           COUNT(*) AS rooms,
           COALESCE(SUM((SELECT COUNT(*) FROM match_participants p
                         WHERE p.match_id = m.id AND p.status = 'ACCEPTED')), 0) + COUNT(*) AS players,
           COUNT(*) FILTER (WHERE m.status IN ('FULL', 'COMPLETED')) AS filled
    FROM matches m
    WHERE m.deleted_at IS NULL
      AND m.status <> 'CANCELED'
      AND m.match_date >= ${from}::date
      AND m.match_date <= ${to}::date
    GROUP BY 1, 2`)

  const cells = rows.map((r) => ({
    dow: r.dow,
    hour: r.hour,
    rooms: Number(r.rooms),
    players: Number(r.players),
    filled: Number(r.filled),
  }))
  const totalRooms = cells.reduce((a, c) => a + c.rooms, 0)
  return { success: true as const, days: span, totalRooms, cells }
}

/**
 * 지역·코트별 주간 매칭 수 추이 (경기 날짜 기준, 월요일 시작 주 단위, 취소·삭제 제외).
 * 경기 날짜는 사용자가 입력한 한국 날짜 그대로 사용합니다. 현재 주까지의 최근 weeks주.
 */
export async function getMatchTrend(accessToken: string | null, weeks: number = 12) {
  const auth = await requireAdmin(accessToken)
  if (!auth.ok) return { success: false as const, error: auth.error }

  const span = Math.min(52, Math.max(4, Math.floor(weeks) || 12))
  // 이번 주 월요일(KST) 계산
  const k = new Date(Date.now() + KST_OFFSET_MS)
  const dow = (k.getUTCDay() + 6) % 7 // 월=0
  const thisMonday = Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate() - dow)
  const weekKeys: string[] = []
  for (let i = span - 1; i >= 0; i--) weekKeys.push(new Date(thisMonday - i * 7 * 86400000).toISOString().slice(0, 10))
  const from = weekKeys[0]

  const rows = await prisma.$queryRaw<{ wk: string; court_id: string; cnt: bigint }[]>(Prisma.sql`
    SELECT to_char(date_trunc('week', m.match_date), 'YYYY-MM-DD') AS wk, m.court_id AS court_id, COUNT(*) AS cnt
    FROM matches m
    WHERE m.deleted_at IS NULL AND m.status <> 'CANCELED'
      AND m.match_date >= ${from}::date
      AND m.match_date < (${from}::date + ${span * 7}::int)
    GROUP BY 1, 2`)

  const courts = await prisma.court.findMany({
    where: { id: { in: [...new Set(rows.map((r) => r.court_id))] } },
    select: { id: true, name: true, address: true },
  })
  const courtMap = new Map(courts.map((c) => [c.id, c]))
  const idx = new Map(weekKeys.map((w, i) => [w, i]))

  type Row = { name: string; sub?: string; total: number; series: number[] }
  const byRegion = new Map<string, Row>()
  const byCourt = new Map<string, Row>()
  const weekTotals = new Array<number>(span).fill(0)
  for (const r of rows) {
    const i = idx.get(r.wk)
    const c = courtMap.get(r.court_id)
    if (i === undefined || !c) continue
    const n = Number(r.cnt)
    const region = regionOf(c.address)
    const reg = byRegion.get(region) ?? { name: region, total: 0, series: new Array<number>(span).fill(0) }
    reg.total += n
    reg.series[i] += n
    byRegion.set(region, reg)
    const cr = byCourt.get(c.id) ?? { name: c.name, sub: region, total: 0, series: new Array<number>(span).fill(0) }
    cr.total += n
    cr.series[i] += n
    byCourt.set(c.id, cr)
    weekTotals[i] += n
  }
  const top = (m: Map<string, Row>, n: number) => [...m.values()].sort((a, b) => b.total - a.total).slice(0, n)
  return {
    success: true as const,
    weeks: weekKeys,
    weekTotals,
    regions: top(byRegion, 8),
    courts: top(byCourt, 10),
  }
}
