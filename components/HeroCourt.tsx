// components/HeroCourt.tsx
// 랜딩 히어로 오른쪽: 위에서 내려다본 하늘빛 하드코트 + 랠리 중인 공 + 마스코트 + 둥둥 떠 있는 정보 칩.
import TennisMascot from "@/components/TennisMascot";

export default function HeroCourt() {
  return (
    <div className="relative mx-auto w-full max-w-[400px] aspect-[400/440]">
      <svg viewBox="0 0 400 440" className="absolute inset-0 w-full h-full" aria-hidden>
        <defs>
          <linearGradient id="hc-sheen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
            <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <pattern id="hc-mesh" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M 0 0 L 8 8 M 8 0 L 0 8" stroke="#fff" strokeWidth="0.8" opacity="0.5" />
          </pattern>
        </defs>

        {/* 코트 바깥 + 코트 면 */}
        <rect x="0" y="0" width="400" height="440" rx="22" fill="#34577f" />
        <rect x="36" y="36" width="328" height="368" fill="#6f98c4" />
        <rect x="36" y="36" width="328" height="368" fill="url(#hc-sheen)" />

        {/* 라인: 끊김 없이 하나의 패스로 그림 (모서리는 miter 로 딱 맞게) */}
        <g stroke="#fff" strokeWidth="3.5" fill="none" strokeLinejoin="miter" strokeLinecap="butt">
          <path d="M 36 36 H 364 V 404 H 36 Z" />
          <path d="M 70 36 V 404 M 330 36 V 404" />
          <path d="M 70 124 H 330 M 70 316 H 330" />
          <path d="M 200 124 V 316" />
        </g>

        {/* 네트: 메쉬 + 윗선 + 양쪽 기둥 */}
        <g>
          <rect x="30" y="212" width="340" height="16" fill="#34577f" opacity="0.35" />
          <rect x="30" y="212" width="340" height="16" fill="url(#hc-mesh)" />
          <rect x="30" y="210" width="340" height="4" fill="#fff" />
          <rect x="30" y="226" width="340" height="2" fill="#fff" opacity="0.7" />
          <circle cx="26" cy="220" r="6" fill="#fff" />
          <circle cx="374" cy="220" r="6" fill="#fff" />
        </g>

        {/* 랠리 중인 공 (코트 위를 오가며 넘어감) */}
        <g className="hero-ball">
          <ellipse cx="0" cy="14" rx="8" ry="3" fill="#1c2a40" opacity="0.2" />
          <circle r="9" fill="#dde43a" />
          <path d="M -8 -3 Q 0 3 8 -3" stroke="#fff" strokeWidth="1.8" fill="none" />
          <animateMotion dur="3.6s" repeatCount="indefinite" path="M 104 372 Q 200 20 300 96 Q 214 250 104 372" />
        </g>
      </svg>

      {/* 마스코트 */}
      <div className="absolute left-1/2 top-[40%] -translate-x-1/2 w-[56%]">
        <TennisMascot pose="serve" className="w-full h-auto mascot-float" />
      </div>

      {/* 떠 있는 칩들: 화면 밖으로 나가지 않도록 안쪽에 배치 */}
      <div className="ticket-chip hero-chip absolute left-[2%] top-[7%] rounded-xl px-3 py-1.5 text-[13px] sm:text-sm font-extrabold">
        오늘 19:30 · 복식
      </div>
      <div className="ticket-chip hero-chip absolute right-[2%] top-[24%] rounded-xl px-3 py-1.5 text-[13px] sm:text-sm font-extrabold" style={{ animationDelay: "0.6s" }}>
        🌡️ 매너 36.5°
      </div>
      <div className="ticket-chip hero-chip absolute left-[3%] bottom-[9%] rounded-xl px-3 py-1.5 text-[13px] sm:text-sm font-extrabold" style={{ animationDelay: "1.2s" }}>
        NTRP 1.5~2.5
      </div>
      <div className="hero-chip absolute right-[3%] bottom-[13%] rounded-xl px-3 py-1.5 text-[13px] sm:text-sm font-extrabold bg-clay text-white shadow-[0_4px_0_rgba(0,0,0,0.2)]" style={{ animationDelay: "1.8s" }}>
        2/4 모집중
      </div>
    </div>
  );
}
