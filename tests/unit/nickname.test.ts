import { describe, it, expect } from "vitest"
import { normalizeNickname, nicknameFormatError } from "@/lib/nickname"

describe("normalizeNickname", () => {
  it("앞뒤 공백 제거 및 연속 공백 축소", () => {
    expect(normalizeNickname("  테니스   왕자 ")).toBe("테니스 왕자")
  })
  it("보이지 않는 문자 제거 (중복 우회 방지)", () => {
    expect(normalizeNickname("테​니스")).toBe("테니스")
  })
  it("null/undefined 는 빈 문자열", () => {
    expect(normalizeNickname(null)).toBe("")
    expect(normalizeNickname(undefined)).toBe("")
  })
})

describe("nicknameFormatError", () => {
  it("1자 / 21자는 거부", () => {
    expect(nicknameFormatError("a")).not.toBeNull()
    expect(nicknameFormatError("a".repeat(21))).not.toBeNull()
  })
  it("2자 / 20자는 허용", () => {
    expect(nicknameFormatError("ab")).toBeNull()
    expect(nicknameFormatError("a".repeat(20))).toBeNull()
  })
})
