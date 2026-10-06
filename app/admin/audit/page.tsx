"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getAuditLogs, type AuditRow } from "@/app/actions/adminAudit";
import { AUDIT_ACTIONS, AUDIT_GROUPS, actionLabel } from "@/lib/auditActions";
import TennisLoader from "@/components/TennisLoader";

const TONE_CLASS: Record<string, string> = {
  danger: "badge-live",
  ok: "badge-win",
  info: "badge-idle",
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

function targetHref(r: AuditRow): string | null {
  if (!r.targetId) return null;
  if (r.targetType === "user") return `/admin/users?q=${r.targetId}`;
  if (r.targetType === "tournament") return `/tournaments/${r.targetId}`;
  return null;
}

export default function AdminAuditPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"checking" | "denied" | "ok">("checking");
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (tk: string, a: string, query: string, p: number) => {
    setLoading(true);
    const res = await getAuditLogs(tk, { action: a, q: query, page: p });
    setLoading(false);
    if (!res.success) {
      setStatus("denied");
      return;
    }
    setRows(res.logs);
    setTotal(res.total);
    setTotalPages(res.totalPages);
    setPage(res.page);
    setStatus("ok");
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const tk = data.session?.access_token ?? null;
      if (!tk) {
        router.push("/login");
        return;
      }
      setToken(tk);
      await load(tk, "", "", 1);
    })();
  }, [router, load]);

  if (status === "checking") {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <TennisLoader label="권한 확인 중..." />
      </div>
    );
  }
  if (status === "denied") {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <p className="text-ink-muted">관리자만 접근할 수 있는 페이지입니다.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen page-bg py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl heading">🧾 관리자 작업 기록</h1>
          <p className="text-sm text-ink-muted mt-1">
            누가, 언제, 누구에게 어떤 작업을 했는지 자동으로 남습니다. 기록은 수정하거나 삭제할 수 없어요.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (token) load(token, action, q, 1);
          }}
          className="flex gap-2 flex-wrap"
        >
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              if (token) load(token, e.target.value, q, 1);
            }}
            className="h-11 rounded-xl border border-line px-3 text-sm bg-chalk"
          >
            <option value="">전체 작업</option>
            {AUDIT_GROUPS.map((g) => (
              <optgroup key={g} label={g}>
                {Object.entries(AUDIT_ACTIONS)
                  .filter(([, v]) => v.group === g)
                  .map(([code, v]) => (
                    <option key={code} value={code}>
                      {v.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="관리자 · 대상 이름 · 사유 · ID로 검색"
            className="h-11 flex-1 min-w-[200px] rounded-xl border border-line px-4 text-sm bg-chalk"
          />
          <button type="submit" className="btn-clay px-6 rounded-xl text-sm font-bold">
            검색
          </button>
        </form>

        <div className="surface rounded-2xl overflow-hidden">
          <div className="px-4 py-3 text-sm text-ink-muted border-b border-line">
            {loading ? "불러오는 중..." : `총 ${total.toLocaleString()}건`}
          </div>
          {rows.length === 0 && !loading ? (
            <p className="py-12 text-center text-sm text-ink-muted">기록이 없어요.</p>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((r) => {
                const href = targetHref(r);
                const tone = (AUDIT_ACTIONS as Record<string, { tone: string }>)[r.action]?.tone ?? "info";
                return (
                  <li key={r.id} className="px-4 py-3 space-y-1">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className={`${TONE_CLASS[tone]} text-[11px] font-bold px-2.5 py-0.5 rounded-full`}>
                          {actionLabel(r.action)}
                        </span>
                        <span className="text-sm text-ink">
                          <span className="font-medium">{r.adminNickname}</span>
                          <span className="text-ink-muted"> 님이</span>
                        </span>
                        {r.targetLabel &&
                          (href ? (
                            <Link href={href} className="text-sm font-medium underline text-court">
                              {r.targetLabel}
                            </Link>
                          ) : (
                            <span className="text-sm font-medium text-ink">{r.targetLabel}</span>
                          ))}
                      </span>
                      <span className="text-xs text-ink-muted">{fmt(r.createdAt)}</span>
                    </div>
                    {r.detail && <p className="text-xs text-ink-muted">└ {r.detail}</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => token && load(token, action, q, page - 1)}
              className="px-4 py-2 rounded-lg text-sm border border-line surface disabled:opacity-40"
            >
              이전
            </button>
            <span className="text-sm text-ink-muted">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => token && load(token, action, q, page + 1)}
              className="px-4 py-2 rounded-lg text-sm border border-line surface disabled:opacity-40"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
