"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  getTournamentDetail,
  registerForTournament,
  cancelTournamentRegistration,
  updateTournamentStatus,
} from "@/app/actions/tournament";
import type { ViewerStatus } from "@/app/actions/tournament";
import { recordTournamentResult, generateBracket, resetBracket, setMatchWinner } from "@/app/actions/tournamentBracket";
import { checkAdminAccess } from "@/app/actions/admin";
import { getAccessToken } from "@/lib/authToken";
import TournamentBracket, { BracketMatch } from "@/components/TournamentBracket";
import EntrantList, { TeamRow } from "@/components/EntrantList";
import TeamRegistration from "@/components/TeamRegistration";
import { Button } from "@/components/ui/button";
import TennisLoader from "@/components/TennisLoader";
import TennisMascot from "@/components/TennisMascot";
import { formatNtrp } from "@/lib/tournamentRules";
import { buildEntrantMaps } from "@/lib/gender";

interface Participant {
  userId: string;
  user: { id: string; nickname: string | null; gender: string | null; ntrpScore: number | null; mannerScore: number };
}

interface TournamentData {
  id: string;
  title: string;
  description: string | null;
  status: string;
  format: "SINGLES" | "DOUBLES";
  startDate: string | Date;
  registrationDeadline: string | Date;
  minNtrp: number;
  maxNtrp: number;
  minMannerScore: number | null;
  maxTeamAvgNtrp: number | null;
  maxParticipants: number;
  championId: string | null;
  runnerUpId: string | null;
  thirdPlaceId: string | null;
  court: { name: string; address: string };
  participants: Participant[];
  teams: TeamRow[];
  matches: BracketMatch[]; // 자동 생성된 대진표
}

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [viewer, setViewer] = useState<ViewerStatus>({ kind: "guest" });
  const [viewerProfile, setViewerProfile] = useState<{ ntrpScore: number | null; gender: string | null } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [resultForm, setResultForm] = useState({ championId: "", runnerUpId: "", thirdPlaceId: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = async () => {
    const { data } = await supabase.auth.getUser();
    setUserId(data.user?.id ?? null);
    if (data.user) setIsAdminUser(await checkAdminAccess(await getAccessToken()));

    const result = await getTournamentDetail(id, data.user?.id);
    if (result.success && result.tournament) {
      setTournament(result.tournament as unknown as TournamentData);
      setViewer(result.viewer);
      setViewerProfile(result.viewerProfile);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleRegister = async () => {
    if (!userId) return alert("로그인이 필요합니다.");
    setIsSubmitting(true);
    const result = await registerForTournament(userId, id);
    if (!result.success) alert(result.error);
    await load();
    setIsSubmitting(false);
  };

  const handleCancel = async () => {
    if (!userId) return;
    if (!confirm("대회 신청을 취소하시겠어요?")) return;
    setIsSubmitting(true);
    await cancelTournamentRegistration(userId, id);
    await load();
    setIsSubmitting(false);
  };

  // [NEW] 관리자: 상태 변경
  const handleStatusChange = async (status: "RECRUITING" | "CLOSED" | "ONGOING") => {
    if (!userId) return;
    setIsSubmitting(true);
    const result = await updateTournamentStatus(await getAccessToken(), id, status);
    if (!result.success) alert(result.error);
    await load();
    setIsSubmitting(false);
  };

  // [NEW] 관리자: 결과 확정
  const handleRecordResult = async () => {
    if (!userId || !resultForm.championId) return alert("우승자를 선택해주세요.");
    if (!confirm("결과를 확정하면 대회가 '종료' 처리되고, 전체 참가자에게 알림이 갑니다. 계속할까요?")) return;
    setIsSubmitting(true);
    const result = await recordTournamentResult(await getAccessToken(), id, resultForm);
    if (!result.success) alert(result.error);
    await load();
    setIsSubmitting(false);
  };

  // [NEW] 관리자: 대진표 자동 생성
  const handleGenerateBracket = async () => {
    if (!userId || !tournament) return;
    const pendingNote = pendingTeamCount > 0 ? `\n(파트너가 아직 수락하지 않은 ${pendingTeamCount}팀은 대진표에서 제외되고 신청이 취소돼요.)` : "";
    if (!confirm(`${entrantCount}${unit}으로 대진표를 만들까요?\n${isDoubles ? "두 선수 NTRP 합" : "NTRP"}이 높은 순으로 시드가 배정되고, 신청이 마감되며 참가자 전원에게 알림이 갑니다.${pendingNote}`)) return;
    setIsSubmitting(true);
    const result = await generateBracket(await getAccessToken(), id);
    if (!result.success) alert(result.error);
    await load();
    setIsSubmitting(false);
  };

  // [NEW] 관리자: 대진표 초기화
  const handleResetBracket = async () => {
    if (!userId) return;
    if (!confirm("대진표를 초기화할까요? (결과가 입력된 경기가 있으면 초기화할 수 없어요)")) return;
    setIsSubmitting(true);
    const result = await resetBracket(await getAccessToken(), id);
    if (!result.success) alert(result.error);
    await load();
    setIsSubmitting(false);
  };

  // [NEW] 관리자: 경기 승자 입력 → 자동 진출, 결승까지 끝나면 자동 종료
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
      <div className="max-w-2xl mx-auto px-4 py-16">
        <TennisLoader label="대회 정보를 불러오는 중..." />
      </div>
    );
  }
  if (!tournament) {
    return <div className="max-w-2xl mx-auto px-4 py-16 text-center text-slate-500">대회를 찾을 수 없습니다.</div>;
  }

  const isDoubles = tournament.format === "DOUBLES";

  // 대진표/결과에 쓰이는 "참가 단위" ID → 이름/성별 종류. 단식은 유저 ID, 복식은 팀 ID 입니다.
  const { nameMap, kindMap } = buildEntrantMaps(tournament);

  // 내가 속한 참가 단위 ID (대진표에서 내 경기를 강조하는 데 사용)
  const myEntrantId = !userId
    ? null
    : isDoubles
      ? tournament.teams.find((tm) => tm.captain.id === userId || tm.partner.id === userId)?.id ?? null
      : userId;

  const confirmedTeamCount = tournament.teams.filter((tm) => tm.status === "CONFIRMED").length;
  const pendingTeamCount = tournament.teams.length - confirmedTeamCount;
  const entrantCount = isDoubles ? confirmedTeamCount : tournament.participants.length; // 대진표에 들어갈 수
  const unit = isDoubles ? "팀" : "명";

  const nameOf = (entrantId: string | null) => (entrantId ? nameMap[entrantId] ?? "알 수 없음" : null);

  return (
    <div className="min-h-screen py-12 px-4 tint">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 헤더 카드 */}
        <div className="surface p-6 rounded-2xl shadow-sm">
          <h1 className="font-display text-2xl mb-2 text-court">
            🏆 {tournament.title}
          </h1>
          {tournament.description && <p className="text-slate-600 mb-4">{tournament.description}</p>}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-slate-400 text-xs mb-0.5">장소</div>
              <div className="text-slate-800">📍 {tournament.court.name}</div>
            </div>
            <div>
              <div className="text-slate-400 text-xs mb-0.5">대회 날짜</div>
              <div className="text-slate-800">{new Date(tournament.startDate).toLocaleDateString("ko-KR")}</div>
            </div>
            <div>
              <div className="text-slate-400 text-xs mb-0.5">참가 조건</div>
              <div className="text-slate-800">
                {isDoubles ? "선수별 " : ""}NTRP {tournament.minNtrp.toFixed(1)}~{tournament.maxNtrp.toFixed(1)}
                {isDoubles && tournament.maxTeamAvgNtrp !== null && ` · 팀 평균 ${formatNtrp(tournament.maxTeamAvgNtrp)} 이하`}
                {tournament.minMannerScore !== null && ` · 매너 ${tournament.minMannerScore.toFixed(1)}도↑`}
              </div>
            </div>
            <div>
              <div className="text-slate-400 text-xs mb-0.5">정원</div>
              <div className="text-slate-800">
                {entrantCount} / {tournament.maxParticipants}{unit}
                {isDoubles && pendingTeamCount > 0 && <span className="text-slate-400"> (대기 {pendingTeamCount})</span>}
              </div>
            </div>
          </div>
        </div>

        {/* 결과 카드 (종료된 대회만) */}
        {tournament.status === "COMPLETED" && tournament.championId && (
          <div className="surface p-6 rounded-2xl shadow-sm">
            <h2 className="font-display text-lg mb-4 text-court">
              🎉 최종 결과
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg">🥇</span>
                <span className="font-bold text-slate-900">{nameOf(tournament.championId) ?? "알 수 없음"}</span>
              </div>
              {tournament.runnerUpId && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">🥈</span>
                  <span className="text-slate-700">{nameOf(tournament.runnerUpId) ?? "알 수 없음"}</span>
                </div>
              )}
              {tournament.thirdPlaceId && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">🥉</span>
                  <span className="text-slate-700">{nameOf(tournament.thirdPlaceId) ?? "알 수 없음"}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 신청 영역: 단식은 버튼 하나, 복식은 파트너 검색/초대 흐름 */}
        {tournament.status === "RECRUITING" && tournament.matches.length === 0 && (
          <div className="surface p-6 rounded-2xl shadow-sm">
            {tournament.format === "DOUBLES" ? (
              <TeamRegistration
                tournamentId={tournament.id}
                userId={userId}
                viewer={viewer}
                viewerProfile={viewerProfile}
                rule={{
                  minNtrp: tournament.minNtrp,
                  maxNtrp: tournament.maxNtrp,
                  minMannerScore: tournament.minMannerScore,
                  maxTeamAvgNtrp: tournament.maxTeamAvgNtrp,
                }}
                onChanged={load}
              />
            ) : !userId ? (
              <p className="text-center text-slate-500 text-sm">
                <Link href="/login" className="text-ok underline">로그인</Link> 후 신청할 수 있어요.
              </p>
            ) : viewer.kind === "registered" ? (
              <div className="text-center">
                <p className="text-ok font-medium mb-3">✅ 신청 완료됐어요!</p>
                <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                  신청 취소
                </Button>
              </div>
            ) : viewer.kind === "eligible" ? (
              <Button onClick={handleRegister} disabled={isSubmitting} className="w-full h-12 text-lg btn-clay">
                {isSubmitting ? "신청 중..." : "대회 신청하기"}
              </Button>
            ) : (
              <div className="text-center py-2">
                <TennisMascot pose="sad" className="w-16 h-16 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  {viewer.kind === "ineligible" ? viewer.reason : "신청 조건을 확인해주세요."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* [NEW] 대진표 */}
        {tournament.matches.length > 0 && (
          <div className="surface p-6 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg text-court">
                📋 대진표
              </h2>
              <Link
                href={`/tournaments/${tournament.id}/bracket`}
                className="text-xs font-bold px-3 py-1.5 rounded-full text-white bg-court"
              >
                크게 보기 →
              </Link>
            </div>
            <TournamentBracket
              matches={tournament.matches}
              nameMap={nameMap}
              kindMap={kindMap}
              canEdit={isAdminUser && tournament.status !== "COMPLETED"}
              highlightUserId={myEntrantId}
              onSetWinner={handleSetWinner}
            />
          </div>
        )}

        {/* 참가자 / 팀 명단 */}
        <div className="surface p-6 rounded-2xl shadow-sm">
          <h2 className="font-display text-lg mb-4 text-court">{isDoubles ? "참가 팀" : "참가자 명단"}</h2>
          <EntrantList format={tournament.format} participants={tournament.participants} teams={tournament.teams} />
        </div>

        {/* [NEW] 관리자 전용 패널 */}
        {isAdminUser && tournament.status !== "COMPLETED" && (
          <div className="admin-panel p-6 rounded-2xl">
            <h2 className="font-display text-lg mb-4 text-clay">
              🛠️ 관리자 패널
            </h2>

            <div className="flex gap-2 mb-6 flex-wrap">
              {(["RECRUITING", "CLOSED", "ONGOING"] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={tournament.status === s ? "default" : "outline"}
                  onClick={() => handleStatusChange(s)}
                  disabled={isSubmitting}
                >
                  {s === "RECRUITING" ? "모집중으로" : s === "CLOSED" ? "모집마감으로" : "진행중으로"}
                </Button>
              ))}
            </div>

            {/* [NEW] 대진표 생성/초기화 */}
            <h3 className="text-sm font-bold text-slate-700 mb-2">대진표</h3>
            {tournament.matches.length === 0 ? (
              <div className="mb-6">
                <Button
                  onClick={handleGenerateBracket}
                  disabled={isSubmitting || entrantCount < 2}
                  className="w-full text-white bg-court"
                >
                  📋 대진표 자동 생성 ({entrantCount}{unit})
                </Button>
                <p className="text-xs text-slate-400 mt-2">
                  {isDoubles ? "두 선수 NTRP 합" : "NTRP"}이 높은 순으로 시드를 배정하고, 수가 모자라면 상위 시드에게 부전승을 줍니다.
                </p>
              </div>
            ) : (
              <div className="mb-6">
                <p className="text-xs text-slate-500 mb-2">
                  대진표의 각 경기에서 &apos;결과 입력&apos;을 누르면 승자가 다음 라운드로 자동 진출하고,
                  결승이 끝나면 1~3위가 자동 확정됩니다.
                </p>
                <Button variant="outline" size="sm" onClick={handleResetBracket} disabled={isSubmitting}>
                  대진표 초기화
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 대진표 없이 현장에서 진행한 대회용 수동 결과 입력 */}
        {isAdminUser && tournament.status !== "COMPLETED" && tournament.matches.length === 0 && (
          <div className="admin-panel p-6 rounded-2xl">
            <h3 className="text-sm font-bold text-slate-700 mb-1">대회 결과 직접 입력</h3>
            <p className="text-xs text-slate-400 mb-3">대진표 없이 현장에서 진행한 경우에만 사용하세요.</p>
            <div className="space-y-2 mb-3">
              {(["championId", "runnerUpId", "thirdPlaceId"] as const).map((field, idx) => (
                <select
                  key={field}
                  value={resultForm[field]}
                  onChange={(e) => setResultForm((prev) => ({ ...prev, [field]: e.target.value }))}
                  className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm"
                >
                  <option value="">
                    {["🥇 우승", "🥈 준우승", "🥉 3위"][idx]} 선택
                  </option>
                  {tournament.participants.map((p) => (
                    <option key={p.userId} value={p.userId}>
                      {p.user.nickname || "익명"}
                    </option>
                  ))}
                </select>
              ))}
            </div>
            <Button onClick={handleRecordResult} disabled={isSubmitting} className="w-full bg-clay text-white">
              결과 확정 및 알림 발송
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
