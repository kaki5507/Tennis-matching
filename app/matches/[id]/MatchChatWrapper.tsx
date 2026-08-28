// app/matches/[id]/MatchChatWrapper.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { checkParticipation } from "@/app/actions/participant";
import MatchChatRoom from "./MatchChatRoom";

export default function MatchChatWrapper({ matchId }: { matchId: string }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [canView, setCanView] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      const { data } = await supabase.auth.getUser();
      
      if (data?.user) {
        setCurrentUserId(data.user.id);
        // 내 참여 상태를 DB에서 확인합니다.
        const res = await checkParticipation(matchId, data.user.id);
        
        // 🌟 핵심 로직: 방장이거나, 상태가 ACCEPTED인 사람만 통과!
        if (res.isHost || res.status === "ACCEPTED") {
          setCanView(true);
        }
      }
      setIsLoading(false);
    };

    checkAccess();
  }, [matchId]);

  // 로딩 중이거나 권한이 없으면 화면에 아무것도 그리지 않음 (숨김 처리)
  if (isLoading || !canView || !currentUserId) {
    return null; 
  }

  // 통과한 사람에게만 방금 만든 예쁜 채팅창을 보여줌
  return (
    <div className="mt-12">
      <MatchChatRoom matchId={matchId} currentUserId={currentUserId} />
    </div>
  );
}