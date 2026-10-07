import { describe, it, expect } from "vitest"
import { regionOf } from "@/lib/region"

describe("regionOf (UT-REG)", () => {
  it.each([
    ["경기도 부천시 원미구 중동로 1", "경기 부천시"],
    ["서울특별시 강남구 테헤란로 1", "서울 강남구"],
    ["제주특별자치도 제주시 연동 1", "제주 제주시"],
    ["인천광역시 부평구 부평대로 1", "인천 부평구"],
    ["세종특별자치시 한누리대로 1", "세종"],
  ])("%s -> %s", (addr, want) => expect(regionOf(addr)).toBe(want))

  it("빈 주소는 기타", () => {
    expect(regionOf("")).toBe("기타")
    expect(regionOf("   ")).toBe("기타")
  })
})
