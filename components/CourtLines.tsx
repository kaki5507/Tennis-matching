// components/CourtLines.tsx
// 테니스 코트의 베이스라인/서비스라인/센터라인을 본뜬 장식용 배경 그래픽.
// 카드나 그림자 대신, 이 라인 자체가 섹션을 구획하는 구조적 장치로 쓰입니다.

import type { CSSProperties } from "react";

export default function CourtLines({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 800 500"
      className={className}
      style={style}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect x="40" y="40" width="720" height="420" fill="none" stroke="currentColor" strokeWidth="3" />
      <rect x="100" y="40" width="600" height="420" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="100" y1="145" x2="700" y2="145" stroke="currentColor" strokeWidth="2" />
      <line x1="100" y1="355" x2="700" y2="355" stroke="currentColor" strokeWidth="2" />
      <line x1="400" y1="145" x2="400" y2="355" stroke="currentColor" strokeWidth="2" />
      <line x1="40" y1="250" x2="760" y2="250" stroke="currentColor" strokeWidth="4" strokeDasharray="2 6" />
      <line x1="400" y1="40" x2="400" y2="52" stroke="currentColor" strokeWidth="3" />
      <line x1="400" y1="448" x2="400" y2="460" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
