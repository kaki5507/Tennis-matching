// lib/matchDisplay.ts
// 매칭 방 목록/상세 화면의 표시 규칙. 순수 함수라 서버/화면 어디서든 같은 기준으로 쓰고 단위 테스트합니다.
// 경기 날짜/시간은 사용자가 한국 시간으로 입력한 값 그대로 저장되어 있습니다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/** 한국 시간 기준 오늘 날짜 "YYYY-MM-DD" */
export function kstToday(now: number = Date.now()): string {
  return new Date(now + KST_OFFSET_MS).toISOString().slice(0, 10)
}

/** 한국 시간 기준 현재 "YYYY-MM-DDTHH:mm" */
export function kstNowMinute(now: number = Date.now()): string {
  return new Date(now + KST_OFFSET_MS).toISOString().slice(0, 16)
}

/** 두 날짜("YYYY-MM-DD") 사이의 일수 (to - from) */
export function diffDays(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/** "오늘" / "내일" / "D-3" 처럼 경기일까지 남은 날 표시. 지난 날짜면 null, 8일 이상 남으면 null */
export function dayLabel(matchDate: string, now: number = Date.now()): string | null {
  const d = diffDays(kstToday(now), matchDate)
  if (d < 0) return null
  if (d === 0) return "오늘"
  if (d === 1) return "내일"
  if (d <= 7) return `D-${d}`
  return null
}

/** 경기 시작 시각이 이미 지났는지. time 은 "HH:mm" */
export function isPast(matchDate: string, time: string, now: number = Date.now()): boolean {
  return `${matchDate}T${time}` < kstNowMinute(now)
}

/** 경기 종류별 정원. 정해진 정원이 없으면(랠리 등) null */
export function capacityOf(gameType: string): number | null {
  if (gameType === "단식") return 2
  if (gameType === "복식" || gameType === "혼합복식") return 4
  return null
}

/** 참여 확정 인원(방장 포함) 표시용 계산 */
export function seatInfo(gameType: string, acceptedCount: number, recruitCount?: number | null) {
  const joined = acceptedCount + 1 // 방장
  // 복식에서 방장이 지인과 함께 온다면 "모집 인원(방장 제외)"만큼만 받음: 정원 = 방장 + 모집 인원
  const capacity = recruitCount != null && recruitCount > 0 ? 1 + recruitCount : capacityOf(gameType)
  const full = capacity !== null && joined >= capacity
  const ratio = capacity === null ? null : Math.min(1, joined / capacity)
  return { joined, capacity, full, ratio }
}
