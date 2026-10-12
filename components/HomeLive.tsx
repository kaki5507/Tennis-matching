// components/HomeLive.tsx
// 메인 페이지의 "살아있는" 영역: 서비스 현황 숫자 + 지금 모집 중인 매칭 방.
// DB 조회가 실패해도(점검/일시정지 등) 메인 화면 전체가 깨지지 않도록 섹션만 조용히 숨깁니다.

import Link from "next/link";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/tournamentData";
import EmptyState from "@/components/EmptyState";
import AvatarStack from "@/components/AvatarStack";
import { seatInfo, isPast, kstToday } from "@/lib/matchDisplay";
import { getLevelMap } from "@/lib/badgeData";
import { getRankRows } from "@/lib/rankingData";
import { getLatestNotices } from "@/app/actions/board";

// 30초 캐시: 방문자가 많아도 DB는 30초에 한 번만 조회합니다. (실패하면 캐시하지 않고 예외를 그대로 던집니다)
const fetchLive = unstable_cache(async () => {
    const today = new Date(`${kstToday()}T00:00:00Z`);
    const [openList, members, completed, tournaments, notice] = await Promise.all([
      // 오늘 이후 날짜의 모집 중인 방만 가져온 뒤, 오늘 이미 시작 시각이 지난 방은 아래에서 걸러냅니다.
      prisma.match.findMany({
        where: { status: "OPEN", deletedAt: null, matchDate: { gte: today } },
        include: {
          court: true,
          host: { select: { id: true, nickname: true } },
          participants: { where: { status: "ACCEPTED" }, select: { user: { select: { id: true, nickname: true } } } },
        },
        orderBy: [{ matchDate: "asc" }, { startTime: "asc" }],
        take: 100,
      }),
      // 랭킹 화면과 같은 기준(이메일 인증 완료, 정지·탈퇴 제외)으로 센다
      getRankRows().then((r) => r.length),
      prisma.match.count({ where: { status: "COMPLETED", deletedAt: null } }),
      prisma.tournament.count(),
      getLatestNotices(3),
    ]);
    const live = openList.filter(
      (m) => !isPast(m.matchDate.toISOString().slice(0, 10), m.startTime.toISOString().slice(11, 16)),
    );
    const openMatches = live.length;
    const upcoming = live.slice(0, 4);
    return { openMatches, members, completed, tournaments, upcoming, notice };
}, ["home-live"], { revalidate: 30 });

async function loadLive() {
  try {
    return await fetchLive();
  } catch (e) {
    console.error("[HomeLive] 현황 조회 실패:", e);
    return null;
  }
}

export default async function HomeLive() {
  const data = await loadLive();
  if (!data) return null;
  const lvMap = await getLevelMap(data.upcoming.flatMap((m) => [m.host?.id ?? "", ...m.participants.map((p) => p.user.id)]));

  const stats = [
    { label: "모집 중인 방", value: data.openMatches, href: "/matches" },
    { label: "함께하는 회원", value: data.members, href: "/ranking" },
    { label: "치러진 경기", value: data.completed, href: "/history" },
    { label: "열린 대회", value: data.tournaments, href: "/tournaments" },
  ];

  return (
    <>
      {/* 공지사항 (최근 3개, 고정 공지 우선) */}
      {(
        <section className="max-w-6xl mx-auto px-4 pt-4">
          <div className="surface rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
              <p className="text-sm font-extrabold text-slate-800">📢 공지사항</p>
              <Link href="/board?c=notice" className="text-xs font-bold text-court">더보기 ›</Link>
            </div>
            {data.notice.length === 0 && <p className="px-4 py-2 text-sm text-slate-400">아직 등록된 공지가 없어요.</p>}
            <ul>
              {data.notice.map((n) => (
                <li key={n.id}>
                  <Link href={`/board/${n.id}`} className="flex items-center gap-2 px-4 py-1.5 text-sm hover:bg-black/5 transition-colors">
                    {n.pinned && <span className="shrink-0 text-xs">📌</span>}
                    <span className="truncate text-slate-700">{n.title}</span>
                    <span className="ml-auto shrink-0 text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(n.createdAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="h-1" />
          </div>
        </section>
      )}

      {/* 서비스 현황 */}
      <section className="max-w-6xl mx-auto px-4 pt-5 pb-2">
        <div className="surface rounded-2xl grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 border-line">
          {stats.map((s) => {
            const body = (
              <>
                <div className="font-display text-2xl text-court">{s.value.toLocaleString()}</div>
                <div className="text-xs mt-1 text-ink-muted">{s.label}{s.href ? " ›" : ""}</div>
              </>
            );
            return s.href ? (
              <Link key={s.label} href={s.href} className="py-4 text-center border-line block hover:bg-black/5 transition-colors">
                {body}
              </Link>
            ) : (
              <div key={s.label} className="py-4 text-center border-line">
                {body}
              </div>
            );
          })}
        </div>
      </section>

      {/* 지금 모집 중인 방 */}
      <section className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl md:text-3xl text-court">지금 모집 중인 매칭</h2>
            <p className="text-sm mt-1 text-ink-muted">곧 열리는 경기부터 보여드려요.</p>
          </div>
          <Link href="/matches" className="text-sm font-bold underline text-court shrink-0">
            전체 보기 →
          </Link>
        </div>

        {data.upcoming.length === 0 ? (
          <div className="surface rounded-2xl">
            <EmptyState pose="sleep" title="코트가 조용해요" description="아직 열린 방이 없어요. 첫 번째 방을 만들어 코트의 주인공이 되어보세요!">
              <Link href="/matches/create" className="btn-clay inline-block px-6 py-2.5 rounded-full text-sm font-bold">
                방 만들기
              </Link>
            </EmptyState>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {data.upcoming.map((m) => (
              <Link
                key={m.id}
                href={`/matches/${m.id}`}
                className="card-link surface rounded-2xl p-5 block"
              >
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="badge-live text-[11px] font-bold px-2.5 py-0.5 rounded-full">모집 중</span>
                  <span className="chip-on text-[11px] font-bold px-2.5 py-0.5 rounded-full">{m.gameType}</span>
                  <span className="badge-idle text-[11px] font-medium px-2.5 py-0.5 rounded-full">
                    Lv. {m.targetLevel}
                  </span>
                </div>
                <h3 className="font-display text-lg text-ink truncate">🏟️ {m.court.name}</h3>
                <p className="text-sm mt-1 text-ink-muted">
                  {new Date(m.matchDate).toLocaleDateString("ko-KR", {
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                    timeZone: "UTC",
                  })}{" "}
                  · {new Date(m.startTime).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "UTC",
                  })}
                </p>
                <div className="flex items-center justify-between mt-4 text-xs text-ink-muted">
                  <AvatarStack
                    users={[
                      ...(m.host ? [{ id: m.host.id, nickname: m.host.nickname, level: lvMap[m.host.id] }] : []),
                      ...m.participants.map((p) => ({ id: p.user.id, nickname: p.user.nickname, level: lvMap[p.user.id] })),
                    ]}
                    joined={seatInfo(m.gameType, m.participants.length, m.recruitCount).joined}
                    capacity={seatInfo(m.gameType, m.participants.length, m.recruitCount).capacity}
                  />
                  <span className="font-bold text-court">
                    {m.costPerPerson === 0 ? "무료" : `${m.costPerPerson.toLocaleString()}원`}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
