"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * 페이지 이동이 일어날 때마다, 그 경로와 기기 종류(모바일/PC)를
 * 조용히 서버로 보고합니다. 화면엔 아무것도 렌더링하지 않습니다.
 */
export default function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const device = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "mobile" : "desktop";

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, device }),
      keepalive: true, // 페이지 전환 중에도 요청이 끊기지 않도록
    }).catch(() => {
      // 통계 기록 실패는 무시 (사용자 경험에 영향 없어야 함)
    });
  }, [pathname]);

  return null;
}
