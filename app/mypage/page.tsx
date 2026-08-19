// app/mypage/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getMyMatches } from "@/app/actions/user";
import { getProfile } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";

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

// 💡 [수정] 진짜 NTRP 관련 필드(ntrpScore, ntrpCount)를 타입에 추가합니다.
interface UserProfile {
  nickname?: string | null;
  tennisLevel?: string | null;
  preferredPos?: string | null;
  ntrpScore?: number | string | null; // Prisma의 Decimal 타입 대응
  ntrpCount?: number;
}

export default function MyPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  const [hosted, setHosted] = useState<MatchData[]>([]);
  const [joined, setJoined] = useState<MatchData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMyData = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        alert("로그인이 필요합니다.");
        router.push("/login");
        return;
      }
      
      setUserEmail(data.user.email || "테니스인");

      const profileResult = await getProfile(data.user.id);
      if (profileResult.success && profileResult.user) {
        setProfile({
          nickname: profileResult.user.nickname,
          tennisLevel: profileResult.user.tennisLevel,
          preferredPos: profileResult.user.preferredPos,
          // 💡 [추가] DB에서 계산된 NTRP 점수와 횟수를 상태에 저장합니다.
          ntrpScore: profileResult.user.ntrpScore?.toString(), 
          ntrpCount: profileResult.user.ntrpCount || 0,
        });
      }

      const matchResult = await getMyMatches(data.user.id);
      if (matchResult.success) {
        setHosted(matchResult.hostedMatches || []);
        setJoined(matchResult.joinedMatches || []);
      }
      
      setIsLoading(false);
    };

    fetchMyData();
  }, [router]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">데이터를 불러오는 중입니다... 🎾</div>;
  }

  const renderMatchCard = (match: MatchData) => (
    <div key={match.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-green-300 transition-colors">
      <div>
        <div className="flex gap-2 items-center mb-1">
          <span className={`text-xs font-bold px-2 py-1 rounded-md ${match.status === "OPEN" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
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

  const displayNickname = profile?.nickname || userEmail.split('@')[0];
  const evalCount = profile?.ntrpCount || 0;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-10">
        
        {/* 프로필 헤더 */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl font-bold shrink-0">
              {displayNickname.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{displayNickname} 님</h1>
              
              {/* 💡 [수정] 뱃지 영역: 자가 평가와 동료 평가(진짜 실력)를 나란히 배치 */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {/* 1. 자가 입력 구력 */}
                <span className="bg-slate-100 text-slate-600 text-sm px-3 py-1 rounded-full font-medium border border-slate-200">
                  🙋‍♂️ 자칭: {profile?.tennisLevel || "미입력"}
                </span>
                
                {/* 2. 동료 평가 기반 진짜 NTRP (3회 이상이면 점수 공개, 아니면 분석 중 표시) */}
                {evalCount >= 3 ? (
                  <span className="bg-indigo-50 text-indigo-700 text-sm px-3 py-1 rounded-full font-bold border border-indigo-200 shadow-sm">
                    🏆 검증된 NTRP: {Number(profile?.ntrpScore).toFixed(1)}
                  </span>
                ) : (
                  <span className="bg-slate-100 text-slate-500 text-sm px-3 py-1 rounded-full font-medium border border-dashed border-slate-300">
                    🔍 실력 분석 중 ({evalCount}/3)
                  </span>
                )}

                {/* 3. 포지션 뱃지 */}
                <span className="bg-orange-50 text-orange-600 text-sm px-3 py-1 rounded-full font-medium border border-orange-100">
                  🏸 {profile?.preferredPos === "ANY" ? "올라운더" : profile?.preferredPos || "미입력"}
                </span>
              </div>
            </div>
          </div>
          
          <Link href="/mypage/profile" className="w-full sm:w-auto mt-4 sm:mt-0">
            <Button variant="outline" className="w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-50">
              프로필 수정
            </Button>
          </Link>
        </div>

        {/* ... (내가 만든 방, 참여한 방 영역 유지) ... */}
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
            <div className="space-y-4">{hosted.map(renderMatchCard)}</div>
          )}
        </section>

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
            <div className="space-y-4">{joined.map(renderMatchCard)}</div>
          )}
        </section>

      </div>
    </div>
  );
}