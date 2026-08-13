// app/matches/[id]/JoinButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { joinMatchRoom } from "@/app/actions/match";

export default function JoinButton({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = async () => {
    setIsLoading(true);

    // 1. 현재 로그인한 유저 확인
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      alert("로그인이 필요한 서비스입니다.");
      router.push("/login");
      return;
    }

    // 2. 서버 액션 호출하여 DB에 참여 기록
    const result = await joinMatchRoom(matchId, data.user.id);

    // 3. 결과 알림
    if (result.success) {
      alert("성공적으로 참여 신청이 완료되었습니다! 🎾");
      router.refresh(); // 화면을 새로고침해서 최신 상태로 업데이트
    } else {
      alert(result.error);
    }

    setIsLoading(false);
  };

  return (
    <Button 
      onClick={handleJoin} 
      disabled={isLoading} 
      className="flex-1 h-14 text-lg bg-green-600 hover:bg-green-700"
    >
      {isLoading ? "신청 처리 중..." : "참여 신청하기 🎾"}
    </Button>
  );
}