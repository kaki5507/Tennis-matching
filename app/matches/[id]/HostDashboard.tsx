// app/matches/[id]/HostDashboard.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { getMatchApplications } from "@/app/actions/participant";
import { updateParticipantStatus, completeMatchAction } from "@/app/actions/match";

// 💡 1. 완벽한 타입 설계 (any 절대 금지!)
interface Applicant {
  id: string;
  userId: string;
  status: string;
  user: {
    nickname: string | null;
    email: string;
    tennisLevel: string;
    mannerScore: number;
    ntrpScore: number | null;
  };
}

export default function HostDashboard({ matchId, currentStatus }: { matchId: string, currentStatus: string }) {
  const router = useRouter();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [hostId, setHostId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 💡 2. 수락/거절 후 신청자 목록만 다시 불러오는 전용 함수
  const reloadApplicants = async () => {
    const result = await getMatchApplications(matchId);
    if (result.success && result.participants) {
      // 🌟 any를 쓰지 않고, DB 데이터를 우리가 만든 타입(Applicant)에 맞게 수제 변환합니다.
      const formattedData: Applicant[] = result.participants.map((p) => ({
        id: p.id,
        userId: p.userId,
        status: p.status,
        user: {
          nickname: p.user.nickname,
          email: p.user.email,
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
      const result = await getMatchApplications(matchId);

      if (isMounted) {
        if (data.user) setHostId(data.user.id);

        if (result.success && result.participants) {
          const formattedData: Applicant[] = result.participants.map((p) => ({
            id: p.id,
            userId: p.userId,
            status: p.status,
            user: {
              nickname: p.user.nickname,
              email: p.user.email,
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
  }, [matchId]);

  // 신청자 수락/거절 처리
  const handleStatusChange = async (participantId: string, newStatus: "ACCEPTED" | "REJECTED") => {
    setIsLoading(true);
    const result = await updateParticipantStatus(participantId, newStatus);
    if (result.success) {
      await reloadApplicants(); // 👈 useCallback 없이 안전하게 다시 불러오기
      router.refresh();
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
    const result = await completeMatchAction(matchId, hostId);
    if (result.success) {
      alert("경기가 완료되었습니다! 동료 평가를 진행해 주세요.");
      router.refresh(); 
    } else {
      alert(result.error);
    }
    setIsLoading(false);
  };

  return (
    <div className="mt-12 bg-white p-6 md:p-8 rounded-xl border-2 border-green-500 shadow-sm relative overflow-hidden">
      {/* 왕관 뱃지 디자인 */}
      <div className="absolute top-0 right-0 bg-green-500 text-white px-4 py-1 rounded-bl-xl font-bold text-sm">
        방장 전용
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
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
          <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg">
            아직 참여 신청자가 없습니다.
          </div>
        ) : (
          applicants.map((applicant) => (
            <div key={applicant.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-lg">
                    {applicant.user.nickname || applicant.user.email.split('@')[0]}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                    applicant.status === "ACCEPTED" ? "bg-green-100 text-green-700" :
                    applicant.status === "REJECTED" ? "bg-red-100 text-red-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>
                    {applicant.status === "ACCEPTED" ? "수락됨" : applicant.status === "REJECTED" ? "거절됨" : "대기중"}
                  </span>
                </div>
                <div className="text-sm text-slate-600 mt-1 flex gap-3">
                  <span>🎾 구력: {applicant.user.tennisLevel}</span>
                  {applicant.user.ntrpScore && (
                    <span className="font-bold text-indigo-600">
                      🏆 NTRP: {(Math.round(Number(applicant.user.ntrpScore) * 2) / 2).toFixed(1)}
                    </span>
                  )}
                  <span>🌡️ 매너: {Number(applicant.user.mannerScore).toFixed(1)}도</span>
                </div>
              </div>

              {currentStatus !== "COMPLETED" && (
                <div className="flex gap-2">
                  {applicant.status !== "ACCEPTED" && (
                    <Button 
                      size="sm" 
                      onClick={() => handleStatusChange(applicant.id, "ACCEPTED")}
                      disabled={isLoading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      수락
                    </Button>
                  )}
                  {applicant.status !== "REJECTED" && (
                    <Button 
                      size="sm" variant="outline" 
                      onClick={() => handleStatusChange(applicant.id, "REJECTED")}
                      disabled={isLoading}
                      className="text-red-600 border-red-200 hover:bg-red-50"
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