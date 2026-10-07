// app/matches/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/tournamentData";
import { Button } from "@/components/ui/button";
import JoinButton from "./JoinButton";
import HostDashboard from "./HostDashboard";
import MatchComments from "./MatchComments";
import MatchEvaluation from "./MatchEvaluation";
import ShareButton from "./ShareButton";
import { dayLabel, seatInfo } from "@/lib/matchDisplay";
import MatchChatWrapper from "./MatchChatWrapper";
import CourtMap from "@/components/CourtMap";

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
      participants: true, // 이 방에 신청한 사람들의 정보도 다 가져와!
    },
  });

  // 방이 없거나 삭제된 경우, Next.js의 404(Not Found) 페이지를 보여줍니다.
  if (!match || match.deletedAt) {
    notFound();
  }

  const dateStr = match.matchDate.toISOString().slice(0, 10);
  const day = dayLabel(dateStr);
  const accepted = match.participants.filter((p) => p.status === "ACCEPTED").length;
  const waiting = match.participants.filter((p) => p.status === "PENDING").length;
  const seat = seatInfo(match.gameType, accepted);
  const statusBadge =
    match.status === "OPEN" ? "🟢 모집중" : match.status === "COMPLETED" ? "🏁 경기 완료" : match.status === "CANCELED" ? "⚪ 취소됨" : "🔴 마감됨";

  return (
    <div className="min-h-screen page-bg py-12 px-4">
      <div className="max-w-3xl mx-auto surface rounded-2xl shadow-sm overflow-hidden">
        
        {/* 상단 헤더 영역 (그라데이션 배경) */}
        <div className="px-8 py-10 text-white hero-court">
          <div className="flex justify-between items-start mb-4">
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold backdrop-blur-sm">
              {statusBadge}
            </span>
            <div className="flex items-center gap-2">
              {day && match.status === "OPEN" && (
                <span className="font-bold bg-clay text-chalk px-3 py-1 rounded-full text-sm">{day}</span>
              )}
              <span className="font-medium bg-black/10 px-3 py-1 rounded-full text-sm">
                {match.gameType}
              </span>
              <ShareButton title={`${match.court?.name ?? "테니스"} ${match.gameType} 매칭`} />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-3">
            {new Date(match.matchDate).toLocaleDateString("ko-KR", { month: 'long', day: 'numeric', weekday: 'short' })} 테니스 칠 분 구해요!
          </h1>
          <p className="text-chalk flex items-center gap-2 text-lg">
            📍 {match.court?.name || "코트 미정"}
          </p>
        </div>

        {/* 상세 정보 요약 카드 영역 */}
        <div className="p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 p-6 tint rounded-xl border border-slate-100">
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
            {match.minMannerScore !== null && (
              <div>
                <p className="text-sm text-slate-500 mb-1">매너 온도 기준</p>
                <p className="font-bold text-slate-900">🌡️ {Number(match.minMannerScore).toFixed(1)}도 이상</p>
              </div>
            )}
            <div>
              <p className="text-sm text-slate-500 mb-1">참가비</p>
              <p className="font-bold text-slate-900">
                {match.costPerPerson === 0 ? "무료" : `${match.costPerPerson.toLocaleString()}원`}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">참여 현황</p>
              <p className="font-bold text-slate-900">
                {seat.joined}
                {seat.capacity ? `/${seat.capacity}명` : "명"}
                {waiting > 0 && <span className="font-normal text-slate-500 text-sm"> · 대기 {waiting}</span>}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-1">방장</p>
              <p className="font-bold text-slate-900">{match.host?.nickname || "알 수 없음"}</p>
            </div>
          </div>

          {/* [NEW] 테니스장 위치 지도 */}
          {match.court && (
            <div className="mb-12">
              <h3 className="text-lg heading mb-4">📍 테니스장 위치</h3>
              <CourtMap
                latitude={Number(match.court.latitude)}
                longitude={Number(match.court.longitude)}
                name={match.court.name}
              />
              <p className="text-sm text-slate-500 mt-2">{match.court.address}</p>
            </div>
          )}

          {/* 방장이 쓴 상세 설명 영역 */}
          <div className="mb-12">
            <h3 className="text-lg heading mb-4">상세 안내 및 공지사항</h3>
            <div className="text-slate-700 leading-relaxed whitespace-pre-wrap surface p-6 rounded-xl min-h-[120px]">
              {match.description || "상세 설명이 없습니다."}
            </div>
          </div>

          {/* 방장 대시보드 (방장에게만 보임) */}
          {/* 서버는 로그인 정보를 알 수 없으므로 항상 내려보내고, 화면(브라우저)에서 방장인 경우에만 보여줍니다. 실제 권한은 서버 액션이 따로 검사 */}
          <HostDashboard hostId={match.hostId} matchId={match.id} currentStatus={match.status} costPerPerson={match.costPerPerson} />

          {/* 하단 액션 버튼 */}
          <div className="flex gap-4 mb-10">
            <Link href="/matches" className="flex-1">
              <Button variant="outline" className="w-full h-14 text-lg border-slate-300 text-slate-700">
                목록으로
              </Button>
            </Link>
            <JoinButton matchId={match.id} />
          </div>

          {/* 🌟 경기가 'COMPLETED' 상태일 때만 평가 화면을 띄웁니다 */}
          {match.status === "COMPLETED" && (
            <MatchEvaluation matchId={match.id} />
          )}

          {/* 하단 액션 버튼 바로 밑에 Q&A 댓글 영역 추가 */}
          <MatchComments matchId={match.id} />
          
          {/* 프라이빗 채팅방 (권한 없는 사람에겐 자동으로 숨겨짐) */}
          <MatchChatWrapper matchId={match.id} />
        </div>
      </div>
    </div>
  );
}