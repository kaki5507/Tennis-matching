import Link from "next/link";
import { prisma } from "@/lib/tournamentData";
import EmptyState from "@/components/EmptyState";
import AvatarStack from "@/components/AvatarStack";
import MatchFilters from "@/components/MatchFilters";
import { dayLabel, isPast, seatInfo } from "@/lib/matchDisplay";
import { getLevelMap } from "@/lib/badgeData";

// 이 화면은 서버에서 그려져 내려옵니다. (로그인 정보는 서버에서 알 수 없으므로 내 레벨 필터는 주소의 lv 값으로 받습니다)
const GAME_TYPES = ["단식", "복식", "혼합복식", "랠리(연습)"] as const;

/** 방의 실력 조건 → 숫자 범위. 숫자가 없으면(누구나/초보 환영 등) null */
function levelRange(target: string): [number, number] | null {
  const nums = target.match(/[\d.]+/g);
  if (!nums || nums.length < 2) return null;
  return [parseFloat(nums[0]), parseFloat(nums[1])];
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ lv?: string; type?: string; court?: string; lvl?: string; seat?: string }>;
}) {
  const sp = await searchParams;
  const level = sp.lv && /^\d(\.\d)?$/.test(sp.lv) ? parseFloat(sp.lv) : null;
  const gameType = (GAME_TYPES as readonly string[]).includes(sp.type ?? "") ? (sp.type as string) : null;
  const courtId = sp.court && /^[0-9a-f-]{36}$/i.test(sp.court) ? sp.court : null;
  const lvl = ["open", "beginner", "mid", "high"].includes(sp.lvl ?? "") ? (sp.lvl as string) : null;
  const seatFilter = ["open", "full", "waiting"].includes(sp.seat ?? "") ? (sp.seat as string) : null;

  const allMatches = await prisma.match.findMany({
    where: { status: { in: ["OPEN", "FULL"] }, deletedAt: null, ...(gameType ? { gameType } : {}) },
    include: {
      court: true,
      host: { select: { id: true, nickname: true } },
      participants: { select: { status: true, user: { select: { id: true, nickname: true } } } },
    },
    orderBy: [{ matchDate: "asc" }, { startTime: "asc" }],
  });

  const timeOf = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

  // 이미 시작 시각이 지난 방은 목록에서 숨김
  const upcoming = allMatches.filter((m) => !isPast(m.matchDate.toISOString().slice(0, 10), timeOf(m.startTime)));

  // 코트 셀렉트박스: 지금 열려 있는 방이 있는 코트만
  const courts = [...new Map(upcoming.filter((m) => m.court).map((m) => [m.court!.id, { id: m.court!.id, name: m.court!.name }])).values()].sort((a, b) =>
    a.name.localeCompare(b.name, "ko"),
  );

  const matches = upcoming.filter((m) => {
    if (courtId && m.courtId !== courtId) return false;

    const accepted = m.participants.filter((p) => p.status === "ACCEPTED").length;
    const waitingCnt = m.participants.filter((p) => p.status === "PENDING").length;
    const full = m.status === "FULL" || seatInfo(m.gameType, accepted, m.recruitCount).full;
    if (seatFilter === "open" && full) return false;
    if (seatFilter === "full" && !full) return false;
    if (seatFilter === "waiting" && waitingCnt === 0) return false;

    const anyone = m.targetLevel === "누구나" || m.targetLevel === "ANY";
    const range = levelRange(m.targetLevel);
    if (lvl === "open" && !(anyone || m.targetLevel === "초보 환영")) return false;
    if (lvl && lvl !== "open" && !anyone) {
      if (range === null) {
        if (!(lvl === "beginner" && m.targetLevel === "초보 환영")) return false;
      } else {
        const [lo, hi] = range;
        if (lvl === "beginner" && lo > 2.0) return false;
        if (lvl === "mid" && (hi < 2.0 || lo > 3.0)) return false;
        if (lvl === "high" && hi < 3.0) return false;
      }
    }

    if (level === null) return true;
    if (anyone) return true;
    if (!range) return true; // 형식을 못 읽거나 초보 환영이면 안전하게 노출
    return level >= range[0] && level <= range[1];
  });

  const lvMap = await getLevelMap(matches.flatMap((m) => [m.hostId, ...m.participants.map((p) => p.user.id)]));

  const anyFilter = !!(gameType || courtId || lvl || seatFilter || level !== null);

  return (
    <div className="min-h-screen page-bg py-4 sm:py-6 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-end justify-between mb-3">
          <h1 className="text-xl sm:text-2xl heading">🎾 방 찾기</h1>
          <p className="text-xs text-ink-muted" aria-live="polite">모집 중인 방 {matches.length}개</p>
        </div>

        <MatchFilters
          current={{ type: gameType ?? "", court: courtId ?? "", lvl: lvl ?? "", seat: seatFilter ?? "", lv: level !== null ? level.toFixed(1) : "" }}
          courts={courts}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {matches.length === 0 ? (
            <div className="col-span-full surface rounded-2xl shadow-sm">
              {anyFilter ? (
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
              const seat = seatInfo(match.gameType, accepted, match.recruitCount);
              const full = seat.full || match.status === "FULL";
              return (
                <Link
                  key={match.id}
                  href={`/matches/${match.id}`}
                  className="surface rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap ${full ? "badge-warn" : "badge-ok"}`}>
                        {full ? "정원 참" : "모집중"}
                      </span>
                      {day && (
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${day === "오늘" || day === "내일" ? "badge-live" : "badge-info"}`}>
                          {day}
                        </span>
                      )}
                      {waiting > 0 && <span className="text-[11px] text-slate-500 whitespace-nowrap">대기 {waiting}</span>}
                    </div>
                    <span className="text-slate-400 text-xs font-medium whitespace-nowrap">{match.gameType}</span>
                  </div>

                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-base heading whitespace-nowrap">
                      {new Date(match.matchDate).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric", weekday: "short", timeZone: "UTC" })}{" "}
                      {new Date(match.startTime).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })}
                    </h3>
                    <span className="text-sm font-bold text-court whitespace-nowrap">
                      {match.costPerPerson === 0 ? "무료" : `${match.costPerPerson.toLocaleString()}원`}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm truncate" title={match.court?.name}>
                    📍 {match.court?.name || "코트 미정"} <span className="text-slate-400">· {match.targetLevel === "누구나" || match.targetLevel === "ANY" ? "누구나" : match.targetLevel}</span>
                  </p>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <AvatarStack
                      users={[
                        ...(match.host ? [{ id: match.host.id, nickname: match.host.nickname, level: lvMap[match.host.id] }] : []),
                        ...match.participants.filter((p) => p.status === "ACCEPTED").map((p) => ({ id: p.user.id, nickname: p.user.nickname, level: lvMap[p.user.id] })),
                      ]}
                      joined={seat.joined}
                      capacity={seat.capacity}
                    />
                    <span className="text-xs text-slate-500 truncate">방장 {match.host?.nickname || "알 수 없음"}</span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
