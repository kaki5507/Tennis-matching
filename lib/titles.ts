// lib/titles.ts
// 칭호 규칙 (순수 함수). 평생 칭호(조건을 채우면 영구 획득)와 주간 칭호(매주 갱신)로 나뉩니다.
// 숨겨진 칭호(hidden)는 획득 전에는 이름이 "???"로 보여서 찾는 재미가 있어요.

export interface TitleStats {
  played: number;
  weekdayPlayed: number;
  weekendPlayed: number;
  earlyPlayed: number; // 오전 9시 이전 시작
  nightPlayed: number; // 저녁 8시 이후 시작
  hosted: number;
  tournaments: number;
  championships: number;
  wins: number;
  losses: number;
  draws: number;
  maxWinStreak: number;
  maxLossStreak: number;
  visitDays: number;
  positiveReceived: number; // 매너 4점 이상 받은 횟수
  manner: number;
}

export interface TitleDef {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  hidden?: boolean;
  test: (s: TitleStats) => boolean;
}

const winRate = (s: TitleStats) => (s.wins + s.losses > 0 ? s.wins / (s.wins + s.losses) : 0);

export const TITLES: TitleDef[] = [
  { id: "first", emoji: "🎾", name: "첫 랠리", desc: "첫 경기를 마쳤어요", test: (s) => s.played >= 1 },
  { id: "weekday", emoji: "🛡️", name: "평일의 전사", desc: "평일 경기 5번 참여", test: (s) => s.weekdayPlayed >= 5 },
  { id: "weekend", emoji: "🏖️", name: "주말 용사", desc: "주말 경기 10번 참여", test: (s) => s.weekendPlayed >= 10 },
  { id: "host", emoji: "📣", name: "방장 단골", desc: "방장으로 경기 5번 진행", test: (s) => s.hosted >= 5 },
  { id: "tour3", emoji: "🏟️", name: "대회 단골", desc: "대회 3번 참가", test: (s) => s.tournaments >= 3 },
  { id: "champ", emoji: "👑", name: "챔피언", desc: "대회 우승 경험", test: (s) => s.championships >= 1 },
  { id: "manner", emoji: "😇", name: "매너 천사", desc: "매너 온도 40도 이상", test: (s) => s.manner >= 40 },
  { id: "loved", emoji: "❤️", name: "인기쟁이", desc: "좋은 매너 평가 20번 받기", test: (s) => s.positiveReceived >= 20 },
  { id: "attend", emoji: "📅", name: "출석왕", desc: "30일 방문 (하루 1번만 인정)", test: (s) => s.visitDays >= 30 },
  { id: "streak5", emoji: "🔥", name: "무서운 연승", desc: "5연승 달성", test: (s) => s.maxWinStreak >= 5 },
  { id: "fairy", emoji: "✨", name: "승률 요정", desc: "10판 이상 승률 70% 이상", test: (s) => s.wins + s.losses >= 10 && winRate(s) >= 0.7 },
  { id: "loser", emoji: "🥀", name: "패배의 미학", desc: "10패를 해도 계속 코트에 나옴", test: (s) => s.losses >= 10 },
  // ---- 숨겨진 칭호 ----
  { id: "early", emoji: "🌅", name: "새벽 코트의 주인", desc: "오전 9시 전 경기 3번", hidden: true, test: (s) => s.earlyPlayed >= 3 },
  { id: "night", emoji: "🌙", name: "야간 에이스", desc: "저녁 8시 이후 경기 5번", hidden: true, test: (s) => s.nightPlayed >= 5 },
  { id: "tour10", emoji: "🔥", name: "대회 중독", desc: "대회 10번 참가", hidden: true, test: (s) => s.tournaments >= 10 },
  { id: "seven", emoji: "🎋", name: "칠전팔기", desc: "5연패를 하고도 포기하지 않음", hidden: true, test: (s) => s.maxLossStreak >= 5 },
  { id: "draw", emoji: "🤝", name: "무승부 장인", desc: "무승부 3번", hidden: true, test: (s) => s.draws >= 3 },
  { id: "century", emoji: "💯", name: "백전노장", desc: "100판 달성", hidden: true, test: (s) => s.played >= 100 },
];

export function earnedTitleIds(s: TitleStats): string[] {
  return TITLES.filter((t) => t.test(s)).map((t) => t.id);
}

// ---- 주간 칭호: 지난주(월~일) 결과로 이번 주 동안 달고 다닙니다 ----
export type WeeklyKey = "temp" | "wins" | "games" | "tears";

export const WEEKLY_TITLES: Record<WeeklyKey, { emoji: string; name: string; desc: string; min: number }> = {
  temp: { emoji: "🌡️", name: "이주의 온도왕", desc: "지난주 좋은 매너 평가를 가장 많이 받았어요", min: 2 },
  wins: { emoji: "🥇", name: "이주의 다승왕", desc: "지난주 가장 많이 이겼어요", min: 2 },
  games: { emoji: "🏃", name: "이주의 개근 선수", desc: "지난주 가장 많이 경기했어요", min: 2 },
  tears: { emoji: "😭", name: "이주의 눈물왕", desc: "지난주 가장 많이 졌지만 코트를 지켰어요", min: 2 },
};
