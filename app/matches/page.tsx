import Link from "next/link";
import { prisma } from "@/lib/tournamentData";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/EmptyState";
import TennisMascot from "@/components/TennisMascot";
import CourtThumb from "@/components/CourtThumb";
import LevelFilterToggle from "@/components/LevelFilterToggle";
import { dayLabel, isPast, seatInfo } from "@/lib/matchDisplay";

// 이 화면은 서버에서 그려져 내려옵니다. (로그인 정보는 서버에서 알 수 없으므로 내 레벨 필터는 주소의 lv 값으로 받습니다)
const GAME_TYPES = ["단식", "복식", "혼합복식", "랠리(연습)"] as const;

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ lv?: string; type?: string }>;
}) {
  const { lv, type } = await searchParams;
  const level = lv && /^\d(\.\d)?$/.test(lv) ? parseFloat(lv) : null;
  const gameType = (GAME_TYPES as readonly string[]).includes(type ?? "") ? (type as string) : null;

  const allMatches = await prisma.match.findMany({
    where: { status: "OPEN", deletedAt: null, ...(gameType ? { gameType } : {}) },
    include: {
      court: true,
      host: true,
      participants: { select: { status: true } },
    },
    orderBy: [{ matchDate: "asc" }, { startTime: "asc" }],
  });

  const timeOf = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

  // 이미 시작 시각이 지난 방은 목록에서 숨김 + (선택) 내 레벨 필터
  const matches = allMatches.filter((m) => {
    if (isPast(m.matchDate.toISOString().slice(0, 10), timeOf(m.startTime))) return false;
    if (level === null) return true;
    if (m.targetLevel === "누구나" || m.targetLevel === "ANY") return true;
    const levels = m.targetLevel.match(/[\d.]+/g);
    if (!levels || levels.length < 2) return true; // 형식을 못 읽으면 안전하게 노출
    const [min, max] = levels.map(parseFloat);
    return level >= min && level <= max;
  });

  const hrefWith = (next: { type?: string | null }) => {
    const p = new URLSearchParams();
    const t = next.type === undefined ? gameType : next.type;
    if (t) p.set("type", t);
    if (level !== null) p.set("lv", level.toFixed(1));
    const qs = p.toString();
    return qs ? `/matches?${qs}` : "/matches";
  };
  const baseParams: Record<string, string> = gameType ? { type: gameType } : {};

  return (
    <div className="min-h-screen page-bg py-4 sm:py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* 상단 배너: 하드코트 블루 + 마스코트 */}
        <section className="hero-blue rounded-3xl overflow-hidden mb-6 relative">
          <div className="hero-cloud w-56 h-12 top-4 left-[8%]" aria-hidden />
          <div className="relative grid grid-cols-[1fr_auto] items-center gap-2 px-6 pt-7 pb-6 sm:px-9 sm:pt-9">
            <div>
              <h1 className="font-display text-3xl sm:text-4xl leading-tight text-white">오늘 칠 파트너,<br />여기서 찾아요</h1>
              <p className="mt-2 text-sm sm:text-base text-white/85">레벨·경기 종류로 골라서 바로 신청하세요.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/matches/create">
                  <Button className="btn-clay h-10 px-5">새 방 만들기</Button>
                </Link>
                <Link href="/tournaments">
                  <Button variant="outline" className="h-10 px-4 bg-transparent text-white border-2 border-white hover:bg-white/10 hover:text-white">대회</Button>
                </Link>
                <Link href="/history">
                  <Button variant="outline" className="h-10 px-4 bg-transparent text-white border-2 border-white hover:bg-white/10 hover:text-white">기록실</Button>
                </Link>
              </div>
            </div>
            <TennisMascot pose="ready" className="w-28 sm:w-40 h-auto mascot-float" />
          </div>
          <div className="surface-band" />
        </section>

        {/* 필터: 경기 종류 + 내 레벨 */}
        <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label="매칭 방 필터">
          <Link
            href={hrefWith({ type: null })}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium border ${!gameType ? "chip-on border-transparent" : "surface border-line chip-off-court"}`}
            aria-pressed={!gameType}
          >
            전체
          </Link>
          {GAME_TYPES.map((t) => (
            <Link
              key={t}
              href={hrefWith({ type: t })}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border ${gameType === t ? "chip-on border-transparent" : "surface border-line chip-off-court"}`}
              aria-pressed={gameType === t}
            >
              {t === "랠리(연습)" ? "랠리" : t}
            </Link>
          ))}
          <span className="w-px h-5 bg-line mx-1" aria-hidden />
          <LevelFilterToggle active={level !== null} baseParams={baseParams} />
        </div>

        <p className="text-xs text-ink-muted mb-3" aria-live="polite">
          모집 중인 방 {matches.length}개{gameType ? ` · ${gameType}` : ""}
          {level !== null ? ` · 내 레벨 ${level.toFixed(1)}` : ""}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.length === 0 ? (
            <div className="col-span-full surface rounded-2xl shadow-sm">
              {gameType || level !== null ? (
                <EmptyState
                  pose="search"
                  title="조건에 맞는 방을 못 찾았어요"
                  description={<>필터를 풀어서 다시 찾아보거나,<br />원하는 조건으로 직접 방을 만들어 보세요.</>}
                >
                  <Link href="/matches" className="btn-outline-court px-4 py-2 rounded-lg text-sm font-medium border">
                    필터 초기화
                  </Link>
                  <Link href="/matches/create" className="btn-clay px-4 py-2 rounded-lg text-sm font-bold">
                    방 만들기
                  </Link>
                </EmptyState>
              ) : (
                <EmptyState
                  pose="sleep"
                  title="코트가 조용해요"
                  description={<>아직 모집 중인 방이 없어요.<br />첫 번째 방장이 되어 파트너를 불러 보세요!</>}
                >
                  <Link href="/matches/create" className="btn-clay px-5 py-2.5 rounded-lg text-sm font-bold">
                    첫 방 만들기
                  </Link>
                </EmptyState>
              )}
            </div>
          ) : (
            matches.map((match) => {
              const dateStr = match.matchDate.toISOString().slice(0, 10);
              const day = dayLabel(dateStr);
              const accepted = match.participants.filter((p) => p.status === "ACCEPTED").length;
              const waiting = match.participants.filter((p) => p.status === "PENDING").length;
              const seat = seatInfo(match.gameType, accepted);
              return (
                <div key={match.id} className="surface p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col relative overflow-hidden">
                  <CourtThumb gameType={match.gameType} className="-mx-6 -mt-6 mb-4 w-[calc(100%+3rem)] h-20 max-w-none" />
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${seat.full ? "badge-warn" : "badge-ok"}`}>
                        {seat.full ? "정원 참" : "모집중"}
                      </span>
                      {day && (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${day === "오늘" || day === "내일" ? "badge-live" : "badge-info"}`}>
                          {day}
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 text-sm font-medium">{match.gameType}</span>
                  </div>

                  <h3 className="text-xl heading mb-1">
                    {new Date(match.matchDate).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short", timeZone: "UTC" })}
                  </h3>
                  <p className="text-slate-600 font-medium mb-3">
                    ⏰ {new Date(match.startTime).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-slate-500 text-sm mb-4 line-clamp-1" title={match.court?.name}>
                    📍 {match.court?.name || "코트 미정"}
                  </p>

                  <div className="h-px bg-line w-full mb-4"></div>

                  <div className="space-y-2 mb-4 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">요구 실력</span>
                      <span className="font-semibold text-slate-700">{match.targetLevel}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">참가비</span>
                      <span className="font-semibold text-slate-700">
                        {match.costPerPerson === 0 ? "무료" : `${match.costPerPerson.toLocaleString()}원`}
                      </span>
                    </div>
                  </div>

                  {/* 참여 현황: 확정 인원/정원 + 대기 인원 */}
                  <div className="mb-5">
                    <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                      <span>
                        참여 확정 <b className="text-slate-700">{seat.joined}</b>
                        {seat.capacity ? `/${seat.capacity}명` : "명"}
                      </span>
                      {waiting > 0 && <span>신청 대기 {waiting}명</span>}
                    </div>
                    {seat.ratio !== null && (
                      <div className="h-1.5 rounded-full tint overflow-hidden" role="presentation">
                        <div className="h-full bg-court rounded-full" style={{ width: `${Math.round(seat.ratio * 100)}%` }} />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-auto">
                    <div className="text-sm text-slate-500">
                      방장: <span className="font-medium text-slate-700">{match.host?.nickname || "알 수 없음"}</span>
                    </div>
                    <Link href={`/matches/${match.id}`}>
                      <Button variant="outline" className="border-ok text-ok hover-ok text-sm h-8 px-4">
                        자세히
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
