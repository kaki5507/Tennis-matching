import { describe, it, expect, vi } from "vitest"

// DB/Next 캐시에 의존하지 않도록 모듈 모킹 (순수 함수만 검증)
vi.mock("next/cache", () => ({ unstable_cache: <T,>(fn: T) => fn }))
vi.mock("@/lib/tournamentData", () => ({ prisma: {} }))

import { isEffectivelyOn } from "@/lib/maintenance"
import { AUDIT_ACTIONS, AUDIT_GROUPS, actionLabel } from "@/lib/auditActions"

const now = Date.parse("2026-10-07T00:00:00Z")
const state = (enabled: boolean, endsAt: string | null) => ({ enabled, message: null, endsAt })

describe("isEffectivelyOn (UT-MNT)", () => {
  it("001 꺼져 있으면 종료 시각이 미래여도 false", () => {
    expect(isEffectivelyOn(state(false, "2026-10-08T00:00:00Z"), now)).toBe(false)
  })
  it("002 켜짐 + 종료 시각 없음", () => expect(isEffectivelyOn(state(true, null), now)).toBe(true))
  it("003 켜짐 + 종료 시각 과거 -> 자동 해제", () => {
    expect(isEffectivelyOn(state(true, "2026-10-06T23:59:59Z"), now)).toBe(false)
  })
  it("004 켜짐 + 종료 시각 미래", () => {
    expect(isEffectivelyOn(state(true, "2026-10-07T00:00:01Z"), now)).toBe(true)
  })
  it("005 종료 시각 == 현재 -> 해제", () => {
    expect(isEffectivelyOn(state(true, "2026-10-07T00:00:00Z"), now)).toBe(false)
  })
})

describe("auditActions (UT-AUD)", () => {
  it("001/002 actionLabel", () => {
    expect(actionLabel("USER_BAN")).toBe("회원 정지")
    expect(actionLabel("MAINTENANCE_ON")).toBe("점검 모드 켬")
    expect(actionLabel("UNKNOWN_CODE")).toBe("UNKNOWN_CODE")
  })
  it("003 모든 액션의 group/tone 이 유효", () => {
    for (const [code, v] of Object.entries(AUDIT_ACTIONS)) {
      expect(AUDIT_GROUPS, code).toContain(v.group)
      expect(["danger", "ok", "info"], code).toContain(v.tone)
    }
  })
})
