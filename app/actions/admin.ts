// app/actions/admin.ts
"use server"

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

/** 이 유저가 관리자인지 확인 (모든 admin 함수 호출 전에 반드시 거쳐야 함) */
export async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  return user?.role === "ADMIN"
}

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * 관리자 대시보드에 필요한 모든 통계를 한 번에 모아서 반환합니다.
 * 호출하는 쪽(페이지)에서 반드시 isAdmin()으로 먼저 권한을 확인해야 합니다.
 */
export async function getAdminStats(requesterId: string) {
  const admin = await isAdmin(requesterId)
  if (!admin) {
    return { success: false, error: "관리자만 접근할 수 있습니다." as const }
  }

  const now = new Date()
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

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
    prisma.user.count({ where: { createdAt: { gte: daysAgo(0) } } }),
    prisma.user.count({ where: { createdAt: { gte: daysAgo(7) } } }),
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
 * 일자별 가입자 수 추이 (최근 N일). 관리자 대시보드의 그래프용.
 */
export async function getSignupTrend(requesterId: string, days: number = 30) {
  const admin = await isAdmin(requesterId)
  if (!admin) return { success: false, error: "관리자만 접근할 수 있습니다." as const }

  const since = daysAgo(days)
  const users = await prisma.user.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  })

  // 날짜별로 집계 (DB groupBy가 날짜 단위 truncate를 지원 안 해서 JS에서 처리)
  const counts = new Map<string, number>()
  for (let i = 0; i <= days; i++) {
    const d = daysAgo(days - i)
    counts.set(d.toISOString().slice(0, 10), 0)
  }
  users.forEach((u) => {
    const key = u.createdAt.toISOString().slice(0, 10)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  })

  return {
    success: true as const,
    trend: Array.from(counts.entries()).map(([date, count]) => ({ date, count })),
  }
}
