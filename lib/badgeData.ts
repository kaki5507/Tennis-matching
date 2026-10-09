// lib/badgeData.ts
// 레벨/칭호 계산에 필요한 데이터를 DB에서 모읍니다 (서버 전용, 화면에서 직접 부르지 않음).

import { Prisma } from "@prisma/client"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/tournamentData"
import { levelOf, type LevelInput } from "@/lib/levels"
import { type TitleStats, type WeeklyKey, WEEKLY_TITLES } from "@/lib/titles"

const KST = 9 * 60 * 60 * 1000

// ---- 아바타 테두리용: 여러 명의 레벨을 한 번에 (5분 메모리 캐시) ----
const levelCache = new Map<string, { lv: number; exp: number }>()

export async function getLevelMap(userIds: string[]): Promise<Record<string, number>> {
  const ids = [...new Set(userIds.filter(Boolean))]
  const out: Record<string, number> = {}
  const need: string[] = []
  const now = Date.now()
  for (const id of ids) {
    const hit = levelCache.get(id)
    if (hit && hit.exp > now) out[id] = hit.lv
    else need.push(id)
  }
  if (need.length === 0) return out

  try {
    const [users, played, tours, teams, visits] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: need } }, select: { id: true, mannerScore: true } }),
      prisma.matchParticipant.groupBy({
        by: ["userId"],
        where: { userId: { in: need }, status: "ACCEPTED", match: { status: "COMPLETED" } },
        _count: { _all: true },
      }),
      prisma.tournamentParticipant.groupBy({ by: ["userId"], where: { userId: { in: need } }, _count: { _all: true } }),
      prisma.tournamentTeam.findMany({
        where: { status: "CONFIRMED", OR: [{ captainId: { in: need } }, { partnerId: { in: need } }] },
        select: { captainId: true, partnerId: true },
      }),
      prisma.$queryRaw<{ user_id: string; days: bigint }[]>(Prisma.sql`
        SELECT "userId"::text AS user_id, COUNT(DISTINCT (created_at AT TIME ZONE 'Asia/Seoul')::date) AS days
        FROM page_views WHERE "userId" = ANY(${need}::uuid[]) GROUP BY "userId"`),
    ])
    const playedBy = new Map(played.map((p) => [p.userId, p._count._all]))
    const toursBy = new Map(tours.map((p) => [p.userId, p._count._all]))
    for (const t of teams) {
      for (const id of [t.captainId, t.partnerId]) toursBy.set(id, (toursBy.get(id) ?? 0) + 1)
    }
    const visitBy = new Map(visits.map((v) => [v.user_id, Number(v.days)]))
    for (const u of users) {
      const lv = levelOf({
        played: playedBy.get(u.id) ?? 0,
        visitDays: visitBy.get(u.id) ?? 0,
        tournaments: toursBy.get(u.id) ?? 0,
        manner: Number(u.mannerScore),
      })
      out[u.id] = lv
      levelCache.set(u.id, { lv, exp: now + 5 * 60_000 })
    }
    if (levelCache.size > 2000) levelCache.clear()
  } catch (e) {
    console.error("[getLevelMap] 실패:", e)
  }
  return out
}

// ---- 프로필용: 한 사람의 전체 통계 ----
export async function getTitleStats(userId: string): Promise<{ stats: TitleStats; level: LevelInput }> {
  const [user, parts, evalsReceived, tourPart, teams, champs, visit] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { mannerScore: true } }),
    prisma.matchParticipant.findMany({
      where: { userId, status: "ACCEPTED", match: { status: "COMPLETED" } },
      select: { matchId: true, match: { select: { matchDate: true, startTime: true, hostId: true } } },
    }),
    prisma.evaluation.findMany({
      where: { evaluateeId: userId },
      select: { matchId: true, winLoss: true, mannerRating: true },
    }),
    prisma.tournamentParticipant.findMany({ where: { userId }, select: { tournamentId: true } }),
    prisma.tournamentTeam.findMany({
      where: { status: "CONFIRMED", OR: [{ captainId: userId }, { partnerId: userId }] },
      select: { id: true, tournamentId: true },
    }),
    prisma.tournament.count({ where: { status: "COMPLETED", championId: userId } }),
    prisma.$queryRaw<{ days: bigint }[]>(Prisma.sql`
      SELECT COUNT(DISTINCT (created_at AT TIME ZONE 'Asia/Seoul')::date) AS days
      FROM page_views WHERE "userId" = ${userId}::uuid`),
  ])

  const teamChamps = teams.length
    ? await prisma.tournament.count({ where: { status: "COMPLETED", championId: { in: teams.map((t) => t.id) } } })
    : 0

  // 경기별 다수결 승패 → 날짜순으로 연승/연패 계산
  const votes = new Map<string, { WIN: number; LOSS: number; DRAW: number }>()
  for (const e of evalsReceived) {
    if (!e.winLoss) continue
    const v = votes.get(e.matchId) ?? { WIN: 0, LOSS: 0, DRAW: 0 }
    v[e.winLoss]++
    votes.set(e.matchId, v)
  }
  const sorted = [...parts].sort((a, b) => a.match.matchDate.getTime() - b.match.matchDate.getTime())
  let wins = 0, losses = 0, draws = 0, ws = 0, ls = 0, maxW = 0, maxL = 0
  for (const p of sorted) {
    const v = votes.get(p.matchId)
    if (!v) continue
    const max = Math.max(v.WIN, v.LOSS, v.DRAW)
    const r = v.WIN === max ? "WIN" : v.LOSS === max ? "LOSS" : "DRAW"
    if (r === "WIN") { wins++; ws++; ls = 0 }
    else if (r === "LOSS") { losses++; ls++; ws = 0 }
    else { draws++; ws = 0; ls = 0 }
    maxW = Math.max(maxW, ws)
    maxL = Math.max(maxL, ls)
  }

  let weekdayPlayed = 0, weekendPlayed = 0, earlyPlayed = 0, nightPlayed = 0, hosted = 0
  for (const p of parts) {
    const dow = p.match.matchDate.getUTCDay() // @db.Date 는 UTC 자정 기준
    if (dow === 0 || dow === 6) weekendPlayed++
    else weekdayPlayed++
    const h = p.match.startTime.getUTCHours()
    if (h < 9) earlyPlayed++
    if (h >= 20) nightPlayed++
    if (p.match.hostId === userId) hosted++
  }

  const tourIds = new Set([...tourPart.map((t) => t.tournamentId), ...teams.map((t) => t.tournamentId)])
  const manner = Number(user?.mannerScore ?? 36.5)
  const visitDays = Number(visit[0]?.days ?? 0)

  return {
    stats: {
      played: parts.length, weekdayPlayed, weekendPlayed, earlyPlayed, nightPlayed, hosted,
      tournaments: tourIds.size, championships: champs + teamChamps,
      wins, losses, draws, maxWinStreak: maxW, maxLossStreak: maxL, visitDays,
      positiveReceived: evalsReceived.filter((e) => e.mannerRating >= 4).length, manner,
    },
    level: { played: parts.length, visitDays, tournaments: tourIds.size, manner },
  }
}

