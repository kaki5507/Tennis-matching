// app/actions/courtWatch.ts
"use server"

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function subscribeCourtWatch(userId: string, facilityId: string, facilityName: string) {
  try {
    await prisma.courtWatch.upsert({
      where: { userId_facilityId: { userId, facilityId } },
      update: {},
      create: { userId, facilityId, facilityName },
    })
    return { success: true }
  } catch (error) {
    console.error("테니스장 알림 구독 에러:", error)
    return { success: false, error: "구독에 실패했습니다." }
  }
}

export async function unsubscribeCourtWatch(userId: string, facilityId: string) {
  try {
    await prisma.courtWatch.deleteMany({ where: { userId, facilityId } })
    return { success: true }
  } catch (error) {
    console.error("테니스장 알림 구독 해제 에러:", error)
    return { success: false, error: "구독 해제에 실패했습니다." }
  }
}

export async function getMyCourtWatches(userId: string) {
  try {
    const watches = await prisma.courtWatch.findMany({ where: { userId } })
    return { success: true, facilityIds: watches.map((w) => w.facilityId) }
  } catch (error) {
    console.error("테니스장 구독 목록 조회 에러:", error)
    return { success: false, facilityIds: [] as string[] }
  }
}
