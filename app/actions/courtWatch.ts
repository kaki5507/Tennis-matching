// app/actions/courtWatch.ts
"use server"

import { prisma } from "@/lib/tournamentData"
import { requireUser } from "@/lib/serverAuth"
import { BUCHEON_COURTS } from "@/lib/bucheonCourts"
import { normalizeAlertTimes } from "@/lib/courtAlert"

export async function subscribeCourtWatch(accessToken: string | null, facilityId: string, facilityName: string) {
  try {
    const auth = await requireUser(accessToken)
    if (!auth.ok) return { success: false, error: auth.error }

    // 알려진 부천 테니스장만 구독 가능 (임의 값으로 DB를 채우지 못하게)
    const court = BUCHEON_COURTS.find((c) => c.facilityId === facilityId)
    if (!court) return { success: false, error: "알 수 없는 테니스장입니다." }

    await prisma.courtWatch.upsert({
      where: { userId_facilityId: { userId: auth.userId, facilityId } },
      update: {},
      create: { userId: auth.userId, facilityId, facilityName: court.name || facilityName },
    })
    return { success: true }
  } catch (error) {
    console.error("테니스장 알림 구독 에러:", error)
    return { success: false, error: "구독에 실패했습니다." }
  }
}

export async function unsubscribeCourtWatch(accessToken: string | null, facilityId: string) {
  try {
    const auth = await requireUser(accessToken, { allowBanned: true })
    if (!auth.ok) return { success: false, error: auth.error }

    await prisma.courtWatch.deleteMany({ where: { userId: auth.userId, facilityId } })
    return { success: true }
  } catch (error) {
    console.error("테니스장 알림 구독 해제 에러:", error)
    return { success: false, error: "구독 해제에 실패했습니다." }
  }
}

export async function getMyCourtWatches(accessToken: string | null) {
  try {
    const auth = await requireUser(accessToken, { allowBanned: true })
    if (!auth.ok) return { success: false, facilityIds: [] as string[], alertTimes: [] as string[] }

    const [watches, me] = await Promise.all([
      prisma.courtWatch.findMany({ where: { userId: auth.userId } }),
      prisma.user.findUnique({ where: { id: auth.userId }, select: { courtAlertTimes: true } }),
    ])
    return { success: true, facilityIds: watches.map((w) => w.facilityId), alertTimes: normalizeAlertTimes(me?.courtAlertTimes) as string[] }
  } catch (error) {
    console.error("테니스장 구독 목록 조회 에러:", error)
    return { success: false, facilityIds: [] as string[], alertTimes: [] as string[] }
  }
}

/** 빈 코트 알림을 받을 시간대 저장. 빈 배열이면 모든 시간대 */
export async function setCourtAlertTimes(accessToken: string | null, times: string[]) {
  try {
    const auth = await requireUser(accessToken, { allowBanned: true })
    if (!auth.ok) return { success: false, error: auth.error, alertTimes: [] as string[] }
    const alertTimes = normalizeAlertTimes(times) as string[]
    await prisma.user.update({ where: { id: auth.userId }, data: { courtAlertTimes: alertTimes } })
    return { success: true, alertTimes }
  } catch (error) {
    console.error("알림 시간대 저장 에러:", error)
    return { success: false, error: "저장에 실패했습니다.", alertTimes: [] as string[] }
  }
}