// ---- 주간 칭호: 지난주(월~일, 한국시간) 집계 결과를 이번 주 내내 사용 ----
function weekRangeUtc(): { from: Date; to: Date; label: string } {
  const nowK = new Date(Date.now() + KST)
  const dow = (nowK.getUTCDay() + 6) % 7 // 월=0
  const thisMon = Date.UTC(nowK.getUTCFullYear(), nowK.getUTCMonth(), nowK.getUTCDate() - dow) // KST 월요일 0시를 UTC 표기로
  const fromK = thisMon - 7 * 86400000
  const fmt = (ms: number) => `${new Date(ms).getUTCMonth() + 1}/${new Date(ms).getUTCDate()}`
  return { from: new Date(fromK - KST), to: new Date(thisMon - KST), label: `${fmt(fromK)}~${fmt(thisMon - 86400000)}` }
}

export interface WeeklyWinner { key: WeeklyKey; userId: string; count: number }

export const getWeeklyWinners = unstable_cache(
  async (): Promise<{ label: string; winners: WeeklyWinner[] }> => {
    const { from, to, label } = weekRangeUtc()
    const pick = (rows: { user_id: string; n: bigint }[], key: WeeklyKey): WeeklyWinner[] => {
      const list = rows.map((r) => ({ userId: r.user_id, count: Number(r.n) }))
      const max = Math.max(0, ...list.map((r) => r.count))
      if (max < WEEKLY_TITLES[key].min) return []
      return list.filter((r) => r.count === max).map((r) => ({ key, ...r }))
    }
    try {
      const [temp, wins, games, tears] = await Promise.all([
        prisma.$queryRaw<{ user_id: string; n: bigint }[]>(Prisma.sql`
          SELECT evaluatee_id::text AS user_id, COUNT(*) AS n FROM evaluations
          WHERE created_at >= ${from} AND created_at < ${to} AND manner_rating >= 4
          GROUP BY evaluatee_id ORDER BY n DESC LIMIT 20`),
        prisma.$queryRaw<{ user_id: string; n: bigint }[]>(Prisma.sql`
          SELECT evaluatee_id::text AS user_id, COUNT(DISTINCT match_id) AS n FROM evaluations
          WHERE created_at >= ${from} AND created_at < ${to} AND win_loss = 'WIN'
          GROUP BY evaluatee_id ORDER BY n DESC LIMIT 20`),
        prisma.$queryRaw<{ user_id: string; n: bigint }[]>(Prisma.sql`
          SELECT mp.user_id::text AS user_id, COUNT(*) AS n FROM match_participants mp
          JOIN matches m ON m.id = mp.match_id
          WHERE mp.status = 'ACCEPTED' AND m.status = 'COMPLETED' AND m.match_date >= ${from} AND m.match_date < ${to}
          GROUP BY mp.user_id ORDER BY n DESC LIMIT 20`),
        prisma.$queryRaw<{ user_id: string; n: bigint }[]>(Prisma.sql`
          SELECT evaluatee_id::text AS user_id, COUNT(DISTINCT match_id) AS n FROM evaluations
          WHERE created_at >= ${from} AND created_at < ${to} AND win_loss = 'LOSS'
          GROUP BY evaluatee_id ORDER BY n DESC LIMIT 20`),
      ])
      return {
        label,
        winners: [...pick(temp, "temp"), ...pick(wins, "wins"), ...pick(games, "games"), ...pick(tears, "tears")],
      }
    } catch (e) {
      console.error("[getWeeklyWinners] 실패:", e)
      return { label, winners: [] }
    }
  },
  ["weekly-title-winners-v1"],
  { revalidate: 600 },
)
