// app/history/page.tsx
import Link from "next/link";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PAGE_SIZE = 20;

// 💡 이 페이지도 matches/page.tsx와 같은 패턴: 서버에서 직접 DB 조회 후 내려줍니다.
export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const [matches, totalCount] = await Promise.all([
    prisma.match.findMany({
      where: { status: "COMPLETED" },
      include: {
        court: { select: { name: true } },
        host: { select: { nickname: true, email: true } },
        participants: {
          where: { status: "ACCEPTED" },
          select: { id: true },
        },
      },
      orderBy: { matchDate: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.match.count({ where: { status: "COMPLETED" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">🏆 전체 게임 기록실</h1>
          <p className="text-slate-500 mt-2">
            지금까지 완료된 모든 매칭의 기록입니다. 총 {totalCount}건.
          </p>
        </div>

        {matches.length === 0 ? (
          <div className="text-center py-16 text-slate-500 bg-white rounded-2xl border border-slate-100 shadow-sm">
            아직 완료된 경기가 없습니다. 첫 번째 기록의 주인공이 되어보세요! 🎾
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* 데스크톱: 표 형태 */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-left border-b border-slate-200">
                    <th className="px-6 py-3 font-medium">날짜</th>
                    <th className="px-6 py-3 font-medium">테니스장</th>
                    <th className="px-6 py-3 font-medium">경기 종류</th>
                    <th className="px-6 py-3 font-medium">레벨</th>
                    <th className="px-6 py-3 font-medium">방장</th>
                    <th className="px-6 py-3 font-medium text-center">참여인원</th>
                    <th className="px-6 py-3 font-medium text-right">상세</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((match) => (
                    <tr key={match.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-6 py-4 text-slate-700 whitespace-nowrap">
                        {new Date(match.matchDate).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-6 py-4 text-slate-800 font-medium">{match.court.name}</td>
                      <td className="px-6 py-4 text-slate-600">{match.gameType}</td>
                      <td className="px-6 py-4 text-slate-600">{match.targetLevel}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {match.host.nickname || match.host.email.split("@")[0]}
                      </td>
                      <td className="px-6 py-4 text-center text-slate-600">
                        {match.participants.length}명
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/matches/${match.id}`} className="text-green-600 hover:underline font-medium">
                          보기
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 모바일: 카드 형태 */}
            <div className="md:hidden divide-y divide-slate-100">
              {matches.map((match) => (
                <Link
                  key={match.id}
                  href={`/matches/${match.id}`}
                  className="block px-4 py-4 hover:bg-slate-50"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-900">{match.court.name}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(match.matchDate).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex gap-3">
                    <span>{match.gameType}</span>
                    <span>{match.targetLevel}</span>
                    <span>👤 {match.participants.length}명</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    방장: {match.host.nickname || match.host.email.split("@")[0]}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <Link
              href={`/history?page=${Math.max(1, page - 1)}`}
              aria-disabled={page <= 1}
              className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                page <= 1
                  ? "pointer-events-none text-slate-300 border-slate-100"
                  : "text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              이전
            </Link>
            <span className="text-sm text-slate-500 px-2">
              {page} / {totalPages}
            </span>
            <Link
              href={`/history?page=${Math.min(totalPages, page + 1)}`}
              aria-disabled={page >= totalPages}
              className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                page >= totalPages
                  ? "pointer-events-none text-slate-300 border-slate-100"
                  : "text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              다음
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
