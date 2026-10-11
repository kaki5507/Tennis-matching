// lib/visitRollup.ts
// 방문 통계 사전 집계. "지난 날짜"의 방문 기록은 더 이상 바뀌지 않으므로 하루치를 한 번만 계산해서
// 작은 표(visit_rollup_*)에 저장해 둡니다. 통계 화면은 이 표 + "오늘" 기록만 읽어서 항상 빠릅니다.
// (한국 시간 기준 하루. 서버 전용)

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/tournamentData"

const KST_MS = 9 * 60 * 60 * 1000
const DAY_MS = 86_400_000
const MAX_DAYS_PER_RUN = 120

export const kstTsSql = Prisma.sql`((created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul')`
// 방문자 식별: 브라우저 익명 ID, 없으면 로그인 유저 ID (page_views.userId 는 컬럼명이 "userId")
export const visitorSql = Prisma.sql`COALESCE(visitor_id, "userId"::text)`

/** "YYYY-MM-DD"(KST 날짜) → 그날 KST 0시 (UTC Date) */
function kstMidnight(dateKey: string): Date {
  return new Date(Date.parse(`${dateKey}T00:00:00Z`) - KST_MS)
}
function kstDateKey(d: Date): string {
  return new Date(d.getTime() + KST_MS).toISOString().slice(0, 10)
}
export function kstTodayKey(): string {
  return kstDateKey(new Date())
}
export function kstDaysAgoKey(n: number): string {
  return kstDateKey(new Date(Date.now() - n * DAY_MS))
}

let running: Promise<void> | null = null

/** 아직 집계하지 않은 "어제까지"의 날짜를 채웁니다. 여러 요청이 동시에 와도 한 번만 실행. */
export function rollupVisits(): Promise<void> {
  if (!running) running = doRollup().finally(() => { running = null })
  return running
}

async function doRollup() {
  const today = kstTodayKey()
  const last = await prisma.$queryRaw<{ d: string | null }[]>(Prisma.sql`SELECT to_char(MAX(day), 'YYYY-MM-DD') AS d FROM visit_rollup_days`)
  let from: string
  if (last[0]?.d) {
    from = new Date(Date.parse(`${last[0].d}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10)
  } else {
    const first = await prisma.$queryRaw<{ t: Date | null }[]>(Prisma.sql`SELECT MIN(created_at) AS t FROM page_views`)
    if (!first[0]?.t) return
    from = kstDateKey(first[0].t) // created_at 은 UTC 기준 → KST 날짜로
  }
  if (from >= today) return

  // 이번 실행에서 처리할 마지막 날 (어제까지, 한 번에 최대 120일)
  const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10)
  const capEnd = new Date(Date.parse(`${from}T00:00:00Z`) + (MAX_DAYS_PER_RUN - 1) * DAY_MS).toISOString().slice(0, 10)
  const to = capEnd < yesterday ? capEnd : yesterday
  const fromTs = kstMidnight(from)
  const toTs = kstMidnight(new Date(Date.parse(`${to}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10)) // to 다음날 0시 (미포함)

  await prisma.$transaction([
    // 날짜별 방문자 (고유)
    prisma.$executeRaw(Prisma.sql`
      INSERT INTO visit_day_visitors (day, visitor)
      SELECT DISTINCT ${kstTsSql}::date, ${visitorSql}
      FROM page_views
      WHERE created_at >= ${fromTs} AND created_at < ${toTs} AND ${visitorSql} IS NOT NULL
      ON CONFLICT DO NOTHING`),
    // 시간대별
    prisma.$executeRaw(Prisma.sql`
      INSERT INTO visit_rollup_hours (day, hour, pv)
      SELECT ${kstTsSql}::date, EXTRACT(HOUR FROM ${kstTsSql})::int, COUNT(*)
      FROM page_views
      WHERE created_at >= ${fromTs} AND created_at < ${toTs}
      GROUP BY 1, 2
      ON CONFLICT DO NOTHING`),
    // 페이지/기기별
    prisma.$executeRaw(Prisma.sql`
      INSERT INTO visit_rollup_pages (day, path, device, pv)
      SELECT ${kstTsSql}::date, path, device, COUNT(*)
      FROM page_views
      WHERE created_at >= ${fromTs} AND created_at < ${toTs}
      GROUP BY 1, 2, 3
      ON CONFLICT DO NOTHING`),
    // 날짜별 합계 (방문이 0인 날도 0으로 채워서 "집계 끝" 표시)
    prisma.$executeRaw(Prisma.sql`
      INSERT INTO visit_rollup_days (day, pv, uv)
      SELECT g::date, COALESCE(a.pv, 0), COALESCE(a.uv, 0)
      FROM generate_series(${from}::date, ${to}::date, interval '1 day') AS g
      LEFT JOIN (
        SELECT ${kstTsSql}::date AS day, COUNT(*)::int AS pv, COUNT(DISTINCT ${visitorSql})::int AS uv
        FROM page_views
        WHERE created_at >= ${fromTs} AND created_at < ${toTs}
        GROUP BY 1
      ) a ON a.day = g::date
      ON CONFLICT DO NOTHING`),
  ])
}
