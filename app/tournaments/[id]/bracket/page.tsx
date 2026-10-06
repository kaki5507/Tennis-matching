"use client";

// app/tournaments/[id]/bracket/page.tsx
// 대진표만 크게 보는 전용 화면. 진행 중인 대회는 30초마다 자동으로 새로고침됩니다.

import { useCallback, useEffect, useState, use } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getTournamentDetail } from "@/app/actions/tournament";
import { setMatchWinner } from "@/app/actions/tournamentBracket";
import { checkAdminAccess } from "@/app/actions/admin";
import { getAccessToken } from "@/lib/authToken";
import BracketViewer from "@/components/BracketViewer";
import type { BracketMatch } from "@/components/TournamentBracket";
import CourtLines from "@/components/CourtLines";
import { buildEntrantMaps, genderBadgeClass, teamKindLabel } from "@/lib/gender";
import TennisLoader from "@/components/TennisLoader";
import TennisMascot from "@/components/TennisMascot";

interface TournamentData {
  id: string;
  title: string;
  status: string;
  format: "SINGLES" | "DOUBLES";
  startDate: string | Date;
  championId: string | null;
  runnerUpId: string | null;
  thirdPlaceId: string | null;
  court: { name: string };
  participants: { userId: string; user: { nickname: string | null; gender: string | null } }[];
  teams: { id: string; status: string; captain: { id: string; nickname: string | null; gender: string | null }; partner: { id: string; nickname: string | null; gender: string | null } }[];
  matches: BracketMatch[];
}

const STATUS_LABEL: Record<string, string> = {
  RECRUITING: "모집중",
  CLOSED: "모집마감",
  ONGOING: "진행중",
  COMPLETED: "종료",
};

export default function BracketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    setUserId(data.user?.id ?? null);
    if (data.user) setIsAdminUser(await checkAdminAccess(await getAccessToken()));

    const result = await getTournamentDetail(id, data.user?.id);
    if (result.success && result.tournament) {
      setTournament(result.tournament as unknown as TournamentData);
      setLastUpdated(new Date());
    }
    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // 진행 중인 대회만 30초마다 자동 새로고침 (관전용)
  useEffect(() => {
    if (tournament?.status !== "ONGOING") return;
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [tournament?.status, load]);

  const handleSetWinner = async (matchId: string, winnerId: string, score: string) => {
    if (!userId) return;
    const result = await setMatchWinner(await getAccessToken(), matchId, winnerId, score);
    if (!result.success) {
      alert(result.error);
    } else if (result.completed) {
      alert("🏆 모든 경기가 끝났어요! 1~3위가 확정되고 참가자 전원에게 결과 알림을 보냈습니다.");
    }
    await load();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-court">
        <div className="rounded-2xl px-8 bg-chalk">
          <TennisLoader label="대진표를 펼치는 중..." />
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">대회를 찾을 수 없습니다.</div>
    );
  }

  const isDoubles = tournament.format === "DOUBLES";
  // 대진표의 참가 단위 ID → 이름/성별 종류. 단식은 유저 ID, 복식은 팀 ID 입니다.
  const { nameMap, kindMap } = buildEntrantMaps(tournament);
  // 대진표에 실제로 오른 유형만 범례에 보여줍니다 (남복 팀만 있는 대회에 '혼복' 안내가 뜨지 않게).
  const inBracket = new Set<string>();
  tournament.matches.forEach((m) => {
    if (m.player1Id) inBracket.add(m.player1Id);
    if (m.player2Id) inBracket.add(m.player2Id);
  });
  const legendKinds = [...new Set([...inBracket].map((id) => kindMap[id]).filter(Boolean))].filter((k) => k !== "unknown");
  // 내 경기를 강조하려면 복식에서는 유저 ID가 아니라 내 팀 ID가 필요합니다.
  const myEntrantId = !userId
    ? null
    : isDoubles
      ? tournament.teams.find((tm) => tm.captain.id === userId || tm.partner.id === userId)?.id ?? null
      : userId;

  return (
    <div className="min-h-screen relative overflow-hidden bg-court">
      {/* 배경 코트라인 */}
      <CourtLines
        className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none text-chalk"
      />

      <div className="relative max-w-7xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <Link
              href={`/tournaments/${tournament.id}`}
              className="text-xs font-medium opacity-70 hover:opacity-100 text-chalk"
            >
              ← 대회 정보로 돌아가기
            </Link>
            <h1 className="font-display text-3xl md:text-4xl mt-2 text-chalk">
              {tournament.title}
            </h1>
            <p className="text-sm mt-1 opacity-75 text-chalk">
              📍 {tournament.court.name} · {new Date(tournament.startDate).toLocaleDateString("ko-KR")} ·{" "}
              {isDoubles ? `${tournament.teams.filter((tm) => tm.status === "CONFIRMED").length}팀` : `${tournament.participants.length}명`} 참가
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                tournament.status === "ONGOING" ? "badge-live" : "badge-idle"
              }`}
            >
              {tournament.status === "ONGOING" && "● "}
              {STATUS_LABEL[tournament.status]}
            </span>
            {tournament.status === "ONGOING" && lastUpdated && (
              <span className="text-[11px] opacity-60 text-chalk">
                {lastUpdated.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 기준 · 30초마다 갱신
              </span>
            )}
          </div>
        </div>

        {/* 범례 */}
        <div className="flex flex-wrap gap-4 mb-4 text-[11px] text-chalk">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 rounded bg-ball" /> 진출한 길
          </span>
          <span className="flex items-center gap-1.5 opacity-70">
            <span className="line-through">이름</span> 탈락 (일찍 떨어질수록 흐리게)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm legend-me" /> 내 경기
          </span>
          {legendKinds.map((kind) => (
            <span key={kind} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-full ${genderBadgeClass(kind)}`} /> {teamKindLabel(kind)}
            </span>
          ))}
          <span className="opacity-70">선수에 마우스를 올리면 그 선수의 길이 보여요</span>
        </div>

        {tournament.matches.length === 0 ? (
          <div className="rounded-2xl p-12 text-center on-court-panel">
            <TennisMascot pose="sad" className="w-24 h-24 mx-auto mb-4" />
            <p className="text-chalk">아직 대진표가 만들어지지 않았어요.</p>
          </div>
        ) : (
          <BracketViewer
            matches={tournament.matches}
            nameMap={nameMap}
            kindMap={kindMap}
            meId={myEntrantId}
            canEdit={isAdminUser && tournament.status !== "COMPLETED"}
            isCompleted={tournament.status === "COMPLETED"}
            championId={tournament.championId}
            runnerUpId={tournament.runnerUpId}
            thirdPlaceId={tournament.thirdPlaceId}
            onSetWinner={handleSetWinner}
          />
        )}

        {isAdminUser && tournament.status !== "COMPLETED" && tournament.matches.length > 0 && (
          <p className="text-xs mt-4 opacity-70 text-chalk">
            🛠️ 관리자: 두 선수가 정해진 경기 카드를 누르면 결과를 입력할 수 있어요.
          </p>
        )}
      </div>
    </div>
  );
}
