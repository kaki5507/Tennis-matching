import { describe, it, expect } from "vitest"
import { toGender, singleKind, teamKind, teamKindLabel } from "@/lib/gender"

describe("gender", () => {
  it("UT-GEN-001/002 toGender", () => {
    for (const v of ["MALE", "male", " m ", "M"]) expect(toGender(v)).toBe("M")
    for (const v of ["FEMALE", "F", "female"]) expect(toGender(v)).toBe("F")
    for (const v of [null, undefined, "", "other"]) expect(toGender(v)).toBeNull()
  })
  it("UT-GEN-003 singleKind", () => {
    expect(singleKind("MALE")).toBe("M")
    expect(singleKind(null)).toBe("unknown")
  })
  it("UT-GEN-004/005 teamKind", () => {
    expect(teamKind("MALE", "MALE")).toBe("MM")
    expect(teamKind("FEMALE", "FEMALE")).toBe("FF")
    expect(teamKind("MALE", "FEMALE")).toBe("MF")
    expect(teamKind("FEMALE", "MALE")).toBe("MF")
    expect(teamKind(null, "MALE")).toBe("unknown")
    expect(teamKind("MALE", null)).toBe("unknown")
    expect(teamKind(null, null)).toBe("unknown")
  })
  it("UT-GEN-006 teamKindLabel", () => {
    expect(teamKindLabel("MM")).toBe("남복")
    expect(teamKindLabel("FF")).toBe("여복")
    expect(teamKindLabel("MF")).toBe("혼복")
    expect(teamKindLabel("M")).toBe("남성")
    expect(teamKindLabel("F")).toBe("여성")
    expect(teamKindLabel("unknown")).toBe("")
  })
})
