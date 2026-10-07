// app/tournaments/page.tsx
import Link from "next/link";
import { getTournaments } from "@/app/actions/tournament";
import TennisMascot from "@/components/TennisMascot";
import { formatNtrp } from "@/lib/tournamentRules";

// 대회 신청/마감 상태는 수시로 바뀌므로 정적으로 캐시하지 않습니다.
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  RECRUITING: { text: "모집중", className: "badge-ok" },
  CLOSED: { text: "모집마감", className: "badge-warn" },
  ONGOING: { text: "진행중", className: "badge-info" },
  COMPLETED: { text: "종료", className: "bg-slate-100 text-slate-500" },
};

export default async function TournamentsPage() {
  const { tournaments } = await getTournaments();

  return (
    <div className="min-h-screen py-12 px-4 page-bg">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-3xl text-ink">🏆 자체 대회</h1>
          <p className="text-slate-500 mt-2">검증된 실력과 매너를 가진 분들을 위한 공식 대회입니다.</p>
        </div>

        {tournaments.length === 0 ? (
          <div className="text-center py-16 surface rounded-2xl">
            <TennisMascot pose="sad" className="w-24 h-24 mx-auto mb-4" />
            <p className="text-slate-500">아직 개설된 대회가 없습니다.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {tournaments.map((t) => {
              const label = STATUS_LABEL[t.status];
              const isDoubles = t.format === "DOUBLES";
              return (
                <Link
                  key={t.id}
                  href={`/tournaments/${t.id}`}
                  className="card-link surface p-5 rounded-2xl shadow-sm"
                >
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${label.className}`}>{label.text}</span>
                      <span className="text-xs font-bold px-2 py-1 rounded-full chip-on">
                        {isDoubles ? "👯 복식" : "🎾 단식"}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">
                      {t.entrantCount}/{t.maxParticipants}
                      {isDoubles ? "팀" : "명"}
                    </span>
                  </div>
                  <h3 className="font-display text-lg mb-1 text-court break-words">{t.title}</h3>
                  <p className="text-sm text-slate-500 mb-2">📍 {t.courtName}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(t.startDate).toLocaleDateString("ko-KR")} · NTRP {t.minNtrp.toFixed(1)}~{t.maxNtrp.toFixed(1)}
                    {isDoubles && t.maxTeamAvgNtrp !== null && ` · 팀 평균 ${formatNtrp(t.maxTeamAvgNtrp)} 이하`}
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
