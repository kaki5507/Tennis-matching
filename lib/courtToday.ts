// lib/courtToday.ts
// 부천 테니스장의 "예약 가능한 날짜·시간대"를 조회합니다. (조회만 하며 예약은 절대 대신 하지 않습니다)
// 당일 예약은 불가하므로 항상 "내일부터" 보여줍니다. 범위: 내일 / 7일 / 이번 달 남은 날.
// 예약 사이트의 기본 달력은 이번 달만 읽을 수 있어서, 이번 달을 넘어가는 날짜는 조회에서 빠집니다(truncated).
// 시설별 결과(달 전체)는 3분간 서버 메모리에 기억해 사이트에 부담을 주지 않습니다.

import { fetchAvailableSlots } from "@/lib/bucheonScraper"
import { BUCHEON_COURTS } from "@/lib/bucheonCourts"

export type RangeKey = "tomorrow" | "week" | "month"

export interface CourtDay {
  date: string // YYYY-MM-DD
  label: string // 10/9(금)
  times: string[] // "09:00~11:00"
}

export interface CourtRangeResult {
  facilityId: string
  name: string
  ok: boolean
  days: CourtDay[]
  error?: string
}

export interface RangeInfo {
  dates: { date: string; dd: string; label: string }[]
  truncated: boolean
  rangeLabel: string
}

const TTL_MS = 3 * 60_000
const cache = new Map<string, { at: number; byDay: Record<string, string[]> }>()
const WEEK = ["일", "월", "화", "수", "목", "금", "토"]

const pad = (n: number) => String(n).padStart(2, "0")

/** 한국 시간 기준으로 조회할 날짜 목록 (내일부터, 이번 달 안에서만) */
export function getRangeInfo(range: RangeKey): RangeInfo {
  const kst = new Date(Date.now() + 9 * 3600_000)
  const y = kst.getUTCFullYear()
  const m = kst.getUTCMonth()
  const today = kst.getUTCDate()
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const want = range === "tomorrow" ? 1 : range === "week" ? 7 : 31
  const dates: RangeInfo["dates"] = []
  let truncated = false
  for (let i = 1; i <= Math.min(want, 31); i++) {
    const d = today + i
    if (range !== "month" && i > want) break
    if (d > lastDay) {
      if (range !== "month") truncated = true
      break
    }
    const dow = WEEK[new Date(Date.UTC(y, m, d)).getUTCDay()]
    dates.push({ date: `${y}-${pad(m + 1)}-${pad(d)}`, dd: pad(d), label: `${m + 1}/${d}(${dow})` })
  }
  if (range === "month") truncated = true // 다음 달은 조회 불가
  const rangeLabel = dates.length === 0 ? "" : dates.length === 1 ? dates[0].label : `${dates[0].label} ~ ${dates[dates.length - 1].label}`
  return { dates, truncated, rangeLabel }
}

async function monthSlots(facilityId: string) {
  const hit = cache.get(facilityId)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.byDay
  const slots = await fetchAvailableSlots(facilityId)
  const byDay: Record<string, string[]> = {}
  for (const s of slots) {
    const list = (byDay[s.date] ??= [])
    if (!list.includes(s.time)) list.push(s.time)
  }
  if (cache.size > 100) cache.clear()
  cache.set(facilityId, { at: Date.now(), byDay })
  return byDay
}

export async function checkCourtRange(facilityId: string, range: RangeKey): Promise<CourtRangeResult> {
  const court = BUCHEON_COURTS.find((c) => c.facilityId === facilityId)
  if (!court) return { facilityId, name: "", ok: false, days: [], error: "알 수 없는 테니스장입니다." }

  const info = getRangeInfo(range)
  if (info.dates.length === 0) {
    return { facilityId, name: court.name, ok: false, days: [], error: "다음 달 달력은 아직 조회할 수 없어요. 예약 사이트에서 직접 확인해 주세요." }
  }
  try {
    const byDay = await monthSlots(facilityId)
    const days: CourtDay[] = info.dates
      .map((d) => ({ date: d.date, label: d.label, times: [...(byDay[d.dd] ?? [])].sort() }))
      .filter((d) => d.times.length > 0)
    return { facilityId, name: court.name, ok: true, days }
  } catch (e) {
    console.error(`[courtRange:${court.name}]`, e)
    return { facilityId, name: court.name, ok: false, days: [], error: "예약 사이트에서 불러오지 못했어요." }
  }
}

export async function checkAllCourtsRange(range: RangeKey): Promise<CourtRangeResult[]> {
  return Promise.all(BUCHEON_COURTS.map((c) => checkCourtRange(c.facilityId, range)))
}
