// lib/courtToday.ts
// "지금 이 시각 기준, 오늘 남아 있는 코트 시간대"를 조회합니다. (조회만 하며 예약은 절대 대신 하지 않습니다)
// 예약 사이트에 부담이 가지 않도록 시설별 결과를 3분간 서버 메모리에 기억합니다.

import { fetchAvailableSlots } from "@/lib/bucheonScraper"
import { BUCHEON_COURTS } from "@/lib/bucheonCourts"

export interface CourtNowResult {
  facilityId: string
  name: string
  ok: boolean
  /** 오늘 아직 시작 전인 예약 가능 시간대 ("19:00~21:00") */
  times: string[]
  error?: string
}

const TTL_MS = 3 * 60_000
const cache = new Map<string, { at: number; times: string[] }>()

function kstNow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date())
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00"
  const hour = Number(get("hour")) % 24
  return { day: get("day"), minutes: hour * 60 + Number(get("minute")) }
}

export async function checkCourtNow(facilityId: string): Promise<CourtNowResult> {
  const court = BUCHEON_COURTS.find((c) => c.facilityId === facilityId)
  if (!court) return { facilityId, name: "", ok: false, times: [], error: "알 수 없는 테니스장입니다." }

  const { day, minutes } = kstNow()
  try {
    let hit = cache.get(facilityId)
    if (!hit || Date.now() - hit.at > TTL_MS) {
      const slots = await fetchAvailableSlots(facilityId)
      // 날짜는 "이번 달의 일(DD)"이므로 오늘 날짜만 남기고, 이미 시작한 시간대는 뺍니다.
      const today = slots
        .filter((s) => s.date === day)
        .map((s) => s.time)
      hit = { at: Date.now(), times: [...new Set(today)] }
      if (cache.size > 100) cache.clear()
      cache.set(facilityId, hit)
    }
    const times = hit.times
      .filter((t) => {
        const m = t.match(/^(\d{2}):(\d{2})/)
        return m ? Number(m[1]) * 60 + Number(m[2]) > minutes : true
      })
      .sort()
    return { facilityId, name: court.name, ok: true, times }
  } catch (e) {
    console.error(`[courtToday:${court.name}]`, e)
    return { facilityId, name: court.name, ok: false, times: [], error: "예약 사이트에서 불러오지 못했어요." }
  }
}

export async function checkAllCourtsNow(): Promise<CourtNowResult[]> {
  return Promise.all(BUCHEON_COURTS.map((c) => checkCourtNow(c.facilityId)))
}
