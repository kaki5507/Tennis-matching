"use client";

import { useState } from "react";
import { roundName } from "@/lib/bracket";
import { genderBadgeClass, type GenderKind } from "@/lib/gender";

export interface BracketMatch {
  id: string;
  round: number;
  position: number;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  score: string | null;
  isBye: boolean;
  isThirdPlace: boolean;
}

interface Props {
  matches: BracketMatch[];
  nameMap: Record<string, string>;
  kindMap?: Record<string, GenderKind>;
  canEdit: boolean;
  highlightUserId?: string | null; // 로그인한 본인 경기 강조
  onSetWinner: (matchId: string, winnerId: string, score: string) => Promise<void>;
}

function PlayerRow({
  name,
  kind,
  isWinner,
  isLoser,
  isMe,
}: {
  name: string;
  kind?: GenderKind;
  isWinner: boolean;
  isLoser: boolean;
  isMe: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-3 py-2 text-sm ${
        isWinner ? "bracket-row-winner font-bold" : ""
      } ${isLoser ? "text-slate-400" : "text-ink"}`}
    >
      <span className="truncate flex items-center gap-1.5 min-w-0">
        {kind && <span className={`w-2 h-2 rounded-full shrink-0 ${genderBadgeClass(kind)}`} />}
        <span className="truncate">
          {name}
          {isMe && <span className="ml-1 text-[10px] font-bold text-clay">나</span>}
        </span>
      </span>
      {isWinner && <span aria-label="승리">🎾</span>}
    </div>
  );
}

function MatchCard({
  match,
  nameMap,
  kindMap,
  canEdit,
  highlightUserId,
  onSetWinner,
}: {
  match: BracketMatch;
  nameMap: Record<string, string>;
  kindMap: Record<string, GenderKind>;
  canEdit: boolean;
  highlightUserId?: string | null;
  onSetWinner: Props["onSetWinner"];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [score, setScore] = useState(match.score ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const nameOf = (id: string | null) => (id ? nameMap[id] ?? "알 수 없음" : match.isBye ? "부전승" : "대기 중");
  const ready = !!match.player1Id && !!match.player2Id && !match.isBye;
  const isMine = !!highlightUserId && (match.player1Id === highlightUserId || match.player2Id === highlightUserId);

  const save = async (winnerId: string) => {
    setIsSaving(true);
    await onSetWinner(match.id, winnerId, score);
    setIsSaving(false);
    setIsEditing(false);
  };

  return (
    <div
      className={`w-48 rounded-xl overflow-hidden bg-chalk ${isMine ? "bracket-card-me" : "border border-line"}`}
    >
      <PlayerRow
        name={nameOf(match.player1Id)}
        kind={match.player1Id ? kindMap[match.player1Id] : undefined}
        isWinner={!!match.winnerId && match.winnerId === match.player1Id}
        isLoser={!!match.winnerId && !!match.player1Id && match.winnerId !== match.player1Id}
        isMe={!!highlightUserId && match.player1Id === highlightUserId}
      />
      <div className="h-px bracket-divider" />
      <PlayerRow
        name={nameOf(match.player2Id)}
        kind={match.player2Id ? kindMap[match.player2Id] : undefined}
        isWinner={!!match.winnerId && match.winnerId === match.player2Id}
        isLoser={!!match.winnerId && !!match.player2Id && match.winnerId !== match.player2Id}
        isMe={!!highlightUserId && match.player2Id === highlightUserId}
      />

      {match.score && !isEditing && (
        <div className="px-3 py-1 text-[11px] text-slate-500 tint">
          {match.score}
        </div>
      )}

      {canEdit && ready && !isEditing && (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="w-full text-[11px] font-medium py-1.5 tint text-court"
        >
          {match.winnerId ? "결과 수정" : "결과 입력"}
        </button>
      )}

      {isEditing && match.player1Id && match.player2Id && (
        <div className="p-2 space-y-1.5 tint">
          <input
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="스코어 (예: 6-4 6-3)"
            className="w-full h-8 rounded-md border border-slate-200 px-2 text-xs bg-white"
          />
          {[match.player1Id, match.player2Id].map((pid) => (
            <button
              key={pid}
              type="button"
              disabled={isSaving}
              onClick={() => save(pid)}
              className="w-full h-8 rounded-md text-xs font-medium text-white truncate px-2 bg-clay text-white"
            >
              {nameMap[pid] ?? "알 수 없음"} 승
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="w-full text-[11px] text-slate-500 py-1"
          >
            취소
          </button>
        </div>
      )}
    </div>
  );
}

export default function TournamentBracket({ matches, nameMap, kindMap = {}, canEdit, highlightUserId, onSetWinner }: Props) {
  const main = matches.filter((m) => !m.isThirdPlace);
  const thirdPlace = matches.find((m) => m.isThirdPlace);
  const totalRounds = Math.max(...main.map((m) => m.round));
  const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* 가로로 긴 대진표는 이 영역 안에서만 스크롤 (모바일에서 페이지 전체가 옆으로 밀리지 않게) */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-6 min-w-max">
          {rounds.map((round) => (
            <div key={round} className="flex flex-col">
              <div className="font-display text-sm mb-3 text-center text-court">
                {roundName(round, totalRounds)}
              </div>
              <div className="flex flex-col justify-around flex-1 gap-4">
                {main
                  .filter((m) => m.round === round)
                  .map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      nameMap={nameMap}
                      kindMap={kindMap}
                      canEdit={canEdit}
                      highlightUserId={highlightUserId}
                      onSetWinner={onSetWinner}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {thirdPlace && (
        <div>
          <div className="font-display text-sm mb-3 text-court">
            🥉 3·4위전
          </div>
          <MatchCard
            match={thirdPlace}
            nameMap={nameMap}
            kindMap={kindMap}
            canEdit={canEdit}
            highlightUserId={highlightUserId}
            onSetWinner={onSetWinner}
          />
        </div>
      )}
    </div>
  );
}
