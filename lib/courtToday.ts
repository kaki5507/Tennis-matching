// lib/courtToday.ts
// 부천 테니스장의 "예약 가능한 날짜·시간대"를 보여줍니다. (예약은 절대 대신 하지 않습니다)
// 당일 예약은 불가하므로 항상 "내일부터" 보여줍니다. 범위: 내일 / 7일 / 이번 달 남은 날.
// 다음 달 정보는 매월 25일부터 수집하므로, 그 전에는 이번 달을 넘어가는 날짜가 조회에서 빠집니다(truncated).
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

/** 매월 이 날짜부터는 다음 달 예약 현황도 함께 수집·표시 (사용자가 다음 달 일정을 미리 잡는 시기) */
export const NEXT_MONTH_FROM_DAY = 25

/** 한국 시간 기준으로 조회할 날짜 목록 (내일부터). 매월 25일부터는 다음 달 날짜까지 포함됩니다. */
export function getRangeInfo(range: RangeKey): RangeInfo {
  const kst = new Date(Date.now() + 9 * 3600_000)
  const y = kst.getUTCFullYear()
  const m = kst.getUTCMonth()
  const today = kst.getUTCDate()
  const nextEnabled = today >= NEXT_MONTH_FROM_DAY // 이 날부터 다음 달 정보도 수집해 둠
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const nextLastDay = new Date(Date.UTC(y, m + 2, 0)).getUTCDate()

  // 오늘 기준으로 며칠 뒤까지 볼지
  const span = range === "tomorrow" ? 1 : range === "week" ? 7 : nextEnabled ? lastDay - today + nextLastDay : lastDay - today
  const dates: RangeInfo["dates"] = []
  let truncated = false
  for (let i = 1; i <= span; i++) {
    const dt = new Date(Date.UTC(y, m, today + i)) // 월을 넘어가면 자동으로 다음 달/해로 계산됨
    if (dt.getUTCMonth() !== m && !nextEnabled) {
      truncated = true // 아직 다음 달 정보를 모으기 전이라 빠짐
      break
    }
    const dd = dt.getUTCDate()
    dates.push({
      date: `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dd)}`,
      dd: pad(dd),
      label: `${dt.getUTCMonth() + 1}/${dd}(${WEEK[dt.getUTCDay()]})`,
    })
  }
  if (range === "month" && !nextEnabled) truncated = true // 다음 달은 25일부터 보여줘요
  const rangeLabel = dates.length === 0 ? "" : dates.length === 1 ? dates[0].label : `${dates[0].label} ~ ${dates[dates.length - 1].label}`
  return { dates, truncated, rangeLabel }
}

/** 저장된 슬롯(DB)을 "YYYY-MM-DD" 날짜별로 읽기. 부천 사이트에는 접속하지 않습니다. (이번 달 + 25일 이후엔 다음 달 포함) */
async function loadSnapshots() {
  const rows = await prisma.courtAvailabilitySnapshot.findMany()
  const map = new Map<string, { byDate: Record<string, string[]>; updatedAt: Date }>()
  for (const r of rows) {
    const byDate: Record<string, string[]> = {}
    for (const k of r.availableKeys) {
      // 새 형식 "YYYY-MM-DD_시간" 만 사용. 예전 형식("DD_시간")은 다음 수집 때 새 형식으로 바뀜
      const m = k.match(/^(\d{4}-\d{2}-\d{2})_(.+)$/)
      if (!m) continue
      ;(byDate[m[1]] ??= []).push(m[2])
    }
    map.set(r.facilityId, { byDate, updatedAt: r.checkedAt })
  }
  return map
}

function build(court: { facilityId: string; name: string }, info: RangeInfo, snap?: { byDate: Record<string, string[]>; updatedAt: Date }): CourtRangeResult {
  if (info.dates.length === 0) {
    return { facilityId: court.facilityId, name: court.name, ok: false, days: [], error: "조회할 날짜가 없어요. 다음 달 정보는 매월 25일부터 보여요. 예약 사이트에서 직접 확인해 주세요." }
  }
  if (!snap) {
    // 아직 한 번도 수집되지 않음: 오류가 아니라 "빈 결과"로 (화면에서 수집 전이라고만 안내)
    return { facilityId: court.facilityId, name: court.name, ok: true, days: [] }
  }
  const days: CourtDay[] = info.dates
    .map((d) => ({ date: d.date, label: d.label, times: [...(snap.byDate[d.date] ?? [])].sort() }))
    .filter((d) => d.times.length > 0)
  return { facilityId: court.facilityId, name: court.name, ok: true, days, updatedAt: snap.updatedAt.toISOString() }
}

export async function checkCourtRange(facilityId: string, range: RangeKey): Promise<CourtRangeResult> {
  const court = BUCHEON_COURTS.find((c) => c.facilityId === facilityId)
  if (!court) return { facilityId, name: "", ok: false, days: [], error: "알 수 없는 테니스장입니다." }
  try {
    const snaps = await loadSnapshots()
    return build(court, getRangeInfo(range), snaps.get(facilityId))
  } catch (e) {
    console.error(`[courtRange:${court.name}]`, e)
    return { facilityId, name: court.name, ok: false, days: [], error: "정보를 불러오지 못했어요." }
  }
}

export async function checkAllCourtsRange(range: RangeKey): Promise<CourtRangeResult[]> {
  try {
    const snaps = await loadSnapshots()
    const info = getRangeInfo(range)
    return BUCHEON_COURTS.map((c) => build(c, info, snaps.get(c.facilityId)))
  } catch (e) {
    console.error("[courtRange:all]", e)
    return BUCHEON_COURTS.map((c) => ({ facilityId: c.facilityId, name: c.name, ok: false, days: [], error: "정보를 불러오지 못했어요." }))
  }
}
