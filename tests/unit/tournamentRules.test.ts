import { describe, it, expect } from "vitest"
import {
  checkPlayer,
  checkTeam,
  teamAvgNtrp,
  formatNtrp,
  teamLabel,
  type PlayerInfo,
  type TournamentRule,
} from "@/lib/tournamentRules"

const rule: TournamentRule = { minNtrp: 2.0, maxNtrp: 3.5, minMannerScore: 30, maxTeamAvgNtrp: 3.0 }
const ok: PlayerInfo = { nickname: "가", ntrpScore: 3.0, ntrpCount: 5, mannerScore: 36.5, isBanned: false }
const p = (o: Partial<PlayerInfo>): PlayerInfo => ({ ...ok, ...o })

describe("checkPlayer", () => {
  it("UT-RUL-001 적격", () => expect(checkPlayer(ok, rule)).toEqual({ ok: true }))

  it("UT-RUL-002 정지 계정", () => {
    const r = checkPlayer(p({ isBanned: true }), rule)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain("이용이 제한")
  })

  it("UT-RUL-003/004 평가 횟수 경계(3회)", () => {
    const fail = checkPlayer(p({ ntrpCount: 2 }), rule)
    expect(fail.ok).toBe(false)
    if (!fail.ok) expect(fail.reason).toContain("3회 이상")
    expect(checkPlayer(p({ ntrpCount: 3 }), rule).ok).toBe(true)
  })

  it("UT-RUL-005/006/007 NTRP 경계", () => {
    const low = checkPlayer(p({ ntrpScore: 1.9 }), rule)
    expect(low.ok).toBe(false)
    if (!low.ok) {
      expect(low.reason).toContain("1.9")
      expect(low.reason).toContain("2.0~3.5")
    }
    expect(checkPlayer(p({ ntrpScore: 2.0 }), rule).ok).toBe(true)
    expect(checkPlayer(p({ ntrpScore: 3.5 }), rule).ok).toBe(true)
    expect(checkPlayer(p({ ntrpScore: 3.6 }), rule).ok).toBe(false)
  })

  it("UT-RUL-008 점수 없음은 0으로 간주되어 부적격", () => {
    expect(checkPlayer(p({ ntrpScore: null }), rule).ok).toBe(false)
  })

  it("UT-RUL-009/010 매너 경계와 기준 없음", () => {
    expect(checkPlayer(p({ mannerScore: 29.9 }), rule).ok).toBe(false)
    expect(checkPlayer(p({ mannerScore: 30 }), rule).ok).toBe(true)
    expect(checkPlayer(p({ mannerScore: 0 }), { ...rule, minMannerScore: null }).ok).toBe(true)
  })

  it("UT-RUL-011 who 호칭", () => {
    const r = checkPlayer(p({ ntrpCount: 0 }), rule, "홍길동")
    if (!r.ok) expect(r.reason.startsWith("홍길동님")).toBe(true)
    else throw new Error("부적격이어야 함")
  })
})

describe("teamAvgNtrp / checkTeam", () => {
  it("UT-RUL-012/013/014 평균 계산", () => {
    expect(teamAvgNtrp({ ntrpScore: 2.5 }, { ntrpScore: 3.0 })).toBe(2.75)
    expect(teamAvgNtrp({ ntrpScore: null }, { ntrpScore: 3.0 })).toBe(1.5)
    expect(teamAvgNtrp({ ntrpScore: 0.1 }, { ntrpScore: 0.2 })).toBe(0.15)
  })

  it("UT-RUL-015 평균이 상한과 같으면 통과", () => {
    expect(checkTeam(ok, ok, rule)).toEqual({ ok: true })
  })

  it("UT-RUL-016 평균 상한 초과", () => {
    const r = checkTeam(p({ ntrpScore: 3.0 }), p({ ntrpScore: 3.5 }), rule)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.reason).toContain("3.25")
      expect(r.reason).toContain("3.0")
    }
  })

  it("UT-RUL-017 신청자 부적격이면 신청자 사유를 먼저 반환", () => {
    const r = checkTeam(p({ nickname: "신청자", isBanned: true }), p({ nickname: "파트너", ntrpCount: 0 }), rule)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain("신청자님")
  })

  it("UT-RUL-018 평균 상한 없음", () => {
    expect(checkTeam(p({ ntrpScore: 3.0 }), p({ ntrpScore: 3.5 }), { ...rule, maxTeamAvgNtrp: null }).ok).toBe(true)
  })
})

describe("표시 함수", () => {
  it("UT-RUL-019 formatNtrp", () => {
    expect(formatNtrp(2.75)).toBe("2.75")
    expect(formatNtrp(3)).toBe("3.0")
    expect(formatNtrp(2.5)).toBe("2.5")
    expect(formatNtrp(2)).toBe("2.0")
    expect(formatNtrp(2.754)).toBe("2.75")
  })
  it("UT-RUL-020 teamLabel", () => {
    expect(teamLabel("김철수", "이영희")).toBe("김철수 · 이영희")
    expect(teamLabel(null, "이영희")).toBe("익명 · 이영희")
    expect(teamLabel("", "")).toBe("익명 · 익명")
  })
})
