// app/users/[id]/page.tsx
"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { getUserRecord } from "@/app/actions/record";
import TennisLoader from "@/components/TennisLoader";

interface RecordData {
  totalMatches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number | null;
}

interface RecentMatch {
  matchId: string;
  matchDate: string | Date;
  courtName: string;
  result: "WIN" | "LOSS" | "DRAW" | null;
}

interface UserData {
  nickname: string | null;
  tennisLevel: string | null;
  preferredPos: string | null;
  mannerScore: number | string | null;
  ntrpScore: number | string | null;
  ntrpCount: number;
}

// [NEW] 대회 경력
interface TournamentHonor {
  tournamentId: string;
  title: string;
  date: string | Date;
  place: 1 | 2 | 3;
}

interface TournamentMatchRecord {
  matchId: string;
  tournamentId: string;
  tournamentTitle: string;
  date: string | Date;
  roundLabel: string;
  opponentId: string | null;
  opponentName: string;
  won: boolean;
  score: string | null;
}

interface TournamentSummary {
  titles: number;
  runnerUps: number;
  thirdPlaces: number;
  matchWins: number;
  matchLosses: number;
}

const MEDAL: Record<1 | 2 | 3, { emoji: string; label: string; bg: string }> = {
  1: { emoji: "🏆", label: "우승", bg: "var(--ball)" },
  2: { emoji: "🥈", label: "준우승", bg: "#e5e7eb" },
  3: { emoji: "🥉", label: "3위", bg: "#f3d9c4" },
};

const RESULT_LABEL: Record<string, { text: string; className: string }> = {
  WIN: { text: "승", className: "bg-green-100 text-green-700" },
  LOSS: { text: "패", className: "bg-red-100 text-red-700" },
  DRAW: { text: "무", className: "bg-slate-100 text-slate-600" },
};

