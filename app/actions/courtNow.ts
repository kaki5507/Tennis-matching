// app/actions/courtNow.ts
"use server"

import { requireUser } from "@/lib/serverAuth"
import { checkAllCourtsRange, checkCourtRange, getRangeInfo, type CourtRangeResult, type RangeKey } from "@/lib/courtToday"

type Out =
  | { success: true; results: CourtRangeResult[]; updatedAt: string | null; rangeLabel: string; truncated: boolean }
  | { success: false; error: string }

const RANGES: RangeKey[] = ["tomorrow", "week", "month"]

/** 로그인한 사용자만. facilityId 가 있으면 한 곳, 없으면 전체 코트의 (내일 / 7일 / 이번 달) 가능 시간대 */
export async function getCourtRange(accessToken: string | null, range: RangeKey, facilityId?: string | null): Promise<Out> {
  const auth = await requireUser(accessToken)
  if (!auth.ok) return { success: false, error: auth.error }
  if (!RANGES.includes(range)) return { success: false, error: "잘못된 요청입니다." }
  const results = facilityId ? [await checkCourtRange(facilityId, range)] : await checkAllCourtsRange(range)
  const info = getRangeInfo(range)
  // 화면에 "N분 전 갱신"으로 보여줄 시각: 여러 곳 중 가장 오래된 수집 시각 (보수적으로)
  const times = results.map((r) => r.updatedAt).filter((t): t is string => !!t).sort()
  const oldest = times[0] ?? null
  return { success: true, results, updatedAt: oldest, rangeLabel: info.rangeLabel, truncated: info.truncated }
}
