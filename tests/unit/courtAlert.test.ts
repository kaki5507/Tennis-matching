import { describe, it, expect } from "vitest"
import { slotMatches, normalizeAlertTimes, summarizeSlots } from "@/lib/courtAlert"

// 2026-11-13 = 금요일(평일), 2026-11-14 = 토요일
describe("slotMatches", () => {
  it("아무것도 안 고르면 모든 시간대", () => {
    expect(slotMatches("2026-11-13_09:00~11:00", [])).toBe(true)
  })
  it("퇴근 후: 평일 20~22시만", () => {
    expect(slotMatches("2026-11-13_20:00~22:00", ["afterwork"])).toBe(true)
    expect(slotMatches("2026-11-13_18:00~20:00", ["afterwork"])).toBe(false)
    expect(slotMatches("2026-11-14_20:00~22:00", ["afterwork"])).toBe(false)
  })
  it("저녁: 요일 상관없이 18시 이후 시작", () => {
    expect(slotMatches("2026-11-13_18:00~20:00", ["evening"])).toBe(true)
    expect(slotMatches("2026-11-14_20:00~22:00", ["evening"])).toBe(true)
    expect(slotMatches("2026-11-13_16:00~18:00", ["evening"])).toBe(false)
  })
  it("쉬는 날: 주말은 종일, 평일은 제외", () => {
    expect(slotMatches("2026-11-14_09:00~11:00", ["off"])).toBe(true)
    expect(slotMatches("2026-11-13_09:00~11:00", ["off"])).toBe(false)
  })
  it("여러 개 고르면 하나라도 맞으면 됨", () => {
    expect(slotMatches("2026-11-14_09:00~11:00", ["afterwork", "evening"])).toBe(false)
    expect(slotMatches("2026-11-13_18:00~20:00", ["afterwork", "evening"])).toBe(true)
  })
  it("형식이 이상한 키는 필터가 있으면 제외", () => {
    expect(slotMatches("13_20:00~22:00", ["evening"])).toBe(false)
  })
})

describe("normalizeAlertTimes", () => {
  it("모르는 값과 중복을 제거", () => {
    expect(normalizeAlertTimes(["evening", "x", "evening", 3])).toEqual(["evening"])
    expect(normalizeAlertTimes("evening")).toEqual([])
  })
})

describe("summarizeSlots", () => {
  it("가장 빠른 자리 + 나머지 개수", () => {
    expect(summarizeSlots(["2026-11-14_20:00~22:00", "2026-11-13_20:00~22:00"])).toBe("11/13(금) 20:00~22:00 외 1개")
    expect(summarizeSlots(["2026-11-13_20:00~22:00"])).toBe("11/13(금) 20:00~22:00")
  })
})
