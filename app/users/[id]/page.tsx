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

      {/* 최근 경기 목록 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 mb-4">🕒 최근 경기</h2>
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
