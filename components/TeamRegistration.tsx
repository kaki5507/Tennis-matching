"use client";

// components/TeamRegistration.tsx
// 복식 대회 상세 페이지의 신청 영역. 조회자의 상태(viewer)에 따라 화면이 달라집니다.
//  - eligible            : 파트너 검색 → 선택 → 팀 신청
//  - team_pending_captain: "OO님의 수락을 기다리는 중" + 취소
//  - team_invited        : "OO님이 팀을 제안했어요" + 수락/거절
//  - registered          : 신청 완료 + 취소
//  - ineligible / guest  : 이유 안내

import { useEffect, useState } from "react";
import Link from "next/link";
import { searchPartnerCandidates, createTeam, respondToTeamInvite } from "@/app/actions/tournamentTeam";
import { cancelTournamentRegistration } from "@/app/actions/tournament";
import type { ViewerStatus } from "@/app/actions/tournament";
import TennisMascot from "@/components/TennisMascot";

interface Candidate {
  id: string;
  nickname: string | null;
  ntrpScore: number | null;
  ntrpCount: number;
}

interface Props {
  tournamentId: string;
  userId: string | null;
  viewer: ViewerStatus;
  maxTeamNtrp: number | null;
  onChanged: () => Promise<void>; // 성공하면 상세 데이터를 다시 불러옵니다
}

export default function TeamRegistration({ tournamentId, userId, viewer, maxTeamNtrp, onChanged }: Props) {
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [picked, setPicked] = useState<Candidate | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState("");

  // 입력이 멈추고 0.3초 뒤에 검색 (타이핑할 때마다 서버를 두드리지 않도록)
  useEffect(() => {
    if (viewer.kind !== "eligible" || !userId || picked) return;
    if (query.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCandidates([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const result = await searchPartnerCandidates(userId, tournamentId, query);
      if (!cancelled) {
        setCandidates(result.candidates);
        setIsSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, userId, tournamentId, viewer.kind, picked]);

  const run = async (action: () => Promise<{ success: boolean; error?: string }>) => {
    setIsBusy(true);
    setMessage("");
    const result = await action();
    if (!result.success) setMessage(result.error ?? "처리에 실패했습니다.");
    else await onChanged();
    setIsBusy(false);
  };

  if (viewer.kind === "guest" || !userId) {
    return (
      <p className="text-center text-slate-500 text-sm">
        <Link href="/login" className="text-ok underline">로그인</Link> 후 신청할 수 있어요.
      </p>
    );
  }

  if (viewer.kind === "registered") {
    return (
      <div className="text-center">
        <p className="text-ok font-medium mb-3">✅ 팀이 확정됐어요!</p>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => {
            if (confirm("팀 신청을 취소할까요? 파트너의 신청도 함께 취소돼요.")) {
              run(() => cancelTournamentRegistration(userId, tournamentId));
            }
          }}
          className="text-sm px-4 py-2 rounded-lg border border-line text-court"
        >
          팀 신청 취소
        </button>
        {message && <p className="text-xs text-red-500 mt-2">{message}</p>}
      </div>
    );
  }

  if (viewer.kind === "team_pending_captain") {
    return (
      <div className="text-center">
        <p className="font-medium text-court mb-1">⏳ {viewer.partnerName}님의 수락을 기다리고 있어요</p>
        <p className="text-xs text-slate-500 mb-3">수락하면 팀이 확정되고 알림이 가요.</p>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => run(() => cancelTournamentRegistration(userId, tournamentId))}
          className="text-sm px-4 py-2 rounded-lg border border-line text-court"
        >
          제안 취소
        </button>
        {message && <p className="text-xs text-red-500 mt-2">{message}</p>}
      </div>
    );
  }

  if (viewer.kind === "team_invited") {
    return (
      <div className="text-center">
        <p className="font-bold text-court mb-1">🎾 {viewer.captainName}님이 팀을 제안했어요</p>
        <p className="text-xs text-slate-500 mb-4">수락하면 두 분이 한 팀으로 대회에 참가해요.</p>
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => run(() => respondToTeamInvite(userId, viewer.teamId, true))}
            className="px-6 py-2.5 rounded-lg text-sm font-bold btn-clay"
          >
            수락하기
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => run(() => respondToTeamInvite(userId, viewer.teamId, false))}
            className="px-6 py-2.5 rounded-lg text-sm font-medium border border-line text-court"
          >
            거절
          </button>
        </div>
        {message && <p className="text-xs text-red-500 mt-3">{message}</p>}
      </div>
    );
  }

  if (viewer.kind === "ineligible") {
    return (
      <div className="text-center py-2">
        <TennisMascot pose="sad" className="w-16 h-16 mx-auto mb-2" />
        <p className="text-sm text-slate-500">{viewer.reason}</p>
      </div>
    );
  }

  // eligible: 파트너 검색 → 선택 → 신청
  return (
    <div>
      <h3 className="font-bold text-court mb-1">👯 팀으로 신청하기</h3>
      <p className="text-xs text-slate-500 mb-3">
        함께 나갈 파트너를 닉네임으로 찾아서 제안하세요. 파트너가 수락하면 팀이 확정돼요.
        {maxTeamNtrp !== null && ` (두 분의 NTRP 합이 ${maxTeamNtrp.toFixed(1)} 이하여야 해요)`}
      </p>

      {picked ? (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl tint">
          <div className="min-w-0">
            <div className="font-bold text-sm text-ink truncate">{picked.nickname ?? "익명"}</div>
            <div className="text-xs text-slate-500">
              NTRP {picked.ntrpScore !== null ? picked.ntrpScore.toFixed(1) : "평가 전"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setPicked(null);
              setMessage("");
            }}
            className="text-xs text-slate-500 underline shrink-0"
          >
            다시 고르기
          </button>
        </div>
      ) : (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="파트너 닉네임 (2글자 이상)"
            className="w-full h-11 rounded-lg border border-line px-3 text-sm bg-white focus-ok"
          />
          {isSearching && <p className="text-xs text-slate-400 mt-2">찾는 중...</p>}
          {!isSearching && query.trim().length >= 2 && candidates.length === 0 && (
            <p className="text-xs text-slate-400 mt-2">
              검색 결과가 없어요. 이미 다른 팀에 속했거나 이용이 제한된 분은 나타나지 않아요.
            </p>
          )}
          {candidates.length > 0 && (
            <ul className="mt-2 border border-line rounded-lg divide-y divide-[color:var(--line)] overflow-hidden">
              {candidates.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setPicked(c)}
                    className="w-full text-left px-3 py-2.5 hover:bg-[color:var(--mist)] flex justify-between gap-3"
                  >
                    <span className="text-sm text-ink truncate">{c.nickname ?? "익명"}</span>
                    <span className="text-xs text-slate-400 shrink-0">
                      {c.ntrpCount >= 3 && c.ntrpScore !== null ? `NTRP ${c.ntrpScore.toFixed(1)}` : "평가 부족"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {message && <p className="text-xs text-red-500 mt-3">{message}</p>}

      <button
        type="button"
        disabled={!picked || isBusy}
        onClick={() => picked && run(() => createTeam(userId, tournamentId, picked.id))}
        className="w-full h-12 mt-4 rounded-lg text-base font-bold btn-clay disabled:opacity-40"
      >
        {isBusy ? "신청 중..." : picked ? `${picked.nickname ?? "파트너"}님께 팀 제안하기` : "파트너를 먼저 골라주세요"}
      </button>
    </div>
  );
}
