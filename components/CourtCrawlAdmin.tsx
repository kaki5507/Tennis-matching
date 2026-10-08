"use client";

// components/CourtCrawlAdmin.tsx
// 관리자에게만 보이는 빈 코트 수집 제어 패널: 정기 크롤링 ON/OFF 스위치 + "지금 갱신" 버튼.

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getCrawlAdmin, runCrawlNow, setCrawlEnabled, type CrawlAdminView } from "@/app/actions/adminCourtCrawl";
import { getAccessToken } from "@/lib/authToken";
import { useAuthUser } from "@/lib/useAuthUser";
import { useIsAdmin } from "@/lib/useIsAdmin";

export default function CourtCrawlAdmin({ onRefreshed }: { onRefreshed: () => void }) {
  const { userId } = useAuthUser();
  const isAdmin = useIsAdmin(userId);
  const [view, setView] = useState<CrawlAdminView | null>(null);
  const [busy, setBusy] = useState<"toggle" | "run" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await getCrawlAdmin(await getAccessToken());
    if (r.success) setView(r.data);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [isAdmin, load]);

  if (!isAdmin || !view) return null;

  const toggle = async () => {
    setBusy("toggle");
    setMsg(null);
    const next = !view.enabled;
    const r = await setCrawlEnabled(await getAccessToken(), next);
    if (r.success) setView({ ...view, enabled: next });
    else setMsg(r.error);
    setBusy(null);
  };

  const runNow = async () => {
    setBusy("run");
    setMsg(null);
    const r = await runCrawlNow(await getAccessToken());
    if (r.success) {
      setMsg(`갱신 완료 · 성공 ${r.ok}곳 / 실패 ${r.failed}곳 / 새로 생긴 슬롯 ${r.newSlots}개`);
      await load();
      onRefreshed();
    } else setMsg(r.error);
    setBusy(null);
  };

  return (
    <section className="admin-panel rounded-2xl p-4 mb-4" aria-label="관리자: 빈 코트 수집 제어">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-extrabold">🛠 관리자 · 빈 코트 수집</p>
          <p className="text-xs text-ink-muted mt-0.5">
            정기 수집(매시 정각, 오전 9시~밤 11시) {view.enabled ? "켜짐" : "꺼짐"}
          </p>
        </div>
        {/* 좌우로 밀어서 켜고 끄는 스위치 */}
        <button
          type="button"
          role="switch"
          aria-checked={view.enabled}
          aria-label="정기 크롤링 켜기/끄기"
          onClick={toggle}
          disabled={busy !== null}
          className={`relative w-14 h-8 rounded-full shrink-0 transition-colors disabled:opacity-60 ${view.enabled ? "bg-ok" : "bg-line"}`}
        >
          <span className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-chalk shadow transition-transform ${view.enabled ? "translate-x-6" : ""}`} />
        </button>
      </div>

      <button
        type="button"
        onClick={runNow}
        disabled={busy !== null}
        className="btn-outline-court border-2 mt-3 w-full h-10 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
      >
        <RefreshCw className={`w-4 h-4 ${busy === "run" ? "animate-spin" : ""}`} />
        {busy === "run" ? "지금 갱신하는 중... (최대 1분)" : "지금 갱신 (1번 강제 수집)"}
      </button>

      {msg && <p className="text-xs mt-2 font-bold text-court">{msg}</p>}
      {view.lastRunAt && (
        <p className="text-xs text-ink-muted mt-2">
          마지막 실행: {new Date(view.lastRunAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
          {view.lastRunSummary ? ` · ${view.lastRunSummary}` : ""}
        </p>
      )}
    </section>
  );
}
