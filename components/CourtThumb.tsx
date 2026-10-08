// components/CourtThumb.tsx
// 매칭 카드 위쪽에 깔리는 코트 일러스트. 경기 종류마다 코트 표면 색이 달라 한눈에 구분됩니다.
// 단식=하드코트, 복식=잔디, 혼합복식=클레이, 랠리=하늘빛.

const SURFACE: Record<string, { bg: string; deep: string }> = {
  단식: { bg: "#6b96c6", deep: "#3e6592" },
  복식: { bg: "#6fb27d", deep: "#3e8755" },
  혼합복식: { bg: "#de8561", deep: "#b2573a" },
  "랠리(연습)": { bg: "#8fb6dc", deep: "#5b87b9" },
};

export default function CourtThumb({ gameType, className = "" }: { gameType: string; className?: string }) {
  const c = SURFACE[gameType] ?? SURFACE["단식"];
  const doubles = gameType === "복식" || gameType === "혼합복식";
  return (
    <svg viewBox="0 0 300 84" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <rect width="300" height="84" fill={c.deep} />
      <rect x="14" y="10" width="272" height="64" fill={c.bg} />
      <g stroke="#fff" strokeWidth="2.2" fill="none" strokeOpacity="0.9" strokeLinejoin="miter">
        <path d="M 14 10 H 286 V 74 H 14 Z" />
        {doubles ? null : <path d="M 14 22 H 286 M 14 62 H 286" />}
        <path d="M 78 22 V 62 M 222 22 V 62 M 78 42 H 222" />
        <path d="M 150 10 V 74" strokeOpacity="0.85" />
      </g>
      <rect x="148" y="6" width="4" height="72" fill="#fff" opacity="0.95" />
      <circle cx="226" cy="30" r="6" fill="#dde43a" />
      <path d="M 220.5 28 Q 226 32 231.5 28" stroke="#fff" strokeWidth="1.2" fill="none" />
    </svg>
  );
}
