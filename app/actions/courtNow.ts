// app/actions/courtNow.ts
"use server"

import { requireUser } from "@/lib/serverAuth"
import { checkAllCourtsNow, checkCourtNow, type CourtNowResult } from "@/lib/courtToday"

type Out = { success: true; results: CourtNowResult[]; checkedAt: string } | { success: false; error: string }

/** 한 테니스장의 오늘 남은 시간대 */
export async function getCourtNow(accessToken: string | null, facilityId: string): Promise<Out> {
  const auth = await requireUser(accessToken)
  if (!auth.ok) return { success: false, error: auth.error }
  const r = await checkCourtNow(facilityId)
  return { success: true, results: [r], checkedAt: new Date().toISOString() }
}

/** 전체 테니스장의 오늘 남은 시간대 */
export async function getAllCourtsNow(accessToken: string | null): Promise<Out> {
  const auth = await requireUser(accessToken)
  if (!auth.ok) return { success: false, error: auth.error }
  const results = await checkAllCourtsNow()
  return { success: true, results, checkedAt: new Date().toISOString() }
}
