import { describe, it, expect, afterEach } from "vitest"
import { unverifiedSignupAllowed, unverifiedIdentityFor, isIdentityVerified } from "@/lib/portone"

const KEYS = ["PORTONE_API_SECRET", "NEXT_PUBLIC_PORTONE_STORE_ID", "NEXT_PUBLIC_PORTONE_CHANNEL_KEY", "NODE_ENV", "ALLOW_UNVERIFIED_SIGNUP"] as const
const saved: Record<string, string | undefined> = {}
KEYS.forEach((k) => (saved[k] = process.env[k]))

function setEnv(secret: string | undefined, nodeEnv: string, allow: string | undefined, publicKeys = !!secret) {
  const env = process.env as Record<string, string | undefined>
  const set = (k: string, v: string | undefined) => (v === undefined ? delete env[k] : (env[k] = v))
  set("PORTONE_API_SECRET", secret)
  set("NEXT_PUBLIC_PORTONE_STORE_ID", publicKeys ? "store-x" : undefined)
  set("NEXT_PUBLIC_PORTONE_CHANNEL_KEY", publicKeys ? "channel-x" : undefined)
  set("NODE_ENV", nodeEnv)
  set("ALLOW_UNVERIFIED_SIGNUP", allow)
}

afterEach(() => {
  const env = process.env as Record<string, string | undefined>
  KEYS.forEach((k) => (saved[k] === undefined ? delete env[k] : (env[k] = saved[k])))
})

describe("unverifiedSignupAllowed (UT-PRT-001)", () => {
  it.each([
    ["secret", "production", "true", false],
    ["secret", "development", undefined, false],
    [undefined, "development", undefined, true],
    [undefined, "production", undefined, true], // 키가 없으면 운영에서도 기본 허용
    [undefined, "production", "true", true],
    [undefined, "production", "false", false], // 긴급 차단 스위치
    [undefined, "production", "1", true],
    ["secret", "production", undefined, false], // 키가 생기면 자동으로 닫힘
  ])("secret=%s env=%s allow=%s -> %s", (secret, nodeEnv, allow, want) => {
    setEnv(secret as string | undefined, nodeEnv as string, allow as string | undefined)
    expect(unverifiedSignupAllowed()).toBe(want)
  })
})

it("비밀키만 있고 상점ID/채널키가 없으면(설정 미완료) 임시 가입이 열려 있다", () => {
  setEnv("secret", "production", undefined, false)
  expect(unverifiedSignupAllowed()).toBe(true)
})

describe("unverifiedIdentityFor", () => {
  it("UT-PRT-002 대소문자/공백 무시", async () => {
    expect(await unverifiedIdentityFor("A@b.com")).toBe(await unverifiedIdentityFor("  a@B.com "))
  })
  it("UT-PRT-003 접두어 + 64자리 16진수", async () => {
    const v = await unverifiedIdentityFor("a@b.com")
    expect(v).toMatch(/^unverified_[0-9a-f]{64}$/)
    expect(v).toHaveLength(75)
  })
  it("UT-PRT-004 다른 이메일은 다른 값", async () => {
    expect(await unverifiedIdentityFor("a@b.com")).not.toBe(await unverifiedIdentityFor("c@d.com"))
  })
})

describe("isIdentityVerified (UT-PRT-005)", () => {
  it("판정", () => {
    expect(isIdentityVerified("unverified_abc")).toBe(false)
    expect(isIdentityVerified("dev_bypass_x")).toBe(false)
    expect(isIdentityVerified("실제CI값")).toBe(true)
  })
})
