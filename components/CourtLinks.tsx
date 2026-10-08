"use client";

// components/CourtLinks.tsx
// 부천 테니스장 예약 바로가기. 평소엔 접혀 있다가, 펼치면 코트 그림이 깔린 정사각형 타일로 나옵니다.

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { BUCHEON_COURTS } from "@/lib/bucheonCourts";

const LIST_URL = "https://reserv.bucheon.go.kr/site/main/lending/lendingList?lending_inst_nm=tennis&inst_cate=01";
const detailUrl = (seq: string) =>
  `https://reserv.bucheon.go.kr/site/main/lending/lendingDetail?lending_info_seq=${seq}&cp=1&pageSize=16&listType=list&inst_cate=01&lending_inst_nm=tennis`;

// 타일 배경색 (하드 → 잔디 → 클레이 순서로 돌려 씀)
const COLORS = ["var(--court-soft)", "var(--grass)", "var(--clay)"];

export default function CourtLinks() {
  const [open, setOpen] = useState(false);

  return (
    <section className="max-w-6xl mx-auto px-4 pb-6" aria-label="부천 테니스장 예약 바로가기">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="surface rounded-2xl w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="block font-display text-base text-court">🏟️ 부천 테니스장 예약 바로가기</span>
          <span className="block text-xs text-ink-muted mt-0.5">{open ? "누르면 접혀요" : `${BUCHEON_COURTS.length}곳 · 눌러서 펼치기`}</span>
        </span>
        <ChevronDown className={`w-5 h-5 text-court shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-3">
          <ul className="grid grid-cols-3 gap-2">
            {BUCHEON_COURTS.map((c, i) => (
              <li key={c.facilityId}>
                <a
                  href={detailUrl(c.facilityId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-link relative flex h-16 flex-col justify-end rounded-xl px-2 py-1.5 text-white"
                  style={{ background: COLORS[i % COLORS.length] }}
                >
                  {c.indoor && (
                    <span className="absolute left-1.5 top-1.5 bg-white/90 text-court text-[9px] font-bold px-1.5 rounded-full">실내</span>
                  )}
                  <span className="absolute right-1.5 top-1 text-[11px] font-bold opacity-90" aria-hidden>↗</span>
                  <span className="text-[11px] font-extrabold leading-tight line-clamp-2">{c.name}</span>
                </a>
              </li>
            ))}
          </ul>
          <a href={LIST_URL} target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-xs font-bold underline text-court">
            전체 목록 보기 ↗ (부천시 공공서비스예약, 새 창)
          </a>
        </div>
      )}
    </section>
  );
}
