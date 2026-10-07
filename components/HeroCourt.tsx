// components/HeroCourt.tsx
// 랜딩 히어로 오른쪽: 위에서 내려다본 하드코트 + 마스코트 + 떠 있는 정보 칩.
import TennisMascot from "@/components/TennisMascot";

export default function HeroCourt() {
  return (
    <div className="relative mx-auto w-full max-w-[420px] aspect-[400/440]">
      <svg viewBox="0 0 400 440" className="absolute inset-0 w-full h-full" aria-hidden>
        {/* 코트 바깥(런오프)과 코트 면 */}
        <rect x="0" y="0" width="400" height="440" rx="22" fill="#0a2f73" />
        <rect x="34" y="34" width="332" height="372" rx="4" fill="#1e63e9" />
        <rect x="34" y="34" width="332" height="372" rx="4" fill="url(#hc-sheen)" />
        <defs>
          <linearGradient id="hc-sheen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.14" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* 라인 (화이트) */}
        <g stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="square">
          <rect x="34" y="34" width="332" height="372" />
          <path d="M 68 34 V 406 M 332 34 V 406" />
          <path d="M 68 120 H 332 M 68 320 H 332" />
          <path d="M 200 120 V 320" />
          <path d="M 200 34 v 10 M 200 406 v -10" />
        </g>
        {/* 네트 */}
        <g>
          <rect x="22" y="214" width="356" height="12" rx="3" fill="#fff" opacity="0.95" />
          <path d="M 22 220 H 378" stroke="#0a2f73" strokeWidth="1.5" strokeDasharray="3 4" />
          <circle cx="22" cy="220" r="5" fill="#fff" />
          <circle cx="378" cy="220" r="5" fill="#fff" />
        </g>
      </svg>

      {/* 마스코트 (코트 위에 서 있는 느낌) */}
      <div className="absolute left-1/2 top-[44%] -translate-x-1/2 w-[58%]">
        <TennisMascot pose="serve" className="w-full h-auto mascot-float drop-shadow-[0_10px_0_rgba(0,0,0,0.18)]" />
      </div>

      {/* 떠 있는 칩들 */}
      <div className="ticket-chip absolute left-[-4%] top-[10%] rounded-xl px-3.5 py-2 text-sm font-extrabold -rotate-3">
        오늘 19:30 · 복식
      </div>
      <div className="ticket-chip absolute right-[-3%] top-[26%] rounded-xl px-3.5 py-2 text-sm font-extrabold rotate-2">
        🌡️ 매너 36.5°
      </div>
      <div className="ticket-chip absolute left-[2%] bottom-[8%] rounded-xl px-3.5 py-2 text-sm font-extrabold rotate-2">
        NTRP 3.0~3.5
      </div>
      <div className="absolute right-[2%] bottom-[12%] rounded-xl px-3.5 py-2 text-sm font-extrabold -rotate-2 bg-clay text-white shadow-[0_4px_0_rgba(0,0,0,0.2)]">
        2/4 모집중
      </div>
    </div>
  );
}
