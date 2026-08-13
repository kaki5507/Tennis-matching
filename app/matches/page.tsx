import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import { Button } from "@/components/ui/button";

// DB와 소통할 Prisma 준비
const prisma = new PrismaClient();

// 💡 맨 위에 "use client"가 없죠? 이 화면은 '서버'에서 그려져서 내려옵니다!
export default async function MatchesPage() {
  
  // 1. DB에서 매칭 방 목록 가져오기 
  const matches = await prisma.match.findMany({
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

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        
        {/* 상단 헤더 영역 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">오픈된 매칭 방 🎾</h1>
            <p className="text-slate-500 mt-2">나에게 맞는 조건의 테니스 게임을 찾아보세요.</p>
          </div>
          <Link href="/matches/create">
            <Button className="bg-green-600 hover:bg-green-700">새 방 만들기</Button>
          </Link>
        </div>

        {/* 매칭 리스트 카드 영역 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.length === 0 ? (
            <div className="col-span-full text-center py-16 text-slate-500 bg-white rounded-2xl border border-slate-100 shadow-sm">
              아직 모집 중인 방이 없습니다. <br/> 첫 번째 방장이 되어 사람들을 초대해 보세요!
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