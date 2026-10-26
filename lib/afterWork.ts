// lib/afterWork.ts
// "퇴근 후" 시간대: 평일(공휴일 제외) 저녁 20:00~22:00 안에 끝나는 시간대. 직장인이 치기 좋은 시간이라 따로 표시합니다.
// 순수 함수라 서버/화면 어디서든 같은 기준으로 씁니다.

import { dayKind } from "@/lib/koHolidays"

export const AFTER_WORK_START = 20
export const AFTER_WORK_END = 22

/** date: "YYYY-MM-DD", time: "20:00~22:00" */
export function isAfterWork(date: string, time: string): boolean {
  if (dayKind(date).kind !== "weekday") return false
  const m = time.match(/^(\d{2}):(\d{2})~(\d{2}):(\d{2})$/)
  if (!m) return false
  const start = Number(m[1]) * 60 + Number(m[2])
  const end = Number(m[3]) * 60 + Number(m[4])
  return start >= AFTER_WORK_START * 60 && end <= AFTER_WORK_END * 60 && end > start
}
