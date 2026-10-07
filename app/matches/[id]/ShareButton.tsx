"use client";

import { useState } from "react";

/** 방 링크 복사 (모바일은 기기 공유 시트 우선). 단톡방에 방을 퍼 나르기 쉽게 하는 버튼 */
export default function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* 사용자가 공유 창을 닫은 경우 등은 무시 */
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium bg-black/10 hover:bg-black/20 transition-colors"
      aria-live="polite"
    >
      {copied ? "✓ 링크 복사됨" : "🔗 공유"}
    </button>
  );
}
