"use client";

// components/BrandLogo.tsx
// 헤더 왼쪽 위 로고. 공(얼굴) + 워드마크 + 한 줄 설명.
// 보고 있는 메뉴에 따라 공의 표정이 바뀌고, 마우스를 올리면 통통 튑니다.

import Link from "next/link";
import { usePathname } from "next/navigation";

type Mood = "happy" | "wink" | "cheer" | "look";

const INK = "#2F4A33";

export function moodFor(pathname: string): Mood {
  if (pathname.startsWith("/matches")) return "wink";
  if (pathname.startsWith("/tournaments")) return "cheer";
  if (pathname.startsWith("/history")) return "look";
  return "happy";
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
          <circle cx="24" cy="38" r="2.6" fill={INK} />
          <circle cx="40" cy="38" r="2.6" fill={INK} />
          <path d="M 25 45 Q 32 51 39 45" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </>
      )}
      {mood === "wink" && (
        <>
          <circle cx="24" cy="38" r="2.6" fill={INK} />
          <path d="M 36.5 38.5 Q 40 35 43.5 38.5" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M 25 45 Q 32 51 39 45" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" />
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
          <circle cx="26" cy="38" r="2.6" fill={INK} />
          <circle cx="42" cy="38" r="2.6" fill={INK} />
          <path d="M 28 46 Q 33 49 38 46" stroke={INK} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </>
      )}
      <ellipse cx="17" cy="44" rx="3.4" ry="2.1" fill="#C1512F" opacity="0.28" />
      <ellipse cx="47" cy="44" rx="3.4" ry="2.1" fill="#C1512F" opacity="0.28" />
    </svg>
  );
}

export default function BrandLogo({ size = "md", mood }: { size?: "md" | "lg"; mood?: Mood }) {
  const pathname = usePathname() ?? "/";
  const m = mood ?? moodFor(pathname);
  const big = size === "lg";

  return (
    <Link href="/" className="brand-link flex items-center gap-2.5 shrink-0" aria-label="테니스매칭 홈">
      <LogoBall mood={m} className={`brand-ball ${big ? "w-12 h-12" : "w-10 h-10"}`} />
      <span className="flex flex-col leading-none">
        <span className={`font-display text-court ${big ? "text-2xl" : "text-xl"}`}>테니스매칭</span>
        <span className="hidden sm:block mt-1 text-[11px] font-medium tracking-tight text-ink-muted">우리 동네 테니스 파트너</span>
      </span>
    </Link>
  );
}
