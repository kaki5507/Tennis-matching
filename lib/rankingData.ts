// lib/rankingData.ts
// 랭킹 화면용: 모든 (정지·탈퇴 제외) 회원의 레벨/온도/전적을 한 번에 모아 5분 캐시합니다. 이메일 등 개인정보는 담지 않아요.

import { Prisma } from "@prisma/client"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/tournamentData"
import { levelOf, xpOf } from "@/lib/levels"

export interface RankRow {
  id: string
  nickname: string
  level: number
  xp: number
  manner: number
  played: number
  wins: number
  losses: number
  winRate: number | null // 승+패 5판 미만이면 null
  visitDays: number
}

export const getRankRows = unstable_cache(
  async (): Promise<RankRow[]> => {
    const users = await prisma.user.findMany({
      where: { deletedAt: null, isBanned: false },
      select: { id: true, nickname: true, mannerScore: true },
    })
    if (users.length === 0) return []
    const [played, tours, teams, results, visits] = await Promise.all([
      prisma.matchParticipant.groupBy({
        by: ["userId"],
        where: { status: "ACCEPTED", match: { status: "COMPLETED" } },
        _count: { _all: true },
      }),
      prisma.tournamentParticipant.groupBy({ by: ["userId"], _count: { _all: true } }),
      prisma.tournamentTeam.findMany({ where: { status: "CONFIRMED" }, select: { captainId: true, partnerId: true } }),
      // 경기별 다수결 승패 (동점이면 승 > 패 > 무)
      prisma.$queryRaw<{ uid: string; wins: bigint; losses: bigint }[]>(Prisma.sql`
        WITH votes AS (
          SELECT evaluatee_id, match_id,
            COUNT(*) FILTER (WHERE win_loss = 'WIN') AS w,
            COUNT(*) FILTER (WHERE win_loss = 'LOSS') AS l,
            COUNT(*) FILTER (WHERE win_loss = 'DRAW') AS d
          FROM evaluations WHERE win_loss IS NOT NULL GROUP BY evaluatee_id, match_id
        )
        SELECT evaluatee_id::text AS uid,
          COUNT(*) FILTER (WHERE w >= l AND w >= d) AS wins,
          COUNT(*) FILTER (WHERE NOT (w >= l AND w >= d) AND l >= d) AS losses
        FROM votes GROUP BY evaluatee_id`),
      prisma.$queryRaw<{ uid: string; days: bigint }[]>(Prisma.sql`
        SELECT "userId"::text AS uid, COUNT(DISTINCT (created_at AT TIME ZONE 'Asia/Seoul')::date) AS days
        FROM page_views WHERE "userId" IS NOT NULL GROUP BY "userId"`),
    ])
    const playedBy = new Map(played.map((p) => [p.userId, p._count._all]))
    const toursBy = new Map(tours.map((p) => [p.userId, p._count._all]))
    for (const t of teams) for (const id of [t.captainId, t.partnerId]) toursBy.set(id, (toursBy.get(id) ?? 0) + 1)
    const resBy = new Map(results.map((r) => [r.uid, { wins: Number(r.wins), losses: Number(r.losses) }]))
    const visitBy = new Map(visits.map((v) => [v.uid, Number(v.days)]))

    return users.map((u) => {
      const input = {
        played: playedBy.get(u.id) ?? 0,
        visitDays: visitBy.get(u.id) ?? 0,
        tournaments: toursBy.get(u.id) ?? 0,
        manner: Number(u.mannerScore),
      }
      const r = resBy.get(u.id) ?? { wins: 0, losses: 0 }
      const decided = r.wins + r.losses
      return {
        id: u.id,
        nickname: u.nickname || "익명",
        level: levelOf(input),
        xp: xpOf(input),
        manner: input.manner,
        played: input.played,
        wins: r.wins,
        losses: r.losses,
        winRate: decided >= 5 ? Math.round((r.wins / decided) * 1000) / 10 : null,
        visitDays: input.visitDays,
      }
    })
  },
  ["rank-rows-v1"],
  { revalidate: 300 },
)
