// app/matches/[id]/HostDashboard.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { updateParticipantStatus, closeMatch } from "@/app/actions/match";

// 넘겨받을 데이터 타입 정의
interface Participant {
  id: string;
  userId: string;
  status: string;
  createdAt: Date;
}

interface HostDashboardProps {
  matchId: string;
  hostId: string;
  status: string;
  participants: Participant[];
}

export default function HostDashboard({ matchId, hostId, status, participants }: HostDashboardProps) {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 현재 로그인한 유저 확인
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data.user?.id || null);
    };
    checkUser();
  }, []);

  // 💡 핵심: 현재 로그인한 사람이 '방장'이 아니면 이 대시보드를 아예 렌더링하지 않습니다!
  if (currentUserId !== hostId) return null;

  // 상태 변경 함수 (수락/거절)
  const handleStatusChange = async (participantId: string, newStatus: 'ACCEPTED' | 'REJECTED') => {
    setIsLoading(true);
    const result = await updateParticipantStatus(participantId, newStatus);
    
    if (result.success) {
      alert(`신청자를 ${newStatus === 'ACCEPTED' ? '수락' : '거절'}했습니다.`);
      router.refresh(); // 화면 새로고침하여 최신 상태 반영
    } else {
      alert(result.error);
    }
    setIsLoading(false);
  };

  // 마감 처리 함수
  const handleCloseMatch = async () => {
    if (!confirm("정말 모집을 마감하시겠습니까? 마감 후에는 되돌릴 수 없습니다.")) return;
    
    setIsLoading(true);
    const result = await closeMatch(matchId, hostId);
    
    if (result.success) {
      alert("성공적으로 모집이 마감되었습니다!");
      router.refresh();
    } else {
      alert(result.error);
    }
    setIsLoading(false);
  };

  return (
    <div className="mt-8 bg-slate-800 p-6 rounded-xl border border-slate-700 text-white shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            👑 방장 전용 관리 패널
          </h3>
          <p className="text-slate-400 text-sm mt-1">이 영역은 방장에게만 보입니다.</p>
        </div>
        
        {/* 방 상태가 FULL(마감)이 아닐 때만 마감 버튼 표시 */}
        {status !== "FULL" && (
          <Button 
            onClick={handleCloseMatch} 
            disabled={isLoading} 
            variant="destructive"
            className="bg-red-500 hover:bg-red-600 font-bold"
          >
            모집 강제 마감하기
          </Button>
        )}
      </div>

      <div className="bg-slate-900 rounded-lg p-4">
        <h4 className="font-semibold mb-4 text-slate-300">
          신청자 목록 ({participants.length}명)
        </h4>
        
        {participants.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">아직 신청자가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {participants.map((p) => (
              <div key={p.id} className="flex flex-col sm:flex-row justify-between items-center bg-slate-800 p-3 rounded-md border border-slate-700 gap-4">
                <div className="text-sm">
                  <span className="font-medium text-slate-200">참여자 ID: </span>
                  <span className="text-slate-400 text-xs">{p.userId.slice(0, 8)}...</span>
                  
                  {/* 현재 상태 뱃지 */}
                  <span className={`ml-3 px-2 py-1 rounded text-xs font-bold ${
                    p.status === 'ACCEPTED' ? 'bg-green-500/20 text-green-400' :
                    p.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {p.status === 'ACCEPTED' ? '✅ 수락됨' : p.status === 'REJECTED' ? '❌ 거절됨' : '⏳ 대기중'}
                  </span>
                </div>

                {/* 대기중(PENDING)일 때만 수락/거절 버튼 표시 */}
                {p.status === 'PENDING' && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button 
                      size="sm" 
                      onClick={() => handleStatusChange(p.id, 'ACCEPTED')}
                      disabled={isLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      수락
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleStatusChange(p.id, 'REJECTED')}
                      disabled={isLoading}
                      className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      거절
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}