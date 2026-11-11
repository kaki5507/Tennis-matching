// lib/courtAlert.ts
// 빈 코트 알림을 "원하는 시간대만" 받기 위한 규칙. 순수 함수라 크롤러/화면/테스트가 같은 기준을 씁니다.
// 슬롯 키 형식: "YYYY-MM-DD_HH:MM~HH:MM"

import { dayKind } from "@/lib/koHolidays"
import { isAfterWork } from "@/lib/afterWork"

export const EVENING_START = 18 // 저녁: 18시 이후에 시작하는 시간대 (요일 무관)

export const COURT_ALERT_OPTIONS = [
  { key: "afterwork", label: "퇴근 후", hint: "평일 20~22시" },
  { key: "evening", label: "저녁", hint: "매일 18시 이후" },
  { key: "off", label: "쉬는 날", hint: "주말·공휴일 종일" },
] as const

export type CourtAlertTime = (typeof COURT_ALERT_OPTIONS)[number]["key"]
const VALID = new Set<string>(COURT_ALERT_OPTIONS.map((o) => o.key))

/** 저장 전 정리: 모르는 값 제거 + 중복 제거. 빈 배열 = 모든 시간대 */
export function normalizeAlertTimes(input: unknown): CourtAlertTime[] {
  if (!Array.isArray(input)) return []
  return [...new Set(input.filter((v): v is CourtAlertTime => typeof v === "string" && VALID.has(v)))]
}

function parseKey(key: string): { date: string; time: string; startHour: number } | null {
  const m = key.match(/^(\d{4}-\d{2}-\d{2})_((\d{2}):\d{2}~\d{2}:\d{2})$/)
  if (!m) return null
  return { date: m[1], time: m[2], startHour: Number(m[3]) }
}

/** 이 슬롯이 사용자가 고른 시간대 중 하나라도 해당하는지. 아무것도 안 골랐으면 전부 해당 */
export function slotMatches(key: string, times: readonly string[]): boolean {
  if (times.length === 0) return true
  const s = parseKey(key)
  if (!s) return false
  if (times.includes("afterwork") && isAfterWork(s.date, s.time)) return true
  if (times.includes("evening") && s.startHour >= EVENING_START) return true
  if (times.includes("off") && dayKind(s.date).kind !== "weekday") return true
  return false
}

const DOW = ["일", "월", "화", "수", "목", "금", "토"]

/** 알림 본문용 요약: "11/13(금) 20:00~22:00 외 2개" */
export function summarizeSlots(keys: readonly string[]): string {
  const sorted = [...keys].sort()
  const s = sorted.length ? parseKey(sorted[0]) : null
  if (!s) return `${keys.length}개`
  const [y, mo, d] = s.date.split("-").map(Number)
  const dow = DOW[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()]
  const first = `${mo}/${d}(${dow}) ${s.time}`
  return sorted.length > 1 ? `${first} 외 ${sorted.length - 1}개` : first
}
