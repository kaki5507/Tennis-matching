import { describe, it, expect } from "vitest"
import { kstToday, kstNowMinute, diffDays, dayLabel, isPast, capacityOf, seatInfo } from "@/lib/matchDisplay"

// 기준 시각: 2026-10-07 19:00 KST = 2026-10-07 10:00 UTC
const NOW = Date.parse("2026-10-07T10:00:00Z")

describe("matchDisplay", () => {
  it("kstToday: 자정 경계(KST)", () => {
    expect(kstToday(Date.parse("2026-10-06T14:59:59Z"))).toBe("2026-10-06")
    expect(kstToday(Date.parse("2026-10-06T15:00:00Z"))).toBe("2026-10-07")
  })
  it("kstNowMinute", () => expect(kstNowMinute(NOW)).toBe("2026-10-07T19:00"))
  it("diffDays", () => {
    expect(diffDays("2026-10-07", "2026-10-07")).toBe(0)
    expect(diffDays("2026-10-07", "2026-10-10")).toBe(3)
    expect(diffDays("2026-10-07", "2026-10-06")).toBe(-1)
    expect(diffDays("2026-10-30", "2026-11-02")).toBe(3)
  })
  it("dayLabel", () => {
    expect(dayLabel("2026-10-06", NOW)).toBeNull()
    expect(dayLabel("2026-10-07", NOW)).toBe("오늘")
    expect(dayLabel("2026-10-08", NOW)).toBe("내일")
    expect(dayLabel("2026-10-10", NOW)).toBe("D-3")
    expect(dayLabel("2026-10-14", NOW)).toBe("D-7")
    expect(dayLabel("2026-10-15", NOW)).toBeNull()
  })
  it("isPast: 같은 분은 지나지 않음", () => {
    expect(isPast("2026-10-07", "18:59", NOW)).toBe(true)
    expect(isPast("2026-10-07", "19:00", NOW)).toBe(false)
    expect(isPast("2026-10-08", "00:00", NOW)).toBe(false)
    expect(isPast("2026-10-06", "23:59", NOW)).toBe(true)
  })
  it("capacityOf / seatInfo", () => {
    expect(capacityOf("단식")).toBe(2)
    expect(capacityOf("복식")).toBe(4)
    expect(capacityOf("혼합복식")).toBe(4)
    expect(capacityOf("랠리")).toBeNull()
    expect(seatInfo("단식", 0)).toEqual({ joined: 1, capacity: 2, full: false, ratio: 0.5 })
    expect(seatInfo("단식", 1)).toEqual({ joined: 2, capacity: 2, full: true, ratio: 1 })
    expect(seatInfo("복식", 2)).toMatchObject({ joined: 3, full: false, ratio: 0.75 })
    expect(seatInfo("복식", 9)).toMatchObject({ joined: 10, full: true, ratio: 1 })
    expect(seatInfo("랠리", 3)).toEqual({ joined: 4, capacity: null, full: false, ratio: null })
  })
})
