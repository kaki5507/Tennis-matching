// lib/courtToday.ts
// 부천 테니스장의 "예약 가능한 날짜·시간대"를 보여줍니다. (예약은 절대 대신 하지 않습니다)
// 당일 예약은 불가하므로 항상 "내일부터" 보여줍니다. 범위: 내일 / 7일 / 이번 달 남은 날.
// 예약 사이트의 기본 달력은 이번 달만 읽을 수 있어서, 이번 달을 넘어가는 날짜는 조회에서 빠집니다(truncated).
// 데이터는 크롤러(매시 정각, 오전 9시~밤 11시)가 DB에 저장해 둔 것을 읽기만 합니다.

import { prisma } from "@/lib/tournamentData"
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
  /** 이 코트 정보를 마지막으로 수집한 시각 (ISO) */
  updatedAt?: string
  error?: string
}

export interface RangeInfo {
  dates: { date: string; dd: string; label: string }[]
  truncated: boolean
  rangeLabel: string
}

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

/** 저장된 이번 달 슬롯(DB)을 날짜별로 읽기. 부천 사이트에는 접속하지 않습니다. */
async function loadSnapshots(monthPrefix: string) {
  const rows = await prisma.courtAvailabilitySnapshot.findMany()
  const map = new Map<string, { byDay: Record<string, string[]>; updatedAt: Date }>()
  for (const r of rows) {
    const byDay: Record<string, string[]> = {}
    for (const k of r.availableKeys) {
      // 새 형식 "YYYY-MM-DD_시간" 만 사용 (이번 달 것만). 예전 형식은 다음 수집 때 새 형식으로 바뀜
      const m = k.match(/^(\d{4}-\d{2})-(\d{2})_(.+)$/)
      if (!m || m[1] !== monthPrefix) continue
      ;(byDay[m[2]] ??= []).push(m[3])
    }
    map.set(r.facilityId, { byDay, updatedAt: r.checkedAt })
  }
  return map
}

function monthPrefixKst() {
  const kst = new Date(Date.now() + 9 * 3600_000)
  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}`
}

function build(court: { facilityId: string; name: string }, info: RangeInfo, snap?: { byDay: Record<string, string[]>; updatedAt: Date }): CourtRangeResult {
  if (info.dates.length === 0) {
    return { facilityId: court.facilityId, name: court.name, ok: false, days: [], error: "다음 달 달력은 아직 조회할 수 없어요. 예약 사이트에서 직접 확인해 주세요." }
  }
  if (!snap) {
    // 아직 한 번도 수집되지 않음: 오류가 아니라 "빈 결과"로 (화면에서 수집 전이라고만 안내)
    return { facilityId: court.facilityId, name: court.name, ok: true, days: [] }
  }
  const days: CourtDay[] = info.dates
    .map((d) => ({ date: d.date, label: d.label, times: [...(snap.byDay[d.dd] ?? [])].sort() }))
    .filter((d) => d.times.length > 0)
  return { facilityId: court.facilityId, name: court.name, ok: true, days, updatedAt: snap.updatedAt.toISOString() }
}

export async function checkCourtRange(facilityId: string, range: RangeKey): Promise<CourtRangeResult> {
  const court = BUCHEON_COURTS.find((c) => c.facilityId === facilityId)
  if (!court) return { facilityId, name: "", ok: false, days: [], error: "알 수 없는 테니스장입니다." }
  try {
    const snaps = await loadSnapshots(monthPrefixKst())
    return build(court, getRangeInfo(range), snaps.get(facilityId))
  } catch (e) {
    console.error(`[courtRange:${court.name}]`, e)
    return { facilityId, name: court.name, ok: false, days: [], error: "정보를 불러오지 못했어요." }
  }
}

export async function checkAllCourtsRange(range: RangeKey): Promise<CourtRangeResult[]> {
  try {
    const snaps = await loadSnapshots(monthPrefixKst())
    const info = getRangeInfo(range)
    return BUCHEON_COURTS.map((c) => build(c, info, snaps.get(c.facilityId)))
  } catch (e) {
    console.error("[courtRange:all]", e)
    return BUCHEON_COURTS.map((c) => ({ facilityId: c.facilityId, name: c.name, ok: false, days: [], error: "정보를 불러오지 못했어요." }))
  }
}
