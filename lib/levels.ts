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
  minPlayed: number; // 경기 수 조건
  minVisitDays: number; // 방문일 조건 (하루 1회 인정)
  minManner: number; // 매너 온도 조건
  ringHint: string;
}

// 경험치만 채워서는 못 올라가요. 경기 수 · 방문일 · 매너 온도를 모두 채워야 합니다. (레전드는 1년 이상 꾸준히 + 300판)
export const LEVELS: LevelDef[] = [
  { level: 1, name: "새싹", emoji: "🌱", minXp: 0, minPlayed: 0, minVisitDays: 0, minManner: 0, ringHint: "기본 테두리" },
  { level: 2, name: "루키", emoji: "🎾", minXp: 50, minPlayed: 3, minVisitDays: 0, minManner: 0, ringHint: "초록 테두리" },
  { level: 3, name: "레귤러", emoji: "🏸", minXp: 200, minPlayed: 10, minVisitDays: 7, minManner: 36.5, ringHint: "파란 테두리" },
  { level: 4, name: "베테랑", emoji: "🛡️", minXp: 600, minPlayed: 30, minVisitDays: 30, minManner: 38, ringHint: "보라 테두리" },
  { level: 5, name: "에이스", emoji: "⭐", minXp: 1500, minPlayed: 70, minVisitDays: 90, minManner: 40, ringHint: "금색 테두리" },
  { level: 6, name: "마스터", emoji: "💎", minXp: 3500, minPlayed: 150, minVisitDays: 180, minManner: 42, ringHint: "반짝이는 테두리" },
  { level: 7, name: "레전드", emoji: "👑", minXp: 8000, minPlayed: 300, minVisitDays: 365, minManner: 44, ringHint: "무지개 테두리" },
];

/** 경기 1판 10점, 방문 1일 1점, 대회 참가 1회 20점 */
export function xpOf(i: LevelInput): number {
  return i.played * 10 + i.visitDays + i.tournaments * 20;
}

function meets(d: LevelDef, i: LevelInput): boolean {
  return xpOf(i) >= d.minXp && i.played >= d.minPlayed && i.visitDays >= d.minVisitDays && i.manner >= d.minManner;
}

/** 조건을 모두 채운 가장 높은 레벨 (한 칸씩 순서대로 올라감) */
export function levelOf(i: LevelInput): number {
  let lv = 1;
  for (const d of LEVELS) {
    if (!meets(d, i)) break;
    lv = d.level;
  }
  return lv;
}

export function levelDef(level: number): LevelDef {
  return LEVELS[Math.min(Math.max(level, 1), LEVELS.length) - 1];
}

/** 다음 레벨까지 남은 조건. 마지막 레벨이면 null */
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
    playedLeft: Math.max(next.minPlayed - i.played, 0),
    visitLeft: Math.max(next.minVisitDays - i.visitDays, 0),
    mannerLeft: Math.max(next.minManner - i.manner, 0),
    progress: Math.min(Math.max((xp - cur0) / Math.max(next.minXp - cur0, 1), 0), 1),
  };
}
