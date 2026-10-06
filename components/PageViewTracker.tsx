"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

// 브라우저마다 한 번 만들어 두는 익명 방문자 ID (개인정보 없음, 무작위 값)
function getVisitorId(): string | null {
  try {
    let id = localStorage.getItem("visitor_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("visitor_id", id);
    }
    return id;
  } catch {
    return null; // 저장소 차단 환경이면 익명 ID 없이 기록
  }
}

/**
 * 페이지 이동이 일어날 때마다, 경로 / 기기 종류 / 익명 방문자 ID를
 * 조용히 서버로 보고합니다. 화면엔 아무것도 렌더링하지 않습니다.
 */
export default function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // 관리자 화면 조회는 통계에서 제외
    if (pathname.startsWith("/admin")) return;

    const device = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "mobile" : "desktop";
    const visitorId = getVisitorId();

    (async () => {
      // 로그인 중이면 토큰을 같이 보내 서버가 "누구인지" 검증할 수 있게 함
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      fetch("/api/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ path: pathname, device, visitorId }),
        keepalive: true, // 페이지 전환 중에도 요청이 끊기지 않도록
      }).catch(() => {
        // 통계 기록 실패는 무시 (사용자 경험에 영향 없어야 함)
      });
    })();
  }, [pathname]);

  return null;
}
