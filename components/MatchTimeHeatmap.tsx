"use client";

// 요일 × 시간대 히트맵: 어느 요일, 몇 시에 경기가 가장 많이 열리고 사람이 모이는지 한눈에 보여줍니다.

import { useMemo, useState } from "react";

export interface TimeCell {
  dow: number; // 0=일 ... 6=토
  hour: number;
  rooms: number;
  players: number;
  filled: number;
}

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0]; // 월요일부터 표시
const MODES = {
  rooms: { label: "개설된 방", unit: "개" },
  players: { label: "참가 인원", unit: "명" },
  filled: { label: "마감된 방", unit: "개" },
} as const;
type Mode = keyof typeof MODES;

export default function MatchTimeHeatmap({ cells }: { cells: TimeCell[] }) {
  const [mode, setMode] = useState<Mode>("rooms");

  const { grid, max, hours, top } = useMemo(() => {
    const map = new Map<string, TimeCell>();
    cells.forEach((c) => map.set(`${c.dow}-${c.hour}`, c));
    const active = cells.filter((c) => c[mode] > 0).map((c) => c.hour);
    // 데이터가 있는 시간 범위만 보여주되 최소 6~23시는 확보
    const minH = Math.min(6, ...(active.length ? active : [6]));
    const maxH = Math.max(23, ...(active.length ? active : [23]));
    const hs = Array.from({ length: maxH - minH + 1 }, (_, i) => minH + i);
    const mx = Math.max(1, ...cells.map((c) => c[mode]));
    const ranked = [...cells].filter((c) => c[mode] > 0).sort((a, b) => b[mode] - a[mode] || b.players - a.players).slice(0, 5);
    return { grid: map, max: mx, hours: hs, top: ranked };
  }, [cells, mode]);

  const { unit } = MODES[mode];

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 flex-wrap">
        {(Object.keys(MODES) as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-3 py-1 rounded-full text-xs font-medium ${mode === m ? "chip-on" : "chip-off-court"}`}
          >
            {MODES[m].label}
          </button>
        ))}
      </div>

      {top.length === 0 ? (
        <p className="text-sm text-ink-muted py-6 text-center">집계할 경기가 아직 없어요.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
              <div className="flex gap-[3px] pl-7 mb-1">
                {hours.map((h) => (
                  <div key={h} className="flex-1 text-[10px] text-ink-muted text-center">
                    {h % 2 === 0 ? h : ""}
                  </div>
                ))}
              </div>
              {DOW_ORDER.map((d) => (
                <div key={d} className="flex gap-[3px] items-center mb-[3px]">
                  <div className={`w-6 text-xs font-bold ${d === 0 ? "text-clay" : d === 6 ? "text-court" : "text-ink-muted"}`}>{DOW[d]}</div>
                  {hours.map((h) => {
                    const v = grid.get(`${d}-${h}`)?.[mode] ?? 0;
                    return (
                      <div
                        key={h}
                        title={`${DOW[d]}요일 ${h}시: ${v}${unit}`}
                        className="flex-1 h-7 rounded-[4px] bg-court hover:ring-2 hover:ring-ink-muted"
                        style={{ opacity: v === 0 ? 0.07 : 0.2 + (v / max) * 0.8 }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold mb-2">🔥 가장 인기 있는 시간 TOP 5 ({MODES[mode].label} 기준)</p>
            <ol className="space-y-1.5">
              {top.map((c, i) => (
                <li key={`${c.dow}-${c.hour}`} className="flex items-center justify-between text-sm">
                  <span>
                    <span className="inline-block w-5 text-ink-muted">{i + 1}</span>
                    {DOW[c.dow]}요일 {String(c.hour).padStart(2, "0")}시
                  </span>
                  <span className="text-ink-muted text-xs">
                    방 {c.rooms}개 · 참가 {c.players}명 · 마감 {c.filled}개
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}
    </div>
  );
}
