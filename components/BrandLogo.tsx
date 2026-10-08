"use client";

// components/BrandLogo.tsx
// 헤더 왼쪽 위 워드마크. 캐릭터 없이 "테니스매칭" 글자만 꾸민 로고이며, 누르면 메인으로 이동합니다.
// "테니스"는 코트 블루, "매칭"은 클레이색 라벨 위에 흰 글자, 아래에는 하드·잔디·클레이 3색 띠.

import Link from "next/link";

export default function BrandLogo({ size = "md" }: { size?: "md" | "lg"; mood?: unknown }) {
  const big = size === "lg";
  return (
    <Link href="/" className="brand-link inline-flex flex-col shrink-0" aria-label="테니스매칭 메인으로">
      <span className={`inline-flex items-center font-display leading-none ${big ? "text-2xl" : "text-xl"}`}>
        <span className="text-court">테니스</span>
        <span className="brand-tag ml-1 rounded-lg px-1.5 py-0.5 bg-clay text-white">매칭</span>
      </span>
      <span className="mt-1 flex h-[3px] w-full overflow-hidden rounded-full" aria-hidden>
        <span className="flex-1" style={{ background: "var(--court-soft)" }} />
        <span className="flex-1" style={{ background: "var(--grass)" }} />
        <span className="flex-1" style={{ background: "var(--clay)" }} />
      </span>
    </Link>
  );
}
