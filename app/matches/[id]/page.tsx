// app/matches/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrismaClient, MatchStatus } from "@prisma/client"
import { Button } from "@/components/ui/button";
import JoinButton from "./JoinButton";
import HostDashboard from "./HostDashboard";
import MatchComments from "./MatchComments";
import MatchEvaluation from "./MatchEvaluation";

const prisma = new PrismaClient();

// 1. params의 타입을 Promise로 감싸줍니다.
export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  
  // 2. params 값이 완전히 넘어올 때까지 기다려(await) 줍니다!
  const resolvedParams = await params;
  
  const match = await prisma.match.findUnique({
    where: { 
      id: resolvedParams.id 
    }, 
    include: {
      court: true,
      host: true,
      participants: true, // 👈 [추가] 이 방에 신청한 사람들의 정보도 다 가져와!
    },
  });

  // 방이 없거나 삭제된 경우, Next.js의 404(Not Found) 페이지를 보여줍니다.
  if (!match) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        
        {/* 상단 헤더 영역 (그라데이션 배경) */}
        <div className="bg-gradient-to-r from-green-600 to-green-500 px-8 py-10 text-white">
          <div className="flex justify-between items-start mb-4">
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold backdrop-blur-sm">
              {match.status === "OPEN" ? "🟢 모집중" : "🔴 마감됨"}
            </span>
            <span className="font-medium bg-black/10 px-3 py-1 rounded-full text-sm">
              {match.gameType}
            </span>
          </div>
          <h1 className="text-3xl font-bold mb-3">
            {new Date(match.matchDate).toLocaleDateString("ko-KR", { month: 'long', day: 'numeric', weekday: 'short' })} 테니스 칠 분 구해요!
          </h1>
          <p className="text-green-50 flex items-center gap-2 text-lg">
            📍 {match.court?.name || "코트 미정"}
          </p>
        </div>

        {/* 상세 정보 요약 카드 영역 */}
        <div className="p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 p-6 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <p className="text-sm text-slate-500 mb-1">시작 시간</p>
              <p className="font-bold text-slate-900">
                {new Date(match.startTime).toLocaleTimeString("ko-KR", { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">요구 실력</p>
              <p className="font-bold text-slate-900">{match.targetLevel}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">참가비</p>
              <p className="font-bold text-slate-900">
                {match.costPerPerson === 0 ? "무료" : `${match.costPerPerson.toLocaleString()}원`}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">방장</p>
              <p className="font-bold text-slate-900">{match.host?.nickname || "알 수 없음"}</p>
            </div>
          </div>

          {/* 방장이 쓴 상세 설명 영역 */}
          <div className="mb-12">
            <h3 className="text-lg font-bold text-slate-900 mb-4">상세 안내 및 공지사항</h3>
            {/* whitespace-pre-wrap 속성이 방장이 엔터 친 줄바꿈을 그대로 살려줍니다. */}
            <div className="text-slate-700 leading-relaxed whitespace-pre-wrap bg-white p-6 rounded-xl border border-slate-200 min-h-[120px]">
              {match.description || "상세 설명이 없습니다."}
            </div>
          </div>

          {/* 👈 [추가] 여기에 방장 대시보드를 끼워 넣습니다. (방장이 아니면 알아서 안 보임) */}
          <HostDashboard 
            matchId={match.id} 
            hostId={match.hostId} 
            status={match.status} 
            participants={match.participants || []} 
          />

          {/* 하단 액션 버튼 */}
          <div className="flex gap-4">
            <Link href="/matches" className="flex-1">
              <Button variant="outline" className="w-full h-14 text-lg border-slate-300 text-slate-700">
                목록으로
              </Button>
            </Link>
            {/* 👈 가짜 버튼을 지우고 진짜 버튼 부품을 끼워 넣습니다 */}
            <JoinButton matchId={match.id} />
            
            {/* 🌟 [추가] 경기가 'COMPLETED' 상태일 때만 평가 화면을 띄웁니다 */}
            {match.status === "COMPLETED" && (
              <MatchEvaluation matchId={match.id} />
            )}

            {/* 👈 [추가] 하단 액션 버튼 바로 밑에 Q&A 댓글 영역 추가 */}
            <MatchComments matchId={match.id} />
          </div>
        </div>

      </div>
    </div>
  );
}