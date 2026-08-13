"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getMyMatches } from "@/app/actions/user";
import { Button } from "@/components/ui/button";

// 💡 [NEW] 매칭 방과 코트장 데이터가 어떻게 생겼는지 타입(설계도)을 명시합니다.
interface CourtData {
  name: string;
}

interface MatchData {
  id: string;
  status: string;
  gameType: string;
  matchDate: string | Date;
  startTime: string | Date;
  court?: CourtData | null;
}

export default function MyPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  
  // ❌ any 대신 ✅ MatchData[] 설계도를 적용합니다.
  const [hosted, setHosted] = useState<MatchData[]>([]);
  const [joined, setJoined] = useState<MatchData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMyData = async () => {
      // 1. 현재 로그인한 유저 확인
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        alert("로그인이 필요합니다.");
        router.push("/login");
        return;
      }
      
      setUserEmail(data.user.email || "테니스인");

      // 2. 내가 만든 방 / 참여한 방 데이터 불러오기
      const result = await getMyMatches(data.user.id);
      if (result.success) {
        setHosted(result.hostedMatches || []);
        setJoined(result.joinedMatches || []);
      }
      
      setIsLoading(false);
    };

    fetchMyData();
  }, [router]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">데이터를 불러오는 중입니다... 🎾</div>;
  }

  // ❌ match: any 대신 ✅ match: MatchData 적용!
  const renderMatchCard = (match: MatchData) => (
    <div key={match.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div className="flex gap-2 items-center mb-1">
          <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-md">
            {match.status === "OPEN" ? "모집중" : "마감됨"}
          </span>
          <span className="text-slate-500 text-sm font-medium">{match.gameType}</span>
        </div>
        <h3 className="text-lg font-bold text-slate-900">
          {new Date(match.matchDate).toLocaleDateString("ko-KR", { month: 'long', day: 'numeric', weekday: 'short' })}
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          📍 {match.court?.name || "코트 미정"} | ⏰ {new Date(match.startTime).toLocaleTimeString("ko-KR", { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <Link href={`/matches/${match.id}`}>
        <Button variant="outline" className="w-full sm:w-auto text-green-700 border-green-600 hover:bg-green-50">
          상세 보기
        </Button>
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-10">
        
        {/* 프로필 헤더 */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-6">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl font-bold">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{userEmail} 님</h1>
            <p className="text-slate-500 mt-1">오늘도 즐거운 테니스 라이프 되세요! 🎾</p>
          </div>
        </div>

        {/* 내가 만든 방 영역 */}
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            👑 내가 방장인 매칭
            <span className="bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded-full">{hosted.length}</span>
          </h2>
          {hosted.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
              아직 만든 방이 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {hosted.map(renderMatchCard)}
            </div>
          )}
        </section>

        {/* 내가 참여한 방 영역 */}
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            🏃‍♂️ 참여 신청한 매칭
            <span className="bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded-full">{joined.length}</span>
          </h2>
          {joined.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
              아직 참여 신청한 방이 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {joined.map(renderMatchCard)}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}