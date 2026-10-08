// lib/courtCrawl.ts
// 부천 테니스장 예약 현황 수집(크롤링). 조회만 하며 예약은 절대 대신 하지 않습니다.
// 정기 실행은 크론 라우트가, 수동 실행은 관리자 "지금 갱신" 버튼이 이 함수를 부릅니다.
// 수집 결과는 DB(court_availability_snapshots)에 저장되고, 사용자의 "빈 코트 찾기"는 그 저장본만 읽습니다.
// 키 형식: "YYYY-MM-DD_09:00~11:00"

import { prisma } from "@/lib/tournamentData"
import { fetchAvailableSlots } from "@/lib/bucheonScraper"
import { BUCHEON_COURTS } from "@/lib/bucheonCourts"
import { sendPushToUsers } from "@/lib/push"

export const CRAWL_OPEN_HOUR = 9 // 한국 시간 이 시각부터
export const CRAWL_CLOSE_HOUR = 23 // 23시 정각 실행까지 포함
const CONCURRENCY = 4 // 부천 사이트에 한꺼번에 보내는 요청 수 (예의상 소수로)

export async function getCrawlSetting() {
  const row = await prisma.courtCrawlSetting.findUnique({ where: { id: 1 } })
  return {
    enabled: row?.enabled ?? true,
    lastRunAt: row?.lastRunAt ?? null,
    lastRunSummary: row?.lastRunSummary ?? null,
    updatedAt: row?.updatedAt ?? null,
  }
}

export interface CrawlOutcome {
  skipped?: string
  ok: number
  failed: number
  newSlots: number
  results: Record<string, number>
}

export async function runCourtCrawl(opts: { trigger: "cron" | "admin"; respectSwitch: boolean; respectHours: boolean }): Promise<CrawlOutcome> {
  const empty = (skipped: string): CrawlOutcome => ({ skipped, ok: 0, failed: 0, newSlots: 0, results: {} })

  const kst = new Date(Date.now() + 9 * 3600_000)
  const hour = kst.getUTCHours()
  if (opts.respectHours && (hour < CRAWL_OPEN_HOUR || hour > CRAWL_CLOSE_HOUR)) return empty("수집 시간대(09~23시) 밖")
  if (opts.respectSwitch && !(await getCrawlSetting()).enabled) return empty("관리자가 크롤링을 꺼 둔 상태")

  const monthPrefix = `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, "0")}`
  const results: Record<string, number> = {}
  let ok = 0
  let failed = 0
  let newSlots = 0

  const one = async (court: (typeof BUCHEON_COURTS)[number]) => {
    try {
      const slots = await fetchAvailableSlots(court.facilityId)
      const keys = [...new Set(slots.map((s) => `${monthPrefix}-${s.date}_${s.time}`))]

      const snapshot = await prisma.courtAvailabilitySnapshot.findUnique({ where: { facilityId: court.facilityId } })
      // 예전 형식("DD_시간")으로 저장된 키도 같은 슬롯으로 취급 (가짜 알림 방지)
      const previousKeys = new Set((snapshot?.availableKeys ?? []).map((k) => (/^\d{2}_/.test(k) ? `${monthPrefix}-${k}` : k)))
      const newlyAvailable = keys.filter((k) => !previousKeys.has(k))

      // 성공했을 때만 저장 (실패하면 직전 저장본을 그대로 둠)
      await prisma.courtAvailabilitySnapshot.upsert({
        where: { facilityId: court.facilityId },
        update: { availableKeys: keys },
        create: { facilityId: court.facilityId, availableKeys: keys },
      })
      ok++
      results[court.facilityId] = newlyAvailable.length
      newSlots += newlyAvailable.length
      if (newlyAvailable.length === 0) return

      const watchers = await prisma.courtWatch.findMany({ where: { facilityId: court.facilityId }, select: { userId: true } })
      if (watchers.length === 0) return
      await sendPushToUsers(
        watchers.map((w) => w.userId),
        {
          title: `🎾 ${court.name} 예약 가능!`,
          body: `새로 예약 가능한 시간대가 ${newlyAvailable.length}개 생겼어요. 서둘러 확인해보세요.`,
          url: "https://reserv.bucheon.go.kr/site/main/lending/lendingDetail?lending_info_seq=" + court.facilityId,
        }
      )
    } catch (error) {
      console.error(`[${court.name}] 확인 실패:`, error)
      failed++
      results[court.facilityId] = -1
    }
  }

  for (let i = 0; i < BUCHEON_COURTS.length; i += CONCURRENCY) {
    await Promise.all(BUCHEON_COURTS.slice(i, i + CONCURRENCY).map(one))
  }

  const summary = `성공 ${ok} / 실패 ${failed} · 새 슬롯 ${newSlots} (${opts.trigger === "cron" ? "정기" : "수동"})`
  await prisma.courtCrawlSetting.upsert({
    where: { id: 1 },
    create: { id: 1, lastRunAt: new Date(), lastRunSummary: summary },
    update: { lastRunAt: new Date(), lastRunSummary: summary },
  })
  return { ok, failed, newSlots, results }
}
