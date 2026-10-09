// app/actions/badges.ts
// 프로필에 보여줄 레벨 · 칭호 · 주간 칭호 (누구나 볼 수 있는 공개 정보).

"use server"

import { getTitleStats, getWeeklyWinners } from "@/lib/badgeData"
import { levelOf, levelDef, nextLevelInfo, xpOf } from "@/lib/levels"
import { TITLES, WEEKLY_TITLES, earnedTitleIds, type WeeklyKey } from "@/lib/titles"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface BadgeView {
  level: number
  levelName: string
  levelEmoji: string
  xp: number
  next: { name: string; emoji: string; xpLeft: number; playedLeft: number; visitLeft: number; mannerLeft: number; progress: number } | null
  titles: { id: string; emoji: string; name: string; desc: string; hidden: boolean; earned: boolean }[]
  weekly: { key: WeeklyKey; emoji: string; name: string; desc: string; count: number }[]
  weekLabel: string
}

export async function getUserBadges(userId: string) {
  if (!UUID_RE.test(userId)) return { success: false as const, error: "잘못된 회원 ID입니다." }
  try {
    const [{ stats, level }, weekly] = await Promise.all([getTitleStats(userId), getWeeklyWinners()])
    const lv = levelOf(level)
    const def = levelDef(lv)
    const nx = nextLevelInfo(level)
    const got = new Set(earnedTitleIds(stats))
    const data: BadgeView = {
      level: lv,
      levelName: def.name,
      levelEmoji: def.emoji,
      xp: xpOf(level),
      next: nx ? { name: nx.next.name, emoji: nx.next.emoji, xpLeft: nx.xpLeft, playedLeft: nx.playedLeft, visitLeft: nx.visitLeft, mannerLeft: nx.mannerLeft, progress: nx.progress } : null,
      titles: TITLES.map((t) => ({ id: t.id, emoji: t.emoji, name: t.name, desc: t.desc, hidden: !!t.hidden, earned: got.has(t.id) })),
      weekly: weekly.winners
        .filter((w) => w.userId === userId)
        .map((w) => ({ key: w.key, ...WEEKLY_TITLES[w.key], count: w.count })),
      weekLabel: weekly.label,
    }
    return { success: true as const, data }
  } catch (e) {
    console.error("[getUserBadges] 실패:", e)
    return { success: false as const, error: "레벨 정보를 불러오지 못했습니다." }
  }
}
