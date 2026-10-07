"use client";

// 지역·코트별 주간 매칭 수 추이: 행마다 최근 N주 미니 막대 + 최근 4주 vs 직전 4주 증감.

import { useState } from "react";

export interface TrendRow {
  name: string;
  sub?: string;
  total: number;
  series: number[];
}

function delta(series: number[]) {
  const n = series.length;
  const recent = series.slice(n - 4).reduce((a, b) => a + b, 0);
  const prev = series.slice(Math.max(0, n - 8), n - 4).reduce((a, b) => a + b, 0);
  return { recent, prev, diff: recent - prev };
}

export default function MatchTrend({
  weeks,
  weekTotals,
  regions,
  courts,
}: {
  weeks: string[];
  weekTotals: number[];
  regions: TrendRow[];
  courts: TrendRow[];
}) {
  const [tab, setTab] = useState<"region" | "court">("region");
  const rows = tab === "region" ? regions : courts;
  const max = Math.max(1, ...rows.flatMap((r) => r.series));
  const label = (w: string) => `${Number(w.slice(5, 7))}/${Number(w.slice(8, 10))}주`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5">
          {(["region", "court"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium ${tab === t ? "chip-on" : "chip-off-court"}`}
            >
              {t === "region" ? "지역별" : "코트별"}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-ink-muted">
          전체 주간 합계: {weekTotals.slice(-4).join(" → ")} (최근 4주)
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-ink-muted py-6 text-center">집계할 경기가 아직 없어요.</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r) => {
            const d = delta(r.series);
            return (
              <div key={`${r.name}-${r.sub ?? ""}`} className="flex items-center gap-3">
                <div className="w-32 sm:w-44 min-w-0">
                  <p className="text-sm font-medium truncate">{r.name}</p>
                  <p className="text-[11px] text-ink-muted truncate">
                    {r.sub ? `${r.sub} · ` : ""}12주 {r.total}개
                  </p>
                </div>
                <div className="flex-1 flex items-end gap-[3px] h-9">
                  {r.series.map((v, i) => (
                    <div
                      key={i}
                      title={`${label(weeks[i])}: ${v}개`}
                      className="flex-1 rounded-sm bg-court hover:opacity-70"
                      style={{ height: `${v === 0 ? 4 : Math.max(12, Math.round((v / max) * 100))}%`, opacity: v === 0 ? 0.15 : 1 }}
                    />
                  ))}
                </div>
                <div className={`w-16 text-right text-xs font-bold ${d.diff > 0 ? "text-court" : d.diff < 0 ? "text-clay" : "text-ink-muted"}`}>
                  {d.diff > 0 ? "▲" : d.diff < 0 ? "▼" : "–"} {Math.abs(d.diff)}
                </div>
              </div>
            );
          })}
          <p className="text-[11px] text-ink-muted">
            막대는 주별 경기 수(왼쪽이 과거), 오른쪽 수치는 최근 4주 대비 직전 4주 증감입니다. 지역은 코트 주소 앞부분(시/구)으로 나눕니다.
          </p>
        </div>
      )}
    </div>
  );
}
