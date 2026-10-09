"use client";

// components/UserAvatar.tsx
// 프로필 사진 원. 사진이 없거나 못 불러오면 테니스공 캐릭터(기본 이미지)를 보여줍니다.

import { useState } from "react";

export function TennisBallFace({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="32" fill="#d9ec4d" />
      {/* 테니스공 솔기 */}
      <path d="M6 14c14 4 20 14 20 18s-6 14-20 18" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".9" />
      <path d="M58 14c-14 4-20 14-20 18s6 14 20 18" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".9" />
      {/* 얼굴 */}
      <circle cx="25" cy="29" r="3" fill="#1f3a2a" />
      <circle cx="39" cy="29" r="3" fill="#1f3a2a" />
      <circle cx="26" cy="28" r="1" fill="#fff" />
      <circle cx="40" cy="28" r="1" fill="#fff" />
      <path d="M26 38c2.5 3.5 9.5 3.5 12 0" fill="none" stroke="#1f3a2a" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="20" cy="36" r="2.6" fill="#f59a8b" opacity=".6" />
      <circle cx="44" cy="36" r="2.6" fill="#f59a8b" opacity=".6" />
    </svg>
  );
}

export default function UserAvatar({
  id,
  nickname,
  className = "w-9 h-9",
}: {
  id: string;
  nickname?: string | null;
  className?: string; // 크기 (예: "w-9 h-9")
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`relative inline-flex rounded-full overflow-hidden shrink-0 bg-ok-soft ${className}`} title={nickname ?? undefined}>
      <TennisBallFace className="absolute inset-0 w-full h-full" />
      {!failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/avatar/${id}`}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
    </span>
  );
}
