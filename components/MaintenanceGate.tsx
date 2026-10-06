"use client";

// components/MaintenanceGate.tsx
// 점검 모드가 켜져 있으면 일반 사용자에게는 점검 안내 화면만 보여주고, 관리자는 그대로 통과시킵니다.
// /admin, /login, 약관 페이지는 점검 중에도 열려 있어야 관리자가 로그인해서 해제할 수 있습니다.
// (화면 차단용입니다. 데이터 보호는 각 서버 액션의 토큰 검증이 담당)

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { checkAdminAccess } from "@/app/actions/admin";
import { getAccessToken } from "@/lib/authToken";
import TennisMascot from "@/components/TennisMascot";

export interface MaintenanceInfo {
  enabled: boolean;
  message: string | null;
  endsAt: string | null;
}

const OPEN_PREFIXES = ["/admin", "/login", "/terms", "/privacy"];
const POLL_MS = 60_000;

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function MaintenanceGate({
  initial,
  header,
  children,
}: {
  initial: MaintenanceInfo;
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [info, setInfo] = useState<MaintenanceInfo>(initial);
  const [isAdmin, setIsAdmin] = useState(false);

  // 열려 있는 탭도 점검 시작/종료를 따라가도록 주기적으로 확인
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const r = await fetch("/api/maintenance", { cache: "no-store" });
        if (r.ok) setInfo(await r.json());
      } catch {
        /* 네트워크 오류는 무시 (직전 상태 유지) */
      }
    }, POLL_MS);
    return () => clearInterval(t);
  }, []);

  // 점검 중일 때만 관리자 여부 확인 (서버가 토큰을 직접 검증)
  useEffect(() => {
    if (!info.enabled) return;
    let alive = true;
    (async () => {
      const token = await getAccessToken();
      const ok = token ? await checkAdminAccess(token) : false;
      if (alive) setIsAdmin(ok);
    })();
    return () => {
      alive = false;
    };
  }, [info.enabled, pathname]);

  const open = OPEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (info.enabled && !open && !isAdmin) {
    return (
      <main className="min-h-screen page-bg flex items-center justify-center px-4">
        <div className="surface rounded-3xl max-w-md w-full p-8 text-center space-y-4">
          <div className="flex justify-center">
            <TennisMascot className="w-28 h-28" />
          </div>
          <h1 className="text-2xl heading">서비스 점검 중이에요</h1>
          <p className="text-sm text-ink-muted whitespace-pre-line">
            {info.message || "더 나은 서비스를 위해 잠시 점검하고 있어요. 곧 다시 만나요!"}
          </p>
          {info.endsAt && <p className="text-sm font-bold">종료 예정: {fmt(info.endsAt)}</p>}
          <a href="/login" className="inline-block text-xs text-ink-muted underline">
            관리자 로그인
          </a>
        </div>
      </main>
    );
  }

  return (
    <>
      {info.enabled && isAdmin && !pathname.startsWith("/admin") && (
        <div className="badge-live text-center text-xs font-bold py-1.5">
          🛠 점검 모드 ON — 일반 사용자에게는 점검 화면이 보이고, 관리자만 이 화면을 볼 수 있어요
        </div>
      )}
      {header}
      {children}
    </>
  );
}
