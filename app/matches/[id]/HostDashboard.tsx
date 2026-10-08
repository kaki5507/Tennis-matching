// app/matches/[id]/HostDashboard.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { getMatchApplications, confirmPayment } from "@/app/actions/participant";
import { updateParticipantStatus, completeMatchAction } from "@/app/actions/match";
import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import { getAccessToken } from "@/lib/authToken";

// 💡 1. 완벽한 타입 설계 (any 절대 금지!)
interface Applicant {
  id: string;
  userId: string;
  status: string;
  paymentConfirmed: boolean; // [NEW]
  user: {
    nickname: string | null;
    tennisLevel: string;
    mannerScore: number;
    ntrpScore: number | null;
  };
}

export default function HostDashboard({
  hostId: matchHostId,
  matchId,
  currentStatus,
  costPerPerson,
}: {
  hostId: string; // 이 방의 방장 id (화면 표시 여부 결정용 - 권한 검사는 서버 액션이 따로 함)
  matchId: string;
  currentStatus: string;
  costPerPerson: number; // [NEW] 1인당 참가비 (입금확인 UI에 표시용)
}) {
  const router = useRouter();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [hostId, setHostId] = useState<string | null>(null);
  const [viewerChecked, setViewerChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 💡 2. 수락/거절 후 신청자 목록만 다시 불러오는 전용 함수
  const reloadApplicants = async () => {
    const result = await getMatchApplications(await getAccessToken(), matchId);
    if (result.success && result.participants) {
      // 🌟 any를 쓰지 않고, DB 데이터를 우리가 만든 타입(Applicant)에 맞게 수제 변환합니다.
      const formattedData: Applicant[] = result.participants.map((p) => ({
        id: p.id,
        userId: p.userId,
        status: p.status,
        paymentConfirmed: p.paymentConfirmed,
        user: {
          nickname: p.user.nickname,
          tennisLevel: p.user.tennisLevel,
          mannerScore: Number(p.user.mannerScore), // Decimal 타입을 Number로 안전하게 변환
          ntrpScore: p.user.ntrpScore ? Number(p.user.ntrpScore) : null,
        }
      }));
      setApplicants(formattedData);
    }
  };

  // 💡 3. 화면이 켜질 때 단 한 번만 안전하게 실행되는 useEffect (무한 렌더링 방지)
  useEffect(() => {
    let isMounted = true; // 화면 생존 신고 변수

    const initData = async () => {
      const { data } = await supabase.auth.getUser();
      // 방장이 아니면 신청자 목록을 요청하지 않음 (서버도 방장만 허용)
      if (!data.user || data.user.id !== matchHostId) {
        if (isMounted) setViewerChecked(true);
        return;
      }
      const result = await getMatchApplications(await getAccessToken(), matchId);

      if (isMounted) {
        setHostId(data.user.id);
        setViewerChecked(true);

        if (result.success && result.participants) {
          const formattedData: Applicant[] = result.participants.map((p) => ({
            id: p.id,
            userId: p.userId,
            status: p.status,
            paymentConfirmed: p.paymentConfirmed,
            user: {
              nickname: p.user.nickname,
                  tennisLevel: p.user.tennisLevel,
              mannerScore: Number(p.user.mannerScore),
              ntrpScore: p.user.ntrpScore ? Number(p.user.ntrpScore) : null,
            }
          }));
          setApplicants(formattedData);
        }
      }
    };

    initData();

    return () => {
      isMounted = false; // 화면 벗어나면 상태 업데이트 중지
    };
  }, [matchId, matchHostId]);

  // 신청자 수락/거절 처리
  const handleStatusChange = async (participantId: string, newStatus: "ACCEPTED" | "REJECTED") => {
    setIsLoading(true);
    const result = await updateParticipantStatus(await getAccessToken(), participantId, newStatus);
    if (result.success) {
      await reloadApplicants(); // 👈 useCallback 없이 안전하게 다시 불러오기
      router.refresh();
    } else {
      alert(result.error);
    }
    setIsLoading(false);
  };

  // [NEW] 입금확인 토글
  const handleTogglePayment = async (participantId: string, current: boolean) => {
    if (!hostId) return;
    setIsLoading(true);
    const result = await confirmPayment(await getAccessToken(), participantId, !current);
    if (result.success) {
      await reloadApplicants();
    } else {
      alert(result.error);
    }
    setIsLoading(false);
  };

  // 경기 완료 처리
  const handleCompleteMatch = async () => {
    if (!hostId) return;
    
    const isConfirm = window.confirm("경기를 완료 처리하시겠습니까?\n완료 후에는 참가자들 간의 동료 평가(NTRP)가 시작됩니다.");
    if (!isConfirm) return;

    setIsLoading(true);
    const result = await completeMatchAction(await getAccessToken(), matchId);
    if (result.success) {
      alert("경기가 완료되었습니다! 동료 평가를 진행해 주세요.");
      router.refresh(); 
    } else {
      alert(result.error);
    }
    setIsLoading(false);
  };

  if (!viewerChecked || !hostId) return null;

  return (
    <div className="mt-12 mb-10 surface p-6 md:p-8 rounded-xl border-2 shadow-sm relative overflow-hidden">
      {/* 왕관 뱃지 디자인 */}
      <div className="absolute top-0 right-0 bg-court-solid px-4 py-1 rounded-bl-xl font-bold text-sm">
        방장 전용
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="text-xl heading flex items-center gap-2">
          👑 방장 대시보드
        </h3>
        
        {/* 경기 완료 버튼 */}
        {currentStatus !== "COMPLETED" && currentStatus !== "CANCELED" && (
          <Button 
            onClick={handleCompleteMatch} 
            disabled={isLoading}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
          >
            🏁 경기 완료 (평가 시작)
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {applicants.length === 0 ? (
          <div className="tint rounded-lg">
            <EmptyState size="compact" pose="search" title="아직 신청자가 없어요" description="공유 버튼으로 방 링크를 보내 보세요." />
          </div>
        ) : (
          applicants.map((applicant) => (
            <div key={applicant.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 tint rounded-lg border border-slate-200 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/users/${applicant.userId}`}
                    className="font-bold text-slate-900 text-lg hover:text-[color:var(--ok)] hover:underline"
                  >
                    {applicant.user.nickname || "익명"}
                  </Link>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                    applicant.status === "ACCEPTED" ? "badge-ok" :
                    applicant.status === "REJECTED" ? "badge-danger" :
                    "badge-warn"
                  }`}>
                    {applicant.status === "ACCEPTED" ? "수락됨" : applicant.status === "REJECTED" ? "거절됨" : "대기중"}
                  </span>
                  {/* [NEW] 수락된 참가자에게만 입금확인 배지 표시 */}
                  {applicant.status === "ACCEPTED" && costPerPerson > 0 && (
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                      applicant.paymentConfirmed ? "badge-info" : "bg-slate-200 text-slate-500"
                    }`}>
                      {applicant.paymentConfirmed ? "💰 입금확인" : "입금대기"}
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-600 mt-1 flex gap-3">
                  <span>🎾 구력: {applicant.user.tennisLevel}</span>
                  {applicant.user.ntrpScore && (
                    <span className="font-bold text-info">
                      🏆 NTRP: {(Math.round(Number(applicant.user.ntrpScore) * 2) / 2).toFixed(1)}
                    </span>
                  )}
                  <span>🌡️ 매너: {Number(applicant.user.mannerScore).toFixed(1)}도</span>
                </div>
              </div>

              {currentStatus !== "COMPLETED" && (
                <div className="flex gap-2">
                  {/* [NEW] 입금확인 토글 (수락된 참가자만) */}
                  {applicant.status === "ACCEPTED" && costPerPerson > 0 && (
                    <Button
                      size="sm"
                      variant={applicant.paymentConfirmed ? "outline" : "default"}
                      onClick={() => handleTogglePayment(applicant.id, applicant.paymentConfirmed)}
                      disabled={isLoading}
                      className={applicant.paymentConfirmed ? "border-info text-info" : "btn-info"}
                    >
                      {applicant.paymentConfirmed ? "입금 취소" : `입금확인 (${costPerPerson.toLocaleString()}원)`}
                    </Button>
                  )}
                  {applicant.status !== "ACCEPTED" && (
                    <Button 
                      size="sm" 
                      onClick={() => handleStatusChange(applicant.id, "ACCEPTED")}
                      disabled={isLoading}
                      className="btn-clay"
                    >
                      수락
                    </Button>
                  )}
                  {applicant.status !== "REJECTED" && (
                    <Button 
                      size="sm" variant="outline" 
                      onClick={() => handleStatusChange(applicant.id, "REJECTED")}
                      disabled={isLoading}
                      className="btn-outline-danger"
                    >
                      거절
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}