"use client";

// components/CourtLinks.tsx
// 부천 테니스장 예약 바로가기. 평소엔 접혀 있다가, 펼치면 코트 그림이 깔린 정사각형 타일로 나옵니다.

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { BUCHEON_COURTS } from "@/lib/bucheonCourts";

const LIST_URL = "https://reserv.bucheon.go.kr/site/main/lending/lendingList?lending_inst_nm=tennis&inst_cate=01";
const detailUrl = (seq: string) =>
  `https://reserv.bucheon.go.kr/site/main/lending/lendingDetail?lending_info_seq=${seq}&cp=1&pageSize=16&listType=list&inst_cate=01&lending_inst_nm=tennis`;

// 코트 표면 색 (하드 → 잔디 → 클레이 순서로 돌려 씀)
const SURFACES = [
  { bg: "#6b96c6", deep: "#3e6592" },
  { bg: "#6fb27d", deep: "#3e8755" },
  { bg: "#de8561", deep: "#b2573a" },
];

function CourtArt({ i }: { i: number }) {
  const c = SURFACES[i % SURFACES.length];
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" aria-hidden>
      <rect width="100" height="100" fill={c.deep} />
      <rect x="9" y="7" width="82" height="86" fill={c.bg} />
      <g stroke="#fff" strokeWidth="1.3" fill="none" strokeOpacity="0.9">
        <path d="M 9 7 H 91 V 93 H 9 Z" />
        <path d="M 20 7 V 93 M 80 7 V 93" />
        <path d="M 20 30 H 80 M 20 70 H 80 M 50 30 V 70" />
      </g>
      <rect x="6" y="48" width="88" height="3.2" fill="#fff" opacity="0.9" />
      <circle cx={i % 2 ? 68 : 32} cy={i % 3 === 0 ? 24 : 78} r="3.4" fill="#dde43a" />
    </svg>
  );
}

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
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {BUCHEON_COURTS.map((c, i) => (
              <li key={c.facilityId}>
                <a
                  href={detailUrl(c.facilityId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-link relative block aspect-square rounded-2xl overflow-hidden text-white"
                >
                  <CourtArt i={i} />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" aria-hidden />
                  {c.indoor && (
                    <span className="absolute left-2 top-2 chip-on text-[10px] font-bold px-2 py-0.5 rounded-full">실내</span>
                  )}
                  <span className="absolute right-2 top-2 text-xs font-bold bg-white/90 text-court rounded-full w-6 h-6 flex items-center justify-center" aria-hidden>↗</span>
                  <span className="absolute left-3 right-3 bottom-2.5 text-sm font-extrabold leading-tight line-clamp-2">{c.name}</span>
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
