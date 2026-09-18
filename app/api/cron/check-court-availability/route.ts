// app/api/cron/check-court-availability/route.ts
//
// Vercel Cron이 3시간마다 이 엔드포인트를 호출합니다 (vercel.json 참고).
// 부천시 예약 사이트를 조회만 하고(예약 신청 절대 안 함), 새로 "예약가능"이
// 뜬 슬롯이 있으면 그 테니스장을 구독한 유저들에게 알림을 보냅니다.

import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { fetchAvailableSlots } from "@/lib/bucheonScraper"
import { BUCHEON_COURTS } from "@/lib/bucheonCourts"
import { sendPushToUsers } from "@/app/actions/notification"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  // Vercel Cron 요청인지 검증 (누구나 이 URL을 호출해서 무의미하게 조회를 발생시키지 못하도록)
  const authHeader = request.headers.get("authorization")
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const results: Record<string, number> = {}

  // 사이트에 부담 주지 않도록, 구독자가 1명이라도 있는 시설만 확인합니다.
  const watchedFacilityIds = await prisma.courtWatch.findMany({
    distinct: ["facilityId"],
    select: { facilityId: true },
  })
  const watchedSet = new Set(watchedFacilityIds.map((w) => w.facilityId))
  const targets = BUCHEON_COURTS.filter((c) => watchedSet.has(c.facilityId))

  for (const court of targets) {
    try {
      const slots = await fetchAvailableSlots(court.facilityId)
      const keys = slots.map((s) => `${s.date}_${s.time}`)

      const snapshot = await prisma.courtAvailabilitySnapshot.findUnique({
        where: { facilityId: court.facilityId },
      })
      const previousKeys = new Set(snapshot?.availableKeys ?? [])
      const newlyAvailable = keys.filter((k) => !previousKeys.has(k))

      // 스냅샷 갱신 (다음 번 비교 기준)
      await prisma.courtAvailabilitySnapshot.upsert({
        where: { facilityId: court.facilityId },
        update: { availableKeys: keys },
        create: { facilityId: court.facilityId, availableKeys: keys },
      })

      results[court.facilityId] = newlyAvailable.length

      if (newlyAvailable.length === 0) continue

      const watchers = await prisma.courtWatch.findMany({
        where: { facilityId: court.facilityId },
        select: { userId: true },
      })
      if (watchers.length === 0) continue

      await sendPushToUsers(
        watchers.map((w) => w.userId),
        {
          title: `🎾 ${court.facilityName} 예약 가능!`,
          body: `새로 예약 가능한 시간대가 ${newlyAvailable.length}개 생겼어요. 서둘러 확인해보세요.`,
          url: "https://reserv.bucheon.go.kr/site/main/lending/lendingDetail?lending_info_seq=" + court.facilityId,
        }
      )
    } catch (error) {
      console.error(`[${court.name}] 확인 실패:`, error)
      results[court.facilityId] = -1 // 에러 표시
    }
  }

  return NextResponse.json({ success: true, checkedAt: new Date().toISOString(), results })
}
