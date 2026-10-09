// lib/levels.ts
// 레벨 규칙 (순수 함수). 경기 수 · 방문일 · 대회 참가 · 매너 온도를 합쳐서 계산합니다.
// 방문은 "하루에 1번"만 인정(같은 날 여러 번 들어와도 1일).

export interface LevelInput {
  played: number; // 완료된 경기에 정식 참여한 횟수
  visitDays: number; // 방문한 날짜 수 (하루 1회만 인정)
  tournaments: number; // 참가한 대회 수
  manner: number; // 매너 온도
}

export interface LevelDef {
  level: number;
  name: string;
  emoji: string;
  minXp: number;
  minManner: number; // 이 레벨부터는 매너 온도도 필요
  ringHint: string;
}

export const LEVELS: LevelDef[] = [
  { level: 1, name: "새싹", emoji: "🌱", minXp: 0, minManner: 0, ringHint: "기본 테두리" },
  { level: 2, name: "루키", emoji: "🎾", minXp: 30, minManner: 0, ringHint: "초록 테두리" },
  { level: 3, name: "레귤러", emoji: "🏸", minXp: 100, minManner: 36.5, ringHint: "파란 테두리" },
  { level: 4, name: "베테랑", emoji: "🛡️", minXp: 250, minManner: 37.5, ringHint: "보라 테두리" },
  { level: 5, name: "에이스", emoji: "⭐", minXp: 500, minManner: 39, ringHint: "금색 테두리" },
  { level: 6, name: "마스터", emoji: "💎", minXp: 1000, minManner: 41, ringHint: "반짝이는 테두리" },
  { level: 7, name: "레전드", emoji: "👑", minXp: 2000, minManner: 43, ringHint: "무지개 테두리" },
];

/** 경기 1판 10점, 방문 1일 1점, 대회 참가 1회 20점 */
export function xpOf(i: LevelInput): number {
  return i.played * 10 + i.visitDays + i.tournaments * 20;
}

export function levelOf(i: LevelInput): number {
  const xp = xpOf(i);
  let lv = 1;
  for (const d of LEVELS) {
    if (xp >= d.minXp && i.manner >= d.minManner) lv = d.level;
  }
  return lv;
}

export function levelDef(level: number): LevelDef {
  return LEVELS[Math.min(Math.max(level, 1), LEVELS.length) - 1];
}

/** 다음 레벨까지 남은 정보. 마지막 레벨이면 null */
export function nextLevelInfo(i: LevelInput) {
  const cur = levelOf(i);
  const next = LEVELS[cur];
  if (!next) return null;
  const xp = xpOf(i);
  const cur0 = levelDef(cur).minXp;
  return {
    next,
    xp,
    xpLeft: Math.max(next.minXp - xp, 0),
    mannerLeft: Math.max(next.minManner - i.manner, 0),
    progress: Math.min(Math.max((xp - cur0) / Math.max(next.minXp - cur0, 1), 0), 1),
  };
}
