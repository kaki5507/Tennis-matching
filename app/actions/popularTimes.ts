// app/actions/popularTimes.ts
// 일반 사용자에게 보여주는 "요일·시간대별 인기 경기 시간". 집계 숫자만 반환하며 개인 정보는 없습니다.
// DB 부하를 줄이기 위해 10분간 캐시합니다.

"use server"

import { unstable_cache } from "next/cache"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/tournamentData"

export interface PopularSlot {
  dow: number // 0=일 ... 6=토
  hour: number
  rooms: number
  players: number
}

const MIN_ROOMS = 2 // 표본이 너무 적은 시간대는 추천하지 않음

const load = unstable_cache(
  async (): Promise<PopularSlot[]> => {
    const rows = await prisma.$queryRaw<{ dow: number; hour: number; rooms: bigint; players: bigint }[]>(Prisma.sql`
      SELECT EXTRACT(DOW FROM m.match_date)::int AS dow,
             EXTRACT(HOUR FROM m.start_time)::int AS hour,
             COUNT(*) AS rooms,
             COALESCE(SUM((SELECT COUNT(*) FROM match_participants p
                           WHERE p.match_id = m.id AND p.status = 'ACCEPTED')), 0) + COUNT(*) AS players
      FROM matches m
      WHERE m.deleted_at IS NULL
        AND m.status <> 'CANCELED'
        AND m.match_date >= (CURRENT_DATE - INTERVAL '60 days')
        AND m.match_date <= (CURRENT_DATE + INTERVAL '30 days')
      GROUP BY 1, 2
      HAVING COUNT(*) >= ${MIN_ROOMS}
      ORDER BY players DESC, rooms DESC
      LIMIT 5`)
    return rows.map((r) => ({ dow: r.dow, hour: r.hour, rooms: Number(r.rooms), players: Number(r.players) }))
  },
  ["popular-times"],
  { revalidate: 600 }
)

/** 최근 두 달 기준 가장 많이 모이는 시간 TOP 5 (조회 실패 시 빈 배열) */
export async function getPopularTimes(): Promise<PopularSlot[]> {
  try {
    return await load()
  } catch (e) {
    console.error("[popularTimes] 조회 실패:", e)
    return []
  }
}
