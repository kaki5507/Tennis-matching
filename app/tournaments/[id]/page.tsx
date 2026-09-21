"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  getTournamentDetail,
  registerForTournament,
  cancelTournamentRegistration,
  updateTournamentStatus,
  recordTournamentResult,
} from "@/app/actions/tournament";
import { isAdmin } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import TennisLoader from "@/components/TennisLoader";
import TennisMascot from "@/components/TennisMascot";

interface Participant {
  userId: string;
  user: { id: string; nickname: string | null; ntrpScore: number | string | null; mannerScore: number | string };
}

interface TournamentData {
  id: string;
  title: string;
  description: string | null;
  status: string;
  startDate: string | Date;
  registrationDeadline: string | Date;
  minNtrp: number | string;
  maxNtrp: number | string;
  minMannerScore: number | string | null;
  maxParticipants: number;
  championId: string | null;
  runnerUpId: string | null;
  thirdPlaceId: string | null;
  court: { name: string; address: string };
  participants: Participant[];
}

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [eligibility, setEligibility] = useState<{ eligible: boolean; reason?: string; alreadyRegistered: boolean } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [resultForm, setResultForm] = useState({ championId: "", runnerUpId: "", thirdPlaceId: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = async () => {
    const { data } = await supabase.auth.getUser();
    setUserId(data.user?.id ?? null);
    if (data.user) setIsAdminUser(await isAdmin(data.user.id));

    const result = await getTournamentDetail(id, data.user?.id);
    if (result.success && result.tournament) {
      setTournament(result.tournament as unknown as TournamentData);
      setEligibility(result.eligibility ?? null);
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
    const result = await updateTournamentStatus(userId, id, status);
    if (!result.success) alert(result.error);
    await load();
    setIsSubmitting(false);
  };

  // [NEW] 관리자: 결과 확정
  const handleRecordResult = async () => {
    if (!userId || !resultForm.championId) return alert("우승자를 선택해주세요.");
    if (!confirm("결과를 확정하면 대회가 '종료' 처리되고, 전체 참가자에게 알림이 갑니다. 계속할까요?")) return;
    setIsSubmitting(true);
    const result = await recordTournamentResult(userId, id, resultForm);
    if (!result.success) alert(result.error);
    await load();
    setIsSubmitting(false);
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

  const findParticipant = (uid: string | null) =>
    uid ? tournament.participants.find((p) => p.userId === uid) : null;

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: "var(--mist)" }}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 헤더 카드 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h1 className="font-display text-2xl mb-2" style={{ color: "var(--court)" }}>
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
                NTRP {Number(tournament.minNtrp).toFixed(1)}~{Number(tournament.maxNtrp).toFixed(1)}
                {tournament.minMannerScore && ` · 매너 ${Number(tournament.minMannerScore).toFixed(1)}도↑`}
              </div>
            </div>
            <div>
              <div className="text-slate-400 text-xs mb-0.5">정원</div>
              <div className="text-slate-800">{tournament.participants.length} / {tournament.maxParticipants}명</div>
            </div>
          </div>
        </div>

        {/* 결과 카드 (종료된 대회만) */}
        {tournament.status === "COMPLETED" && tournament.championId && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h2 className="font-display text-lg mb-4" style={{ color: "var(--court)" }}>
              🎉 최종 결과
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg">🥇</span>
                <span className="font-bold text-slate-900">{findParticipant(tournament.championId)?.user.nickname ?? "알 수 없음"}</span>
              </div>
              {tournament.runnerUpId && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">🥈</span>
                  <span className="text-slate-700">{findParticipant(tournament.runnerUpId)?.user.nickname ?? "알 수 없음"}</span>
                </div>
              )}
              {tournament.thirdPlaceId && (
                <div className="flex items-center gap-2">
                  <span className="text-lg">🥉</span>
                  <span className="text-slate-700">{findParticipant(tournament.thirdPlaceId)?.user.nickname ?? "알 수 없음"}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 신청 버튼 영역 */}
        {tournament.status === "RECRUITING" && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            {!userId ? (
              <p className="text-center text-slate-500 text-sm">
                <Link href="/login" className="text-green-600 underline">로그인</Link> 후 신청할 수 있어요.
              </p>
            ) : eligibility?.alreadyRegistered ? (
              <div className="text-center">
                <p className="text-green-700 font-medium mb-3">✅ 신청 완료됐어요!</p>
                <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                  신청 취소
                </Button>
              </div>
            ) : eligibility?.eligible ? (
              <Button
                onClick={handleRegister}
                disabled={isSubmitting}
                className="w-full h-12 text-white text-lg"
                style={{ background: "var(--clay)" }}
              >
                {isSubmitting ? "신청 중..." : "대회 신청하기"}
              </Button>
            ) : (
              <div className="text-center py-2">
                <TennisMascot pose="sad" className="w-16 h-16 mx-auto mb-2" />
                <p className="text-sm text-slate-500">{eligibility?.reason ?? "신청 조건을 확인해주세요."}</p>
              </div>
            )}
          </div>
        )}

        {/* 참가자 목록 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="font-display text-lg mb-4" style={{ color: "var(--court)" }}>
            참가자 명단
          </h2>
          {tournament.participants.length === 0 ? (
            <p className="text-sm text-slate-400">아직 신청자가 없어요.</p>
          ) : (
            <ul className="space-y-2">
              {tournament.participants.map((p) => (
                <li key={p.userId}>
                  <Link href={`/users/${p.userId}`} className="flex justify-between text-sm hover:underline">
                    <span className="text-slate-700">{p.user.nickname || "익명"}</span>
                    <span className="text-slate-400">
                      NTRP {p.user.ntrpScore ? Number(p.user.ntrpScore).toFixed(1) : "-"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* [NEW] 관리자 전용 패널 */}
        {isAdminUser && tournament.status !== "COMPLETED" && (
          <div className="bg-white p-6 rounded-2xl border-2 border-dashed" style={{ borderColor: "var(--clay)" }}>
            <h2 className="font-display text-lg mb-4" style={{ color: "var(--clay)" }}>
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

            <h3 className="text-sm font-bold text-slate-700 mb-2">대회 결과 입력</h3>
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
            <Button onClick={handleRecordResult} disabled={isSubmitting} className="w-full" style={{ background: "var(--clay)" }}>
              결과 확정 및 알림 발송
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
