// app/matches/[id]/JoinButton.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { joinMatchRoom } from "@/app/actions/match";
import { cancelMatchApplication, checkParticipation } from "@/app/actions/participant";

export default function JoinButton({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  
  const [isHost, setIsHost] = useState(false);
  const [isParticipating, setIsParticipating] = useState(false);
  const [partStatus, setPartStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  // 1. 화면 켜질 때 내 상태 불러오기 (무한 렌더링 완벽 방어)
  useEffect(() => {
    let isMounted = true; // 🌟 꼬임 방지용 스위치

    const initStatus = async () => {
      const { data } = await supabase.auth.getUser();
      
      if (data.user) {
        const uid = data.user.id;
        const res = await checkParticipation(matchId, uid);
        
        // 🌟 컴포넌트가 살아있을 때만 상태 업데이트
        if (isMounted) {
          setUserId(uid);
          if (res.success) {
            setIsHost(res.isHost || false);
            setIsParticipating(res.isParticipating || false);
            setPartStatus(res.status || "");
          }
          setIsLoading(false);
        }
      } else {
        if (isMounted) setIsLoading(false);
      }
    };

    initStatus();

    // 화면(컴포넌트)이 꺼질 때 스위치를 내림
    return () => {
      isMounted = false;
    };
  }, [matchId]);

  // 2. 참여 신청 로직
  const handleJoin = async () => {
    if (!userId) {
      alert("로그인이 필요합니다.");
      router.push("/login");
      return;
    }
    
    setIsLoading(true);
    const res = await joinMatchRoom(matchId, userId);
    
    if (res.success) {
      alert("참여 신청이 완료되었습니다! 방장의 수락을 기다려주세요.");
      // 🌟 DB를 다시 부르지 않고, 화면 상태를 즉시 '참여중'으로 바꿔버림 (최적화)
      setIsParticipating(true);
      setPartStatus("PENDING"); 
      router.refresh(); // 방장 대시보드 리스트 동기화용
    } else {
      alert(res.error);
    }
    setIsLoading(false);
  };

  // 3. 참여 취소 로직
  const handleCancel = async () => {
    if (!userId) return;

    const confirmMsg = partStatus === "ACCEPTED" 
      ? "🚨 이미 방장이 참여를 수락한 상태입니다.\n\n지금 취소하면 다른 참여자들에게 피해를 줄 수 있습니다. 정말 취소하시겠습니까?" 
      : "참여 신청을 취소하시겠습니까?";
    
    if (!window.confirm(confirmMsg)) return;

    setIsLoading(true);
    const res = await cancelMatchApplication(matchId, userId);
    
    if (res.success) {
      alert("참여 신청이 취소되었습니다.");
      // 🌟 화면 상태를 즉시 '미참여'로 롤백
      setIsParticipating(false);
      setPartStatus("");
      router.refresh(); 
    } else {
      alert(res.error);
    }
    setIsLoading(false);
  };

  // 렌더링 영역
  if (isLoading) {
    return <Button disabled className="flex-1 h-14 text-lg bg-slate-200 animate-pulse text-slate-400">확인 중...</Button>;
  }

  // 방장 본인이라면 숨김
  if (isHost) {
    return null; 
  }

  // 이미 참여(신청)한 상태라면 "취소 버튼" 노출
  if (isParticipating) {
    return (
      <Button 
        onClick={handleCancel} 
        disabled={isLoading}
        variant="outline"
        className="flex-1 h-14 text-lg border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
      >
        {partStatus === "ACCEPTED" ? "수락됨 (참여 취소하기)" : "신청 대기 중 (취소하기)"}
      </Button>
    );
  }

  // 아직 신청 안 한 사람에게는 "신청 버튼" 노출
  return (
    <Button 
      onClick={handleJoin} 
      disabled={isLoading}
      className="flex-1 h-14 text-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
    >
      참여 신청하기
    </Button>
  );
}