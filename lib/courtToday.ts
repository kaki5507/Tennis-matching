// lib/courtToday.ts
// "내일 예약 가능한 코트 시간대"를 조회합니다. (당일 예약은 불가) (조회만 하며 예약은 절대 대신 하지 않습니다)
// 예약 사이트에 부담이 가지 않도록 시설별 결과를 3분간 서버 메모리에 기억합니다.

import { fetchAvailableSlots } from "@/lib/bucheonScraper"
import { BUCHEON_COURTS } from "@/lib/bucheonCourts"

export interface CourtNowResult {
  facilityId: string
  name: string
  ok: boolean
  /** 내일 예약 가능한 시간대 ("19:00~21:00") */
  times: string[]
  error?: string
}

const TTL_MS = 3 * 60_000
const cache = new Map<string, { at: number; times: string[] }>()

/** 한국 시간 기준 "오늘/내일"의 일(DD), 월, 표시용 라벨 */
function kstDates() {
  const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", ...o }).format(d)
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  return {
    todayMonth: fmt(now, { month: "2-digit" }),
    tomorrowMonth: fmt(tomorrow, { month: "2-digit" }),
    tomorrowDay: fmt(tomorrow, { day: "2-digit" }).replace(/\D/g, "").padStart(2, "0"),
    label: fmt(tomorrow, { month: "long", day: "numeric", weekday: "short" }),
  }
}

export function tomorrowLabel() {
  return kstDates().label
}

export async function checkCourtNow(facilityId: string): Promise<CourtNowResult> {
  const court = BUCHEON_COURTS.find((c) => c.facilityId === facilityId)
  if (!court) return { facilityId, name: "", ok: false, times: [], error: "알 수 없는 테니스장입니다." }

  // 당일 예약은 불가하므로 "내일" 날짜의 시간대를 찾습니다.
  const { todayMonth, tomorrowMonth, tomorrowDay } = kstDates()
  if (todayMonth !== tomorrowMonth) {
    // 예약 사이트의 기본 달력은 이번 달만 읽으므로, 내일이 다음 달 1일이면 아직 조회할 수 없습니다.
    return { facilityId, name: court.name, ok: false, times: [], error: "내일은 다음 달이라 오늘은 조회할 수 없어요. 예약 사이트에서 직접 확인해 주세요." }
  }

  const key = `${facilityId}:${tomorrowDay}`
  try {
    let hit = cache.get(key)
    if (!hit || Date.now() - hit.at > TTL_MS) {
      const slots = await fetchAvailableSlots(facilityId)
      const tomorrow = slots.filter((s) => s.date === tomorrowDay).map((s) => s.time)
      hit = { at: Date.now(), times: [...new Set(tomorrow)] }
      if (cache.size > 100) cache.clear()
      cache.set(key, hit)
    }
    return { facilityId, name: court.name, ok: true, times: [...hit.times].sort() }
  } catch (e) {
    console.error(`[courtToday:${court.name}]`, e)
    return { facilityId, name: court.name, ok: false, times: [], error: "예약 사이트에서 불러오지 못했어요." }
  }
}

export async function checkAllCourtsNow(): Promise<CourtNowResult[]> {
  return Promise.all(BUCHEON_COURTS.map((c) => checkCourtNow(c.facilityId)))
}
