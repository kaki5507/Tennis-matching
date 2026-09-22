"use client";

// components/BracketViewer.tsx
// 대진표 전용 화면에서 쓰는 "진짜 브래킷" 뷰어.
// 카드 위치를 수식으로 계산해 절대좌표로 배치하고, 같은 좌표로 SVG 연결선을 그립니다.
//
// 배치 수식 (unit = 카드높이 + 간격):
//   round r의 경기 p 위쪽 좌표 = HEADER + p * span + (span - unit) / 2,  span = 2^(r-1) * unit
//   → 다음 라운드 경기는 항상 이전 두 경기의 정확히 한가운데에 놓입니다.

import { useEffect, useMemo, useState } from "react";
import { roundName, seedOrder } from "@/lib/bracket";
import type { BracketMatch } from "@/components/TournamentBracket";

const CARD_W = 200;
const CARD_H = 68;
const GAP = 22;
const COL_GAP = 60;
const HEADER = 44;
const CHAMP_W = 220;
const CHAMP_H = 150;

interface Props {
  matches: BracketMatch[];
  nameMap: Record<string, string>;
  meId?: string | null;
  canEdit: boolean;
  isCompleted: boolean;
  championId: string | null;
  runnerUpId: string | null;
  thirdPlaceId: string | null;
  onSetWinner: (matchId: string, winnerId: string, score: string) => Promise<void>;
}

