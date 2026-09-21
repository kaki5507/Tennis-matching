import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import TennisMascot from "@/components/TennisMascot";

// DB와 소통할 Prisma 준비
const prisma = new PrismaClient();

// 💡 맨 위에 "use client"가 없죠? 이 화면은 '서버'에서 그려져서 내려옵니다!
export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ onlyMyLevel?: string }>;
}) {
  const { onlyMyLevel } = await searchParams;
  const filterByLevel = onlyMyLevel === "1";

  // [NEW] 로그인한 유저의 NTRP 점수 확인 (필터링에 사용)
  const { data: authData } = await supabase.auth.getUser();
  let myDisplayScore: number | null = null;
  if (authData.user) {
    const me = await prisma.user.findUnique({ where: { id: authData.user.id } });
    if (me) {
      // 평가 3회 미만(미검증)이면 기본값 2.0으로 취급 (방 만들기 페이지와 동일한 규칙)
      const rawScore = me.ntrpCount >= 3 && me.ntrpScore ? Number(me.ntrpScore) : 2.0;
      myDisplayScore = Math.round(rawScore * 2) / 2;
    }
  }

  // 1. DB에서 매칭 방 목록 가져오기 
  const allMatches = await prisma.match.findMany({
    where: {
      status: "OPEN", // 🟢 '모집 중'인 방만 가져오기
    },
    include: {
      court: true, // 🏟️ 방이 열리는 코트장 정보도 같이 줘!
      host: true,  // 👤 방장 정보(닉네임 등)도 같이 줘!
    },
    orderBy: [
      { matchDate: "asc" }, // 날짜가 가까운 순서대로 정렬
      { startTime: "asc" }, // 같은 날짜면 시간이 이른 순서대로 정렬
    ],
  });

  // [NEW] "내 레벨에 맞는 방만 보기" 필터 (targetLevel이 "1.5-2.0" 같은 범위 문자열일 때만 검사)
  const matches =
    filterByLevel && myDisplayScore !== null
      ? allMatches.filter((match) => {
          if (match.targetLevel === "누구나" || match.targetLevel === "ANY") return true;
          const levels = match.targetLevel.match(/[\d.]+/g);
          if (!levels || levels.length < 2) return true; // 형식을 못 읽으면 안전하게 노출
          const [min, max] = levels.map(parseFloat);
          return myDisplayScore! >= min && myDisplayScore! <= max;
        })
      : allMatches;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        
        {/* 상단 헤더 영역 */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">오픈된 매칭 방 🎾</h1>
            <p className="text-slate-500 mt-2">나에게 맞는 조건의 테니스 게임을 찾아보세요.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/tournaments">
              <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                🏆 대회
              </Button>
            </Link>
            <Link href="/history">
              <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                📋 전체 기록실
              </Button>
            </Link>
            <Link href="/matches/create">
              <Button className="bg-green-600 hover:bg-green-700">새 방 만들기</Button>
            </Link>
          </div>
        </div>

        {/* [NEW] 내 레벨 필터 토글 */}
        {myDisplayScore !== null && (
          <div className="mb-6 flex items-center gap-2">
            <Link
              href={filterByLevel ? "/matches" : "/matches?onlyMyLevel=1"}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                filterByLevel
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              🎯 내 레벨({myDisplayScore.toFixed(1)})에 맞는 방만 보기
            </Link>
          </div>
        )}

        {/* 매칭 리스트 카드 영역 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <TennisMascot pose="sad" className="w-24 h-24 mx-auto mb-4" />
              <p className="text-slate-500">아직 모집 중인 방이 없습니다. <br/> 첫 번째 방장이 되어 사람들을 초대해 보세요!</p>
            </div>
          ) : (
            matches.map((match) => (
              <div key={match.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col relative overflow-hidden">
                
                {/* 상단 태그 */}
                <div className="flex justify-between items-center mb-4">
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                    모집중
                  </span>
                  <span className="text-slate-400 text-sm font-medium">
                    {match.gameType}
                  </span>
                </div>

                {/* 메인 정보 (날짜, 시간, 코트장) */}
                <h3 className="text-xl font-bold text-slate-900 mb-1">
                  {/* 날짜를 예쁘게 변환 (예: 10월 25일 (금)) */}
                  {new Date(match.matchDate).toLocaleDateString("ko-KR", { month: 'long', day: 'numeric', weekday: 'short' })}
                </h3>
                <p className="text-slate-600 font-medium mb-3">
                  ⏰ {new Date(match.startTime).toLocaleTimeString("ko-KR", { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-slate-500 text-sm mb-4 line-clamp-1">
                  📍 {match.court?.name || "코트 미정"}
                </p>

                <div className="h-px bg-slate-100 w-full mb-4"></div>

                {/* 하단 조건 정보 */}
                <div className="space-y-2 mb-6 flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">요구 실력</span>
                    <span className="font-semibold text-slate-700">{match.targetLevel}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">참가비</span>
                    <span className="font-semibold text-slate-700">
                      {match.costPerPerson === 0 ? "무료" : `${match.costPerPerson.toLocaleString()}원`}
                    </span>
                  </div>
                </div>

                {/* 하단 방장 정보 & 버튼 */}
                <div className="flex justify-between items-center mt-auto">
                  <div className="text-sm text-slate-500">
                    방장: <span className="font-medium text-slate-700">{match.host?.nickname || "알 수 없음"}</span>
                  </div>
                  <Link href={`/matches/${match.id}`}>
                    <Button variant="outline" className="border-green-600 text-green-600 hover:bg-green-50 text-sm h-8 px-4">
                      자세히
                    </Button>
                  </Link>
                </div>

              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}