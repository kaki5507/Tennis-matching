import { describe, it, expect } from "vitest"
import { tierOf, championTitle, trophySize, hasGlow, shelfSlice } from "@/lib/trophies"

describe("trophies", () => {
  it("UT-TRO-001 tierOf", () => {
    expect(tierOf(1)).toBe("gold")
    expect(tierOf(2)).toBe("silver")
    expect(tierOf(3)).toBe("bronze")
  })
  it("UT-TRO-002 championTitle", () => {
    expect(championTitle(0)).toBeNull()
    expect(championTitle(-1)).toBeNull()
    expect(championTitle(1)).toBe("첫 우승")
    expect(championTitle(2)).toBe("2관왕")
    expect(championTitle(3)).toBe("3관왕")
    expect(championTitle(4)).toBe("4관왕")
    expect(championTitle(5)).toBe("전설의 챔피언")
    expect(championTitle(99)).toBe("전설의 챔피언")
  })
  it("UT-TRO-003 trophySize", () => {
    expect([1, 2, 3, 4].map((n) => trophySize("gold", n))).toEqual([56, 66, 76, 76])
    expect([1, 2, 3, 4].map((n) => trophySize("silver", n))).toEqual([44, 50, 56, 56])
    expect([1, 2, 3, 4].map((n) => trophySize("bronze", n))).toEqual([44, 50, 56, 56])
    expect(trophySize("gold", 0)).toBe(56)
  })
  it("UT-TRO-004 hasGlow", () => {
    expect(hasGlow("gold", 1)).toBe(false)
    expect(hasGlow("gold", 2)).toBe(true)
    expect(hasGlow("silver", 5)).toBe(false)
  })
  it("UT-TRO-005 shelfSlice", () => {
    expect(shelfSlice(0)).toEqual({ shown: 0, hidden: 0 })
    expect(shelfSlice(3)).toEqual({ shown: 3, hidden: 0 })
    expect(shelfSlice(8)).toEqual({ shown: 8, hidden: 0 })
    expect(shelfSlice(9)).toEqual({ shown: 8, hidden: 1 })
    expect(shelfSlice(11)).toEqual({ shown: 8, hidden: 3 })
  })
})
