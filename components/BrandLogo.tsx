"use client";

// components/BrandLogo.tsx
// 헤더 왼쪽 위 로고. 공(얼굴) + 워드마크 + 한 줄 설명.
// 보고 있는 메뉴에 따라 공의 표정이 바뀌고, 마우스를 올리면 통통 튑니다.

import Link from "next/link";
import { usePathname } from "next/navigation";

type Mood = "happy" | "wink" | "cheer" | "look";

const INK = "#16284f";

export function moodFor(pathname: string): Mood {
  if (pathname.startsWith("/matches")) return "wink";
  if (pathname.startsWith("/tournaments")) return "cheer";
  if (pathname.startsWith("/history")) return "look";
  return "happy";
}

/** 크고 반짝이는 눈 (left: 왼쪽 눈만) */
function Eyes({ dx = 0, left = false }: { dx?: number; left?: boolean }) {
  const one = (cx: number) => (
    <g key={cx}>
      <ellipse cx={cx + dx} cy="39" rx="4.6" ry="5.4" fill={INK} />
      <circle cx={cx + dx + 1.6} cy="36.6" r="2" fill="#fff" />
      <circle cx={cx + dx - 1.6} cy="41.4" r="1" fill="#fff" opacity="0.9" />
    </g>
  );
  return <>{left ? one(23) : [one(23), one(41)]}</>;
}

export function LogoBall({ mood, className }: { mood: Mood; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <clipPath id="brand-ball-clip">
          <circle cx="32" cy="32" r="27" />
        </clipPath>
      </defs>
      <ellipse cx="32" cy="60" rx="16" ry="3" fill={INK} opacity="0.12" />
      <circle cx="32" cy="32" r="28" fill="#D7DE23" />
      <g clipPath="url(#brand-ball-clip)">
        <path d="M 7 16 Q 30 32 7 52" stroke="#F7F9E4" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M 57 16 Q 34 32 57 52" stroke="#F7F9E4" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M 2 25 Q 32 12 62 25 L 62 31 Q 32 18 2 31 Z" fill="#C1512F" />
        <path d="M 2 29.5 Q 32 16.5 62 29.5 L 62 31 Q 32 18 2 31 Z" fill="#9E3F22" opacity="0.55" />
        <ellipse cx="21" cy="14" rx="7" ry="3.2" fill="#fff" opacity="0.3" transform="rotate(-28 21 14)" />
      </g>
      <circle cx="32" cy="32" r="28" fill="none" stroke="#B7C21E" strokeWidth="1.8" />

      {mood === "happy" && (
        <>
          <Eyes />
          <path d="M 27 47 Q 32 52 37 47" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </>
      )}
      {mood === "wink" && (
        <>
          <Eyes left />
          <path d="M 35 39 Q 40 34 45 39" stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <path d="M 27 47 Q 32 52 37 47" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </>
      )}
      {mood === "cheer" && (
        <>
          <path d="M 20.5 39.5 Q 24 34 27.5 39.5" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M 36.5 39.5 Q 40 34 43.5 39.5" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M 25 44 Q 32 55 39 44 Z" fill={INK} />
        </>
      )}
      {mood === "look" && (
        <>
          <Eyes dx={2} />
          <path d="M 30 48 Q 34 50.5 38 48" stroke={INK} strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </>
      )}
      <ellipse cx="14.5" cy="46" rx="4" ry="2.4" fill="#ff7a6b" opacity="0.45" />
      <ellipse cx="49.5" cy="46" rx="4" ry="2.4" fill="#ff7a6b" opacity="0.45" />
    </svg>
  );
}

export default function BrandLogo({ size = "md", mood }: { size?: "md" | "lg"; mood?: Mood }) {
  const pathname = usePathname() ?? "/";
  const m = mood ?? moodFor(pathname);
  const big = size === "lg";

  return (
    <Link href="/" className="brand-link flex items-center gap-2 shrink-0" aria-label="테니스매칭 홈">
      <LogoBall mood={m} className={`brand-ball ${big ? "w-10 h-10" : "w-8 h-8"}`} />
      <span className="flex flex-col leading-none">
        <span className={`font-display text-court ${big ? "text-xl" : "text-lg"}`}>테니스매칭</span>
        <span className="hidden sm:block mt-1 text-[11px] font-medium tracking-tight text-ink-muted">우리 동네 테니스 파트너</span>
      </span>
    </Link>
  );
}
