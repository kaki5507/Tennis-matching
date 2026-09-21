// app/tournaments/page.tsx
import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import TennisMascot from "@/components/TennisMascot";

const prisma = new PrismaClient();

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  RECRUITING: { text: "모집중", className: "bg-green-100 text-green-700" },
  CLOSED: { text: "모집마감", className: "bg-amber-100 text-amber-700" },
  ONGOING: { text: "진행중", className: "bg-blue-100 text-blue-700" },
  COMPLETED: { text: "종료", className: "bg-slate-100 text-slate-500" },
};

export default async function TournamentsPage() {
  const tournaments = await prisma.tournament.findMany({
    include: {
      court: { select: { name: true } },
      _count: { select: { participants: true } },
    },
    orderBy: [{ status: "asc" }, { startDate: "asc" }],
  });

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: "var(--mist)" }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-3xl" style={{ color: "var(--ink)" }}>
            🏆 자체 대회
          </h1>
          <p className="text-slate-500 mt-2">검증된 실력과 매너를 가진 분들을 위한 공식 대회입니다.</p>
        </div>

        {tournaments.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
            <TennisMascot pose="sad" className="w-24 h-24 mx-auto mb-4" />
            <p className="text-slate-500">아직 개설된 대회가 없습니다.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {tournaments.map((t) => {
              const label = STATUS_LABEL[t.status];
              return (
                <Link
                  key={t.id}
                  href={`/tournaments/${t.id}`}
                  className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${label.className}`}>{label.text}</span>
                    <span className="text-xs text-slate-400">
                      {t._count.participants}/{t.maxParticipants}명
                    </span>
                  </div>
                  <h3 className="font-display text-lg mb-1" style={{ color: "var(--court)" }}>
                    {t.title}
                  </h3>
                  <p className="text-sm text-slate-500 mb-2">📍 {t.court.name}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(t.startDate).toLocaleDateString("ko-KR")} · NTRP {Number(t.minNtrp).toFixed(1)}~{Number(t.maxNtrp).toFixed(1)}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
