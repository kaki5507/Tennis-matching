import { describe, it, expect } from "vitest"
import { nextPowerOfTwo, seedOrder, buildBracket, roundName } from "@/lib/bracket"

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`)

describe("nextPowerOfTwo (UT-BRK-001)", () => {
  it.each([[0, 2], [1, 2], [2, 2], [3, 4], [4, 4], [5, 8], [8, 8], [9, 16], [16, 16], [17, 32]])("%i -> %i", (n, want) => {
    expect(nextPowerOfTwo(n)).toBe(want)
  })
})

describe("seedOrder (UT-BRK-002)", () => {
  it("표준 시드 배치", () => {
    expect(seedOrder(2)).toEqual([1, 2])
    expect(seedOrder(4)).toEqual([1, 4, 2, 3])
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6])
  })
  it("16강: 길이 16, 1번과 2번 시드는 반대편 절반", () => {
    const o = seedOrder(16)
    expect(o).toHaveLength(16)
    expect(o.indexOf(1)).toBeLessThan(8)
    expect(o.indexOf(2)).toBeGreaterThanOrEqual(8)
  })
})

describe("buildBracket", () => {
  it("UT-BRK-003: 2명 미만이면 오류", () => {
    expect(() => buildBracket([])).toThrow()
    expect(() => buildBracket(["a"])).toThrow("2명 이상")
  })

  it("UT-BRK-004: 2명 -> 결승 1경기, 부전승/3·4위전 없음", () => {
    const b = buildBracket(ids(2))
    expect(b).toHaveLength(1)
    expect(b[0]).toMatchObject({ round: 1, isBye: false, isThirdPlace: false })
  })

  it("UT-BRK-005: 3명 -> 3경기, 부전승 승자가 결승에 자동 진출, 3·4위전 없음", () => {
    const b = buildBracket(ids(3))
    expect(b).toHaveLength(3)
    expect(b.some((m) => m.isThirdPlace)).toBe(false)
    const r1 = b.filter((m) => m.round === 1)
    expect(r1[0]).toMatchObject({ player1Id: "p1", player2Id: null, isBye: true, winnerId: "p1" })
    expect(r1[1]).toMatchObject({ player1Id: "p2", player2Id: "p3", isBye: false })
    const final = b.find((m) => m.round === 2 && !m.isThirdPlace)!
    expect(final.player1Id).toBe("p1")
    expect(final.player2Id).toBeNull()
  })

  it("UT-BRK-006: 4명 -> 4경기(3·4위전 포함), 1R은 1v4, 2v3", () => {
    const b = buildBracket(ids(4))
    expect(b).toHaveLength(4)
    const third = b.filter((m) => m.isThirdPlace)
    expect(third).toHaveLength(1)
    expect(third[0]).toMatchObject({ round: 2, position: 0 })
    const r1 = b.filter((m) => m.round === 1)
    expect([r1[0].player1Id, r1[0].player2Id]).toEqual(["p1", "p4"])
    expect([r1[1].player1Id, r1[1].player2Id]).toEqual(["p2", "p3"])
  })

  it("UT-BRK-007: 5명 -> 8경기, 부전승 3개, 2R 슬롯", () => {
    const b = buildBracket(ids(5))
    expect(b).toHaveLength(8)
    expect(b.filter((m) => m.isBye)).toHaveLength(3)
    const r2 = b.filter((m) => m.round === 2)
    expect(r2[0]).toMatchObject({ player1Id: "p1", player2Id: null })
    expect(r2[1]).toMatchObject({ player1Id: "p2", player2Id: "p3" })
  })

  it("UT-BRK-008: 8명 -> 부전승 0개, 총 8경기", () => {
    const b = buildBracket(ids(8))
    expect(b.filter((m) => m.isBye)).toHaveLength(0)
    expect(b).toHaveLength(8)
  })

  it("UT-BRK-009/010: 3·4위전은 최대 1개, 부전승이 아닌 경기의 승자는 비어 있음", () => {
    for (let n = 2; n <= 16; n++) {
      const b = buildBracket(ids(n))
      expect(b.filter((m) => m.isThirdPlace).length).toBeLessThanOrEqual(1)
      for (const m of b) if (!m.isBye) expect(m.winnerId).toBeNull()
    }
  })
})

describe("roundName (UT-BRK-011)", () => {
  it.each([[1, 1, "결승"], [1, 2, "4강"], [2, 2, "결승"], [1, 3, "8강"], [2, 3, "4강"], [3, 3, "결승"], [1, 4, "16강"]])(
    "(%i,%i) -> %s",
    (r, t, want) => expect(roundName(r, t)).toBe(want)
  )
})
