// components/Trophy.tsx
// 손으로 그린 SVG 트로피. 이미지가 아니라서 어떤 크기에서도 선명하고,
// 색은 globals.css 의 --trophy-* 토큰을 그대로 따라갑니다.

import type { TrophyTier } from "@/lib/trophies";

interface Props {
  tier: TrophyTier;
  size?: number;
  glow?: boolean;
  /** 트로피 가운데에 새길 글자 (테니스공 이모지 대신, 복식이면 "복" 등) */
  mark?: string;
  className?: string;
}

export default function Trophy({ tier, size = 56, glow = false, mark, className = "" }: Props) {
  const main = `var(--trophy-${tier})`;
  const dark = `var(--trophy-${tier}-dark)`;
  const light = `var(--trophy-${tier}-light)`;

  return (
    <svg
      viewBox="0 0 64 72"
      width={size}
      height={(size * 72) / 64}
      className={`${glow ? "trophy-glow" : ""} ${className}`}
      role="img"
      aria-label={tier === "gold" ? "우승 트로피" : tier === "silver" ? "준우승 트로피" : "3위 트로피"}
    >
      {/* 받침대 */}
      <rect x="18" y="60" width="28" height="8" rx="2" fill={dark} />
      <rect x="22" y="56" width="20" height="6" rx="1.5" fill={main} />
      {/* 기둥 */}
      <path d="M28 46 H36 L37 58 H27 Z" fill={main} />
      <path d="M28 46 H31 L31.5 58 H27 Z" fill={dark} opacity="0.35" />
      {/* 손잡이 (양쪽) */}
      <path d="M14 12 C2 12 2 30 15 32" fill="none" stroke={dark} strokeWidth="4" strokeLinecap="round" />
      <path d="M50 12 C62 12 62 30 49 32" fill="none" stroke={dark} strokeWidth="4" strokeLinecap="round" />
      {/* 컵 */}
      <path d="M12 6 H52 V22 C52 36 43 46 32 46 C21 46 12 36 12 22 Z" fill={main} />
      {/* 컵 아래쪽 그림자 */}
      <path d="M12 26 C14 38 22 46 32 46 C42 46 50 38 52 26 C46 34 38 38 32 38 C26 38 18 34 12 26 Z" fill={dark} opacity="0.28" />
      {/* 컵 테두리 */}
      <rect x="10" y="4" width="44" height="6" rx="3" fill={light} />
      {/* 빛 반사 */}
      <path d="M18 14 C17 24 20 33 26 39" fill="none" stroke={light} strokeWidth="3.5" strokeLinecap="round" opacity="0.9" />
      {/* 가운데 문양 */}
      <circle cx="32" cy="24" r={mark ? 8.5 : 6} fill={light} stroke={dark} strokeWidth="1.5" />
      {mark && (
        <text
          x="32"
          y="28.6"
          textAnchor="middle"
          fontSize="11.5"
          fontWeight="800"
          fill="var(--court)"
          fontFamily="sans-serif"
        >
          {mark}
        </text>
      )}
    </svg>
  );
}
