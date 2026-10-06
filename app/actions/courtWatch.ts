// app/actions/courtWatch.ts
"use server"

import { prisma } from "@/lib/tournamentData"
import { requireUser } from "@/lib/serverAuth"
import { BUCHEON_COURTS } from "@/lib/bucheonCourts"

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
    if (!auth.ok) return { success: false, facilityIds: [] as string[] }

    const watches = await prisma.courtWatch.findMany({ where: { userId: auth.userId } })
    return { success: true, facilityIds: watches.map((w) => w.facilityId) }
  } catch (error) {
    console.error("테니스장 구독 목록 조회 에러:", error)
    return { success: false, facilityIds: [] as string[] }
  }
}
