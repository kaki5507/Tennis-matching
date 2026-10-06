// components/HomeLive.tsx
// 메인 페이지의 "살아있는" 영역: 서비스 현황 숫자 + 지금 모집 중인 매칭 방.
// DB 조회가 실패해도(점검/일시정지 등) 메인 화면 전체가 깨지지 않도록 섹션만 조용히 숨깁니다.

import Link from "next/link";
import { prisma } from "@/lib/tournamentData";
import TennisMascot from "@/components/TennisMascot";

async function loadLive() {
  try {
    const [openMatches, members, completed, tournaments, upcoming] = await Promise.all([
      prisma.match.count({ where: { status: "OPEN", deletedAt: null } }),
      prisma.user.count(),
      prisma.match.count({ where: { status: "COMPLETED", deletedAt: null } }),
      prisma.tournament.count(),
      prisma.match.findMany({
        where: { status: "OPEN", deletedAt: null },
        include: {
          court: true,
          _count: { select: { participants: { where: { status: "ACCEPTED" } } } },
        },
        orderBy: [{ matchDate: "asc" }, { startTime: "asc" }],
        take: 4,
      }),
    ]);
    return { openMatches, members, completed, tournaments, upcoming };
  } catch (e) {
    console.error("[HomeLive] 현황 조회 실패:", e);
    return null;
  }
}

export default async function HomeLive() {
  const data = await loadLive();
  if (!data) return null;

  const stats = [
    { label: "모집 중인 방", value: data.openMatches },
    { label: "함께하는 회원", value: data.members },
    { label: "치러진 경기", value: data.completed },
    { label: "열린 대회", value: data.tournaments },
  ];

  return (
    <>
      {/* 서비스 현황 */}
      <section className="max-w-6xl mx-auto px-4 pb-4">
        <div className="surface rounded-2xl grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 border-line">
          {stats.map((s) => (
            <div key={s.label} className="py-6 text-center border-line">
              <div className="font-display text-3xl text-court">{s.value.toLocaleString()}</div>
              <div className="text-xs mt-1 text-ink-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 지금 모집 중인 방 */}
      <section className="max-w-6xl mx-auto px-4 py-12">
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
          <div className="surface rounded-2xl py-12 px-6 text-center">
            <TennisMascot pose="wave" className="w-24 h-24 mx-auto mb-3" />
            <p className="font-display text-lg text-court">아직 열린 방이 없어요</p>
            <p className="text-sm mt-1 mb-5 text-ink-muted">첫 번째 방을 만들어 코트의 주인공이 되어보세요!</p>
            <Link
              href="/matches/create"
              className="btn-clay inline-block px-6 py-2.5 rounded-full text-sm font-bold"
            >
              방 만들기
            </Link>
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
                  <span>참가 확정 {m._count.participants}명</span>
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