export default function UserRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [user, setUser] = useState<UserData | null>(null);
  const [record, setRecord] = useState<RecordData | null>(null);
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [honors, setHonors] = useState<TournamentHonor[]>([]);
  const [tMatches, setTMatches] = useState<TournamentMatchRecord[]>([]);
  const [tSummary, setTSummary] = useState<TournamentSummary | null>(null);
  const [onlyWins, setOnlyWins] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const result = await getUserRecord(id);
      if (!isMounted) return;

      if (!result.success || !result.user || !result.record) {
        setErrorMsg(result.error ?? "전적을 불러올 수 없습니다.");
        setIsLoading(false);
        return;
      }

      setUser(result.user);
      setRecord(result.record);
      setRecentMatches(result.recentMatches ?? []);
      setHonors(result.tournamentHonors ?? []);
      setTMatches(result.tournamentMatches ?? []);
      setTSummary(result.tournamentRecord ?? null);
      setIsLoading(false);
    };

    load();
    return () => { isMounted = false; };
  }, [id]);

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <TennisLoader label="전적을 불러오는 중..." />
      </div>
    );
  }

  if (errorMsg || !user || !record) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-500 mb-4">{errorMsg || "유저를 찾을 수 없습니다."}</p>
        <Link href="/matches" className="text-green-600 underline">매칭 목록으로 돌아가기</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* 프로필 헤더 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-2xl font-bold shrink-0">
            {(user.nickname || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{user.nickname || "테니스인"}</h1>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500 mt-1">
              {user.tennisLevel && <span>🎾 구력: {user.tennisLevel}</span>}
              {user.preferredPos && <span>🤾 선호 위치: {user.preferredPos}</span>}
            </div>
            {/* [NEW] 대회 입상 배지 */}
            {tSummary && tSummary.titles + tSummary.runnerUps + tSummary.thirdPlaces > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tSummary.titles > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: MEDAL[1].bg, color: "var(--court)" }}>
                    🏆 우승 {tSummary.titles}회
                  </span>
                )}
                {tSummary.runnerUps > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: MEDAL[2].bg, color: "var(--court)" }}>
                    🥈 준우승 {tSummary.runnerUps}회
                  </span>
                )}
                {tSummary.thirdPlaces > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: MEDAL[3].bg, color: "var(--court)" }}>
                    🥉 3위 {tSummary.thirdPlaces}회
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <div className="text-xs text-slate-500 mb-1">NTRP 실력 평가</div>
            <div className="text-xl font-bold text-slate-900">
              {user.ntrpScore ? Number(user.ntrpScore).toFixed(1) : "평가 전"}
              {user.ntrpCount > 0 && <span className="text-xs text-slate-400 font-normal"> ({user.ntrpCount}회)</span>}
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <div className="text-xs text-slate-500 mb-1">매너 온도</div>
            <div className="text-xl font-bold text-slate-900">
              🌡️ {user.mannerScore ? Number(user.mannerScore).toFixed(1) : "36.5"}도
            </div>
          </div>
        </div>
      </div>

      {/* 전적 요약 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">📊 전적</h2>
        <div className="grid grid-cols-4 gap-2 text-center mb-4">
          <div>
            <div className="text-2xl font-bold text-slate-900">{record.totalMatches}</div>
            <div className="text-xs text-slate-500">총 경기</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{record.wins}</div>
            <div className="text-xs text-slate-500">승</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-500">{record.losses}</div>
            <div className="text-xs text-slate-500">패</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-500">{record.draws}</div>
            <div className="text-xs text-slate-500">무</div>
          </div>
        </div>
        {record.winRate !== null ? (
          <div className="text-center text-sm text-slate-600">
            승률 <span className="font-bold text-slate-900">{record.winRate}%</span>
            <span className="text-slate-400"> (무승부 제외)</span>
          </div>
        ) : (
          <div className="text-center text-sm text-slate-400">아직 승패가 기록된 경기가 없어요.</div>
        )}
      </div>

      {/* [NEW] 대회 경력 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">🏆 대회 경력</h2>
        {honors.length === 0 ? (
          <p className="text-sm text-slate-400">아직 대회 입상 기록이 없어요.</p>
        ) : (
          <ul className="space-y-2">
            {honors.map((h) => (
              <li key={h.tournamentId}>
                <Link
                  href={`/tournaments/${h.tournamentId}/bracket`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50"
                >
                  <span
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0"
                    style={{ background: MEDAL[h.place].bg }}
                    aria-label={MEDAL[h.place].label}
                  >
                    {MEDAL[h.place].emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-800 truncate">{h.title}</div>
                    <div className="text-xs text-slate-400">
                      {MEDAL[h.place].label} · {new Date(h.date).toLocaleDateString("ko-KR")}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">대진표 →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* [NEW] 대회 경기 기록 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">🎾 대회 경기 기록</h2>
            {tSummary && tMatches.length > 0 && (
              <p className="text-xs text-slate-400 mt-0.5">
                {tSummary.matchWins}승 {tSummary.matchLosses}패 (부전승 제외)
              </p>
            )}
          </div>
          {tMatches.length > 0 && (
            <div className="flex rounded-full p-0.5 text-xs font-medium shrink-0" style={{ background: "var(--mist)" }}>
              {[
                { value: false, label: "전체" },
                { value: true, label: "승리만" },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setOnlyWins(opt.value)}
                  className="px-3 py-1 rounded-full"
                  style={{
                    background: onlyWins === opt.value ? "var(--court)" : "transparent",
                    color: onlyWins === opt.value ? "var(--chalk)" : "var(--court)",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {tMatches.length === 0 ? (
          <p className="text-sm text-slate-400">아직 대회에서 치른 경기가 없어요.</p>
        ) : (
          <ul className="space-y-2">
            {tMatches
              .filter((m) => !onlyWins || m.won)
              .map((m) => (
                <li key={m.matchId}>
                  <Link
                    href={`/tournaments/${m.tournamentId}/bracket`}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50"
                  >
                    <span
                      className="text-xs font-bold w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: m.won ? "var(--ball)" : "#f1f5f9",
                        color: m.won ? "var(--court)" : "#94a3b8",
                      }}
                    >
                      {m.won ? "승" : "패"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-slate-800 truncate">
                        <span className="font-bold">{m.roundLabel}</span> · vs {m.opponentName}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {m.tournamentTitle} · {new Date(m.date).toLocaleDateString("ko-KR")}
                      </div>
                    </div>
                    {m.score && <span className="text-xs text-slate-500 shrink-0">{m.score}</span>}
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* 최근 경기 목록 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 mb-4">🕒 최근 매칭 경기</h2>
        {recentMatches.length === 0 ? (
          <p className="text-sm text-slate-400">참여한 경기 기록이 없어요.</p>
        ) : (
          <ul className="space-y-2">
            {recentMatches.map((m) => {
              const label = m.result ? RESULT_LABEL[m.result] : null;
              return (
                <li key={m.matchId}>
                  <Link
                    href={`/matches/${m.matchId}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-slate-100"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-800">{m.courtName}</div>
                      <div className="text-xs text-slate-400">
                        {new Date(m.matchDate).toLocaleDateString("ko-KR")}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-full ${label ? label.className : "bg-slate-100 text-slate-400"}`}
                    >
                      {label ? label.text : "평가 없음"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
