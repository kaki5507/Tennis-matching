// lib/trophies.ts
// 프로필 트로피 진열장의 규칙. 순수 함수라서 화면과 서버 어디서든 같은 기준으로 씁니다.

export type TrophyTier = "gold" | "silver" | "bronze";

export const TIER_LABEL: Record<TrophyTier, string> = {
  gold: "우승",
  silver: "준우승",
  bronze: "3위",
};

/** 등수(1/2/3) → 트로피 등급 */
export function tierOf(place: 1 | 2 | 3): TrophyTier {
  return place === 1 ? "gold" : place === 2 ? "silver" : "bronze";
}

/** 우승 횟수에 따른 칭호. 우승이 없으면 null */
export function championTitle(wins: number): string | null {
  if (wins <= 0) return null;
  if (wins === 1) return "첫 우승";
  if (wins === 2) return "2관왕";
  if (wins === 3) return "3관왕";
  if (wins === 4) return "4관왕";
  return "전설의 챔피언";
}

/**
 * 트로피 하나의 크기(px). 같은 등급을 많이 딸수록 진열장에서 더 크고 눈에 띕니다.
 * 금: 1개 56 → 2개 66 → 3개 이상 76 / 은·동은 한 단계 작게 시작합니다.
 */
export function trophySize(tier: TrophyTier, count: number): number {
  const base = tier === "gold" ? 56 : 44;
  const step = tier === "gold" ? 10 : 6;
  return base + Math.min(Math.max(count - 1, 0), 2) * step;
}

/** 이 등급이 반짝이는 효과(글로우)를 받을지: 금 트로피를 2개 이상 딴 경우 */
export function hasGlow(tier: TrophyTier, count: number): boolean {
  return tier === "gold" && count >= 2;
}

/** 한 줄에 다 그리기엔 너무 많을 때, 진열장에는 최대 몇 개까지 그릴지 */
export const MAX_SHELF = 8;

/** 트로피 개수 → 진열장에 그릴 개수와 "+N" 표시 */
export function shelfSlice(count: number): { shown: number; hidden: number } {
  const shown = Math.min(count, MAX_SHELF);
  return { shown, hidden: count - shown };
}
