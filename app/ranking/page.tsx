// app/ranking/page.tsx
// 랭킹: 누구나(로그인 안 해도) 볼 수 있어요. 레벨 · 매너 온도 · 승률 · 다승 · 경기 수 + 이번 주 칭호 보유자, 닉네임 검색.

import Link from "next/link";
import { getRankRows, type RankRow } from "@/lib/rankingData";
import { getWeeklyWinners } from "@/lib/badgeData";
import { levelDef } from "@/lib/levels";
import { WEEKLY_TITLES } from "@/lib/titles";

export const metadata = { title: "랭킹" };

const TABS = [
  { key: "level", label: "레벨" },
  { key: "temp", label: "매너 온도" },
  { key: "rate", label: "승률" },
  { key: "wins", label: "다승" },
  { key: "games", label: "경기 수" },
  { key: "week", label: "이주의 칭호" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const PAGE_SIZE = 30;

function sortRows(rows: RankRow[], tab: TabKey): RankRow[] {
  const r = [...rows];
  const byName = (a: RankRow, b: RankRow) => a.nickname.localeCompare(b.nickname, "ko");
  switch (tab) {
    case "temp": return r.sort((a, b) => b.manner - a.manner || b.played - a.played || byName(a, b));
    case "rate": return r.filter((x) => x.winRate !== null).sort((a, b) => b.winRate! - a.winRate! || b.wins - a.wins || byName(a, b));
    case "wins": return r.filter((x) => x.wins > 0).sort((a, b) => b.wins - a.wins || (b.winRate ?? 0) - (a.winRate ?? 0) || byName(a, b));
    case "games": return r.filter((x) => x.played > 0).sort((a, b) => b.played - a.played || byName(a, b));
    default: return r.sort((a, b) => b.level - a.level || b.xp - a.xp || b.manner - a.manner || byName(a, b));
  }
}

function mainStat(x: RankRow, tab: TabKey): string {
  switch (tab) {
    case "temp": return `🌡️ ${x.manner.toFixed(1)}도`;
    case "rate": return `${x.winRate}%`;
    case "wins": return `${x.wins}승`;
    case "games": return `${x.played}판`;
    default: return `${x.xp.toLocaleString()}점`;
  }
}

const MEDAL = ["🥇", "🥈", "🥉"];

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const tab: TabKey = (TABS.find((t) => t.key === sp.tab)?.key ?? "level") as TabKey;
  const q = (sp.q ?? "").trim().slice(0, 30);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const href = (p: { tab?: string; q?: string; page?: number }) => {
    const u = new URLSearchParams();
    const t = p.tab ?? tab;
    if (t !== "level") u.set("tab", t);
    const qq = p.q ?? q;
    if (qq) u.set("q", qq);
    if (p.page && p.page > 1) u.set("page", String(p.page));
    const s = u.toString();
    return s ? `/ranking?${s}` : "/ranking";
  };

  const rows = await getRankRows().catch(() => [] as RankRow[]);

  let weekly: Awaited<ReturnType<typeof getWeeklyWinners>> | null = null;
  if (tab === "week") weekly = await getWeeklyWinners();

  const sorted = tab === "week" ? [] : sortRows(rows, tab);
  const ranked = sorted.map((x, i) => ({ x, rank: i + 1 }));
  const filtered = q ? ranked.filter(({ x }) => x.nickname.toLowerCase().includes(q.toLowerCase())) : ranked;
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const shown = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);
  const byId = new Map(rows.map((r) => [r.id, r]));

  return (
    <div className="min-h-screen page-bg py-6 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl heading mb-1">🏅 랭킹</h1>
        <p className="text-sm text-ink-muted mb-4">누구나 볼 수 있어요. 닉네임을 누르면 그 사람의 전적과 칭호를 볼 수 있어요. (5분마다 갱신)</p>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
          {TABS.map((t) => (
            <Link key={t.key} href={href({ tab: t.key, page: 1 })} className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${tab === t.key ? "chip-on" : "chip-off"}`}>
              {t.label}
            </Link>
          ))}
        </div>

        {tab === "week" ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">지난주({weekly?.label}) 결과로 정해지고, 이번 주 내내 프로필에 달려요. 매주 월요일에 바뀝니다.</p>
            {(Object.keys(WEEKLY_TITLES) as (keyof typeof WEEKLY_TITLES)[]).map((key) => {
              const def = WEEKLY_TITLES[key];
              const ws = (weekly?.winners ?? []).filter((w) => w.key === key);
              return (
                <div key={key} className="surface rounded-2xl p-4">
                  <p className="font-bold text-slate-900">{def.emoji} {def.name}</p>
                  <p className="text-xs text-slate-500 mb-2">{def.desc} (최소 {def.min}회)</p>
                  {ws.length === 0 ? (
                    <p className="text-sm text-slate-400">이번 주는 주인이 없어요. 다음 주에 도전해보세요!</p>
                  ) : (
                    <ul className="space-y-1">
                      {ws.map((w) => {
                        const u = byId.get(w.userId);
                        return (
                          <li key={w.userId}>
                            <Link href={`/users/${w.userId}`} className="row-link flex justify-between rounded-lg px-2 py-1.5 text-sm">
                              <span className="font-semibold">{u ? `Lv.${u.level} ` : ""}{u?.nickname ?? "회원"}</span>
                              <span className="text-slate-500">{w.count}회</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <form action="/ranking" className="flex gap-2 mb-3">
              {tab !== "level" && <input type="hidden" name="tab" value={tab} />}
              <input name="q" defaultValue={q} placeholder="닉네임으로 찾기" maxLength={30} className="h-11 flex-1 min-w-0 rounded-xl border border-line px-3 text-sm bg-chalk" />
              <button type="submit" className="btn-clay h-11 px-5 rounded-xl text-sm font-bold shrink-0">검색</button>
            </form>
            {tab === "rate" && <p className="text-xs text-slate-500 mb-2">승패가 기록된 경기 5판 이상인 회원만 순위에 들어가요.</p>}

            {shown.length === 0 ? (
              <div className="surface rounded-2xl p-8 text-center text-sm text-slate-400">
                {q ? "그 닉네임을 가진 회원이 이 순위에 없어요." : "아직 순위에 오른 회원이 없어요."}
              </div>
            ) : (
              <ul className="surface rounded-2xl divide-y divide-line overflow-hidden">
                {shown.map(({ x, rank }) => {
                  const d = levelDef(x.level);
                  return (
                    <li key={x.id}>
                      <Link href={`/users/${x.id}`} className="row-link flex items-center gap-3 px-3 py-3">
                        <span className="w-8 text-center font-display text-lg shrink-0">{rank <= 3 ? MEDAL[rank - 1] : rank}</span>
                        <span className={`lv-ring lv-${x.level}`}>
                          <span className="relative inline-flex w-9 h-9 rounded-full bg-ok-soft text-ok text-sm font-bold items-center justify-center overflow-hidden">
                            {x.nickname.charAt(0).toUpperCase()}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`/api/avatar/${x.id}`} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold text-slate-900 truncate">{x.nickname}</span>
                          <span className="block text-xs text-slate-500 truncate">
                            {d.emoji} Lv.{x.level} {d.name} · {x.wins}승 {x.losses}패{x.winRate !== null ? ` (${x.winRate}%)` : ""} · {x.played}경기 · 🌡️{x.manner.toFixed(1)}
                          </span>
                        </span>
                        <span className="font-bold text-court shrink-0 whitespace-nowrap">{mainStat(x, tab)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            {pages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4 text-sm">
                {cur > 1 && <Link href={href({ page: cur - 1 })} className="chip-off rounded-full px-4 py-2 font-bold">이전</Link>}
                <span className="text-slate-500">{cur} / {pages}</span>
                {cur < pages && <Link href={href({ page: cur + 1 })} className="chip-off rounded-full px-4 py-2 font-bold">다음</Link>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
