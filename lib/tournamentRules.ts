// lib/tournamentRules.ts
// 대회 참가 자격 검사. DB와 무관한 순수 함수라서 단식 신청, 복식 팀 신청,
// 파트너 수락 등 여러 곳에서 같은 규칙을 쓰고, 따로 테스트할 수도 있습니다.

/** 자격 검사에 필요한 선수 정보 (Prisma Decimal 등은 숫자로 바꿔서 넘깁니다) */
export interface PlayerInfo {
  nickname: string | null;
  ntrpScore: number | null;
  ntrpCount: number;
  mannerScore: number;
  isBanned: boolean;
}

export interface TournamentRule {
  minNtrp: number;
  maxNtrp: number;
  minMannerScore: number | null;
  maxTeamNtrp: number | null; // 복식 합산 상한
}

export type EligibilityResult = { ok: true } | { ok: false; reason: string };

/** 평가가 이만큼 쌓여야 "검증된 실력"으로 봅니다 (매칭 레벨 제한과 같은 기준) */
export const MIN_EVALUATIONS = 3;

/** 선수 한 명이 대회 조건을 만족하는지. who는 오류 문구에 쓰는 호칭입니다. */
export function checkPlayer(player: PlayerInfo, rule: TournamentRule, who = "회원님"): EligibilityResult {
  const name = who === "회원님" ? "회원님" : `${who}님`;

  if (player.isBanned) {
    return { ok: false, reason: `${name}의 계정은 이용이 제한되어 있어 신청할 수 없어요.` };
  }
  if (player.ntrpCount < MIN_EVALUATIONS) {
    return { ok: false, reason: `${name}의 실력 평가가 ${MIN_EVALUATIONS}회 이상 쌓여야 대회에 참가할 수 있어요.` };
  }

  const score = player.ntrpScore ?? 0;
  if (score < rule.minNtrp || score > rule.maxNtrp) {
    return {
      ok: false,
      reason: `${name}의 실력(NTRP ${score.toFixed(1)})이 이 대회 조건(${rule.minNtrp.toFixed(1)}~${rule.maxNtrp.toFixed(1)})에 맞지 않아요.`,
    };
  }
  if (rule.minMannerScore !== null && player.mannerScore < rule.minMannerScore) {
    return { ok: false, reason: `${name}의 매너 온도가 기준(${rule.minMannerScore.toFixed(1)}도)보다 낮아요.` };
  }
  return { ok: true };
}

/** 복식 팀(두 명)이 대회 조건을 만족하는지. 각자 조건 + 합산 NTRP 상한을 함께 봅니다. */
export function checkTeam(a: PlayerInfo, b: PlayerInfo, rule: TournamentRule): EligibilityResult {
  const first = checkPlayer(a, rule, a.nickname ?? "신청자");
  if (!first.ok) return first;
  const second = checkPlayer(b, rule, b.nickname ?? "파트너");
  if (!second.ok) return second;

  if (rule.maxTeamNtrp !== null) {
    const sum = teamNtrp(a, b);
    if (sum > rule.maxTeamNtrp) {
      return {
        ok: false,
        reason: `두 분의 합산 NTRP(${sum.toFixed(1)})가 이 대회의 상한(${rule.maxTeamNtrp.toFixed(1)})을 넘어요.`,
      };
    }
  }
  return { ok: true };
}

/** 팀 합산 NTRP (시드 배정과 합산 상한 검사에 같이 씁니다) */
export function teamNtrp(a: Pick<PlayerInfo, "ntrpScore">, b: Pick<PlayerInfo, "ntrpScore">): number {
  return Math.round(((a.ntrpScore ?? 0) + (b.ntrpScore ?? 0)) * 10) / 10;
}

/** 복식 팀 표시 이름. 예: "김철수 · 이영희" */
export function teamLabel(a: string | null, b: string | null): string {
  return `${a || "익명"} · ${b || "익명"}`;
}