export default function BracketViewer({
  matches,
  nameMap,
  meId,
  canEdit,
  isCompleted,
  championId,
  runnerUpId,
  thirdPlaceId,
  onSetWinner,
}: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [scale, setScale] = useState(1);
  const [editing, setEditing] = useState<BracketMatch | null>(null);
  const [score, setScore] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 탈락 페이드 애니메이션을 위해, 첫 렌더 직후 한 번 상태를 바꿔 transition을 발동시킵니다.
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const main = useMemo(() => matches.filter((m) => !m.isThirdPlace), [matches]);
  const thirdPlaceMatch = matches.find((m) => m.isThirdPlace) ?? null;
  const totalRounds = main.length > 0 ? Math.max(...main.map((m) => m.round)) : 0;
  const size = 2 ** totalRounds;
  const unit = CARD_H + GAP;

  // 1라운드 자리 순서로 시드 번호 복원 (대진표는 표준 시드 배치로 만들어졌기 때문에 가능)
  const seedMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (totalRounds === 0) return map;
    const order = seedOrder(size);
    main
      .filter((m) => m.round === 1)
      .forEach((m) => {
        if (m.player1Id) map[m.player1Id] = order[m.position * 2];
        if (m.player2Id) map[m.player2Id] = order[m.position * 2 + 1];
      });
    return map;
  }, [main, size, totalRounds]);

  if (totalRounds === 0) return null;

  const colX = (round: number) => (round - 1) * (CARD_W + COL_GAP);
  const topOf = (round: number, position: number) => {
    const span = 2 ** (round - 1) * unit;
    return HEADER + position * span + (span - unit) / 2;
  };
  const centerOf = (round: number, position: number) => topOf(round, position) + CARD_H / 2;

  const finalMatch = main.find((m) => m.round === totalRounds) ?? null;
  const champX = colX(totalRounds) + CARD_W + COL_GAP;
  const finalCenter = centerOf(totalRounds, 0);
  const champTop = Math.max(HEADER, finalCenter - CHAMP_H / 2);
  const width = champX + CHAMP_W;
  const height = Math.max(HEADER + (size / 2) * unit - GAP, champTop + CHAMP_H + 8);

  // 일찍 탈락할수록 더 흐리게: 1라운드 탈락 0.28 → 결승 패배 0.75
  const fadeFor = (round: number) => (totalRounds <= 1 ? 0.5 : 0.28 + 0.47 * ((round - 1) / (totalRounds - 1)));

  const connectors = main
    .filter((m) => m.round < totalRounds)
    .map((m) => {
      const x1 = colX(m.round) + CARD_W;
      const y1 = centerOf(m.round, m.position);
      const x2 = colX(m.round + 1);
      const y2 = centerOf(m.round + 1, Math.floor(m.position / 2));
      const xm = x1 + COL_GAP / 2;
      return {
        key: m.id,
        d: `M${x1} ${y1} H${xm} V${y2} H${x2}`,
        advanced: !!m.winnerId,
        isHoverPath: !!hovered && m.winnerId === hovered,
        isBye: m.isBye,
      };
    });

  const openEditor = (match: BracketMatch) => {
    if (!canEdit || match.isBye || !match.player1Id || !match.player2Id) return;
    setEditing(match);
    setScore(match.score ?? "");
  };

  const save = async (winnerId: string) => {
    if (!editing) return;
    setIsSaving(true);
    await onSetWinner(editing.id, winnerId, score);
    setIsSaving(false);
    setEditing(null);
  };

  const renderRow = (match: BracketMatch, playerId: string | null, isThird: boolean) => {
    const isWinner = !!playerId && match.winnerId === playerId;
    const isLoser = !!playerId && !!match.winnerId && !isWinner && !match.isBye;
    const isMe = !!playerId && playerId === meId;
    const isHover = !!playerId && playerId === hovered;
    const isChampion = isWinner && !isThird && match.round === totalRounds;

    const targetOpacity = isLoser ? (isThird ? 0.55 : fadeFor(match.round)) : 1;
    const delay = isLoser ? match.round * 180 : 0;

    const name = playerId ? nameMap[playerId] ?? "알 수 없음" : match.isBye ? "부전승" : "대기 중";

    return (
      <div
        onMouseEnter={() => playerId && setHovered(playerId)}
        onMouseLeave={() => setHovered(null)}
        className="flex items-center gap-2 px-2.5 relative"
        style={{
          height: CARD_H / 2,
          background: isWinner ? "rgba(215,222,35,0.28)" : "transparent",
          opacity: mounted ? targetOpacity : 1,
          filter: mounted && isLoser ? "grayscale(1)" : "none",
          transition: `opacity 900ms ease ${delay}ms, filter 900ms ease ${delay}ms, background 300ms`,
          boxShadow: isHover ? "inset 0 0 0 2px var(--clay)" : "none",
        }}
      >
        {isWinner && <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: "var(--ball)" }} />}
        {isMe && !isWinner && <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: "var(--clay)" }} />}

        <span
          className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: playerId ? "var(--mist)" : "transparent",
            color: "var(--court)",
          }}
        >
          {playerId && seedMap[playerId] ? seedMap[playerId] : ""}
        </span>

        <span
          className="truncate text-[13px] flex-1"
          style={{
            color: playerId ? "var(--ink)" : "#94a3b8",
            fontWeight: isWinner ? 700 : 500,
            textDecoration: isLoser ? "line-through" : "none",
            fontStyle: playerId ? "normal" : "italic",
          }}
        >
          {name}
          {isMe && (
            <span className="ml-1 text-[10px] font-bold not-italic" style={{ color: "var(--clay)" }}>
              나
            </span>
          )}
        </span>

        {isChampion && <span aria-label="우승">🏆</span>}
        {isWinner && !isChampion && match.score && (
          <span className="text-[10px] text-slate-500 shrink-0 max-w-[64px] truncate" title={match.score}>
            {match.score}
          </span>
        )}
      </div>
    );
  };

  const renderCard = (match: BracketMatch, style: React.CSSProperties, isThird = false) => {
    const ready = !match.isBye && !!match.player1Id && !!match.player2Id;
    const clickable = canEdit && ready;
    const isMine = !!meId && (match.player1Id === meId || match.player2Id === meId);

    return (
      <div
        key={match.id}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={() => openEditor(match)}
        onKeyDown={(e) => {
          if (clickable && (e.key === "Enter" || e.key === " ")) openEditor(match);
        }}
        className="rounded-xl overflow-hidden"
        style={{
          ...style,
          width: CARD_W,
          height: CARD_H,
          background: "var(--chalk)",
          border: match.isBye ? "1px dashed rgba(251,248,241,0.5)" : isMine ? "2px solid var(--clay)" : "1px solid rgba(47,74,51,0.15)",
          boxShadow: match.isBye ? "none" : "0 6px 18px rgba(0,0,0,0.18)",
          opacity: match.isBye ? 0.55 : 1,
          cursor: clickable ? "pointer" : "default",
        }}
        title={clickable ? "클릭해서 결과 입력" : undefined}
      >
        {renderRow(match, match.player1Id, isThird)}
        <div className="h-px" style={{ background: "rgba(47,74,51,0.1)" }} />
        {renderRow(match, match.player2Id, isThird)}
      </div>
    );
  };

  return (
    <div>
      {/* 확대/축소 */}
      <div className="flex items-center justify-end gap-1 mb-3">
        {[0.6, 0.8, 1].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScale(s)}
            className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{
              background: scale === s ? "var(--ball)" : "rgba(251,248,241,0.12)",
              color: scale === s ? "var(--court)" : "var(--chalk)",
            }}
          >
            {Math.round(s * 100)}%
          </button>
        ))}
      </div>

      {/* 대진표는 이 영역 안에서만 가로/세로 스크롤 */}
      <div className="overflow-auto rounded-2xl pb-4">
        <div style={{ width: width * scale, height: height * scale }}>
          <div
            className="relative"
            style={{ width, height, transform: `scale(${scale})`, transformOrigin: "top left" }}
          >
            {/* 라운드 이름 */}
            {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => (
              <div
                key={round}
                className="absolute font-display text-base text-center"
                style={{ left: colX(round), top: 6, width: CARD_W, color: "var(--ball)" }}
              >
                {roundName(round, totalRounds)}
              </div>
            ))}
            <div
              className="absolute font-display text-base text-center"
              style={{ left: champX, top: 6, width: CHAMP_W, color: "var(--ball)" }}
            >
              우승
            </div>

            {/* 연결선 */}
            <svg className="absolute inset-0 pointer-events-none" width={width} height={height} aria-hidden="true">
              {connectors.map((c) => (
                <path
                  key={c.key}
                  d={c.d}
                  fill="none"
                  stroke={c.isHoverPath ? "var(--clay)" : c.advanced ? "var(--ball)" : "rgba(251,248,241,0.28)"}
                  strokeWidth={c.isHoverPath ? 3.5 : c.advanced ? 2.5 : 1.5}
                  strokeDasharray={c.isBye ? "4 5" : undefined}
                  strokeLinejoin="round"
                  style={{ transition: "stroke 250ms, stroke-width 250ms" }}
                />
              ))}
              {finalMatch && (
                <path
                  d={`M${colX(totalRounds) + CARD_W} ${finalCenter} H${champX}`}
                  fill="none"
                  stroke={finalMatch.winnerId ? "var(--ball)" : "rgba(251,248,241,0.28)"}
                  strokeWidth={finalMatch.winnerId ? 3 : 1.5}
                />
              )}
            </svg>

            {/* 경기 카드 */}
            {main.map((m) =>
              renderCard(m, { position: "absolute", left: colX(m.round), top: topOf(m.round, m.position) })
            )}

            {/* 트로피 카드 */}
            <div
              className="absolute rounded-2xl flex flex-col items-center justify-center text-center px-4"
              style={{
                left: champX,
                top: champTop,
                width: CHAMP_W,
                height: CHAMP_H,
                background: isCompleted && championId ? "var(--ball)" : "transparent",
                border: isCompleted && championId ? "none" : "2px dashed rgba(251,248,241,0.35)",
                boxShadow: isCompleted && championId ? "0 10px 30px rgba(215,222,35,0.35)" : "none",
              }}
            >
              {isCompleted && championId ? (
                <>
                  <div className="text-4xl mb-1" aria-hidden="true">🏆</div>
                  <div className="font-display text-xl truncate max-w-full" style={{ color: "var(--court)" }}>
                    {nameMap[championId] ?? "알 수 없음"}
                  </div>
                  <div className="text-[11px] mt-2 space-y-0.5" style={{ color: "var(--court)" }}>
                    {runnerUpId && <div>🥈 {nameMap[runnerUpId] ?? "알 수 없음"}</div>}
                    {thirdPlaceId && <div>🥉 {nameMap[thirdPlaceId] ?? "알 수 없음"}</div>}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-3xl mb-1 opacity-60" aria-hidden="true">🏆</div>
                  <div className="font-display text-lg" style={{ color: "var(--chalk)" }}>
                    우승자는 누구?
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3·4위전 */}
      {thirdPlaceMatch && (
        <div className="mt-6">
          <div className="font-display text-base mb-3" style={{ color: "var(--ball)" }}>
            🥉 3·4위전
          </div>
          {renderCard(thirdPlaceMatch, { position: "relative" }, true)}
        </div>
      )}

      {/* 관리자 결과 입력 모달 */}
      {editing && editing.player1Id && editing.player2Id && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(20,30,20,0.6)" }}
          onClick={() => !isSaving && setEditing(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: "var(--chalk)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-display text-lg mb-1" style={{ color: "var(--court)" }}>
              {editing.isThirdPlace ? "3·4위전" : roundName(editing.round, totalRounds)} 결과 입력
            </div>
            <p className="text-xs text-slate-500 mb-4">승자를 누르면 다음 라운드로 자동 진출합니다.</p>

            <input
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="스코어 (예: 6-4 3-6 7-5)"
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm mb-3 bg-white"
            />

            <div className="space-y-2">
              {[editing.player1Id, editing.player2Id].map((pid) => (
                <button
                  key={pid}
                  type="button"
                  disabled={isSaving}
                  onClick={() => save(pid)}
                  className="w-full h-11 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2"
                  style={{ background: "var(--clay)", opacity: isSaving ? 0.6 : 1 }}
                >
                  🎾 {nameMap[pid] ?? "알 수 없음"} 승리
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setEditing(null)}
              disabled={isSaving}
              className="w-full text-sm text-slate-500 mt-3 py-2"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
