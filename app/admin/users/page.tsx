"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { searchUsers, getUserDetail, setUserBan, exportUsersCsv, type AdminUserRow, type UserFilter } from "@/app/actions/adminUsers";
import TennisLoader from "@/components/TennisLoader";

const FILTERS: { value: UserFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "active", label: "활성" },
  { value: "banned", label: "정지" },
  { value: "deleted", label: "탈퇴" },
  { value: "admin", label: "관리자" },
  { value: "mismatch", label: "허위구력 의심" },
];

type Detail = Awaited<ReturnType<typeof getUserDetail>>;

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

function StatusBadges({ u }: { u: AdminUserRow }) {
  return (
    <span className="inline-flex gap-1 flex-wrap">
      {u.role === "ADMIN" && <span className="chip-on text-[10px] font-bold px-2 py-0.5 rounded-full">관리자</span>}
      {u.isBanned && <span className="badge-live text-[10px] font-bold px-2 py-0.5 rounded-full">정지</span>}
      {u.deletedAt && <span className="badge-lose text-[10px] font-bold px-2 py-0.5 rounded-full">탈퇴</span>}
      {u.levelMismatchCount > 0 && (
        <span className="badge-win text-[10px] font-bold px-2 py-0.5 rounded-full">구력조정 {u.levelMismatchCount}</span>
      )}
    </span>
  );
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"checking" | "denied" | "ok">("checking");

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [detail, setDetail] = useState<Detail | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState("");

  const load = useCallback(
    async (tk: string, query: string, f: UserFilter, p: number) => {
      setLoading(true);
      const res = await searchUsers(tk, { q: query, filter: f, page: p });
      setLoading(false);
      if (!res.success) {
        setStatus("denied");
        return;
      }
      setRows(res.users);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setPage(res.page);
      setStatus("ok");
    },
    []
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const tk = data.session?.access_token ?? null;
      if (!tk) {
        router.push("/login");
        return;
      }
      setToken(tk);
      // ?q= 로 들어오면 바로 검색 (대시보드의 회원 링크용)
      const initialQ = new URLSearchParams(window.location.search).get("q") ?? "";
      setQ(initialQ);
      await load(tk, initialQ, "all", 1);
    })();
  }, [router, load]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token) load(token, q, filter, 1);
  };

  const changeFilter = (f: UserFilter) => {
    setFilter(f);
    if (token) load(token, q, f, 1);
  };

  const openDetail = async (id: string) => {
    if (!token) return;
    setMessage("");
    setReason("");
    setDetail(await getUserDetail(token, id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const downloadCsv = async () => {
    if (!token || exporting) return;
    setExporting(true);
    setExportMsg("");
    const res = await exportUsersCsv(token, { q, filter });
    setExporting(false);
    if (!res.success) {
      setExportMsg(res.error);
      return;
    }
    const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    a.href = url;
    a.download = `회원목록_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setExportMsg(`${res.count.toLocaleString()}명을 내보냈어요.${res.truncated ? " (1만 명까지만 포함)" : ""}`);
  };

  const toggleBan = async (id: string, ban: boolean) => {
    if (!token) return;
    setBusy(true);
    const res = await setUserBan(token, id, ban, reason);
    setBusy(false);
    if (!res.success) {
      setMessage(res.error);
      return;
    }
    setMessage(ban ? "정지 처리했습니다." : "정지를 해제했습니다.");
    setReason("");
    setDetail(await getUserDetail(token, id));
    load(token, q, filter, page);
  };

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

  const d = detail && detail.success ? detail : null;

  return (
    <div className="min-h-screen page-bg py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-2xl heading">👥 회원 관리</h1>

        {/* 선택한 회원 상세 */}
        {detail && !detail.success && <p className="text-sm text-clay">{detail.error}</p>}
        {d && (
          <div className="surface rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display text-xl text-court">{d.user.nickname}</h2>
                  <StatusBadges u={d.user} />
                </div>
                <p className="text-sm text-ink-muted mt-1">{d.user.email}</p>
                <p className="text-[11px] text-ink-muted mt-0.5 break-all">ID: {d.user.id}</p>
              </div>
              <button type="button" onClick={() => setDetail(null)} className="text-sm text-ink-muted shrink-0">
                닫기 ✕
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {[
                ["개설한 방", d.stats.hosted],
                ["참가 경기", d.stats.joined],
                ["받은 평가", d.stats.evalsReceived],
                ["한 평가", d.stats.evalsGiven],
              ].map(([label, v]) => (
                <div key={label as string} className="tint rounded-xl py-3">
                  <div className="font-display text-xl text-court">{v}</div>
                  <div className="text-[11px] text-ink-muted">{label}</div>
                </div>
              ))}
            </div>

            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-ink-muted">성별</dt><dd>{d.user.gender === "MALE" ? "남" : d.user.gender === "FEMALE" ? "여" : "-"}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-muted">자기신고 구력</dt><dd>{d.user.tennisLevel}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-muted">실력(NTRP)</dt><dd>{d.user.ntrpScore?.toFixed(1) ?? "-"} ({d.user.ntrpCount}회)</dd></div>
              <div className="flex justify-between"><dt className="text-ink-muted">매너 온도</dt><dd>{d.user.mannerScore.toFixed(1)}도</dd></div>
              <div className="flex justify-between"><dt className="text-ink-muted">가입일</dt><dd>{fmtDate(d.user.createdAt)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-muted">마지막 접속</dt><dd>{fmtDate(d.lastSeenAt)}</dd></div>
              {d.user.deletedAt && (
                <div className="flex justify-between"><dt className="text-ink-muted">탈퇴일</dt><dd>{fmtDate(d.user.deletedAt)}</dd></div>
              )}
            </dl>

            {d.recentParticipations.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-court mb-2">최근 참여 경기</h3>
                <ul className="space-y-1 text-sm">
                  {d.recentParticipations.map((r) => (
                    <li key={r.matchId + r.matchDate}>
                      <Link href={`/matches/${r.matchId}`} className="row-link flex justify-between rounded-lg px-2 py-1.5">
                        <span>{r.courtName} · {r.gameType}</span>
                        <span className="text-ink-muted">
                          {new Date(r.matchDate).toLocaleDateString("ko-KR", { timeZone: "UTC", month: "numeric", day: "numeric" })}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/users/${d.user.id}`} className="btn-outline-court text-sm font-medium px-4 py-2 rounded-lg border">
                공개 프로필 보기
              </Link>
              {d.user.role !== "ADMIN" && !d.user.isBanned && (
                <>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="정지 사유 (선택)"
                    maxLength={200}
                    className="h-10 flex-1 min-w-[160px] rounded-lg border border-line px-3 text-sm bg-chalk"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => toggleBan(d.user.id, true)}
                    className="btn-clay text-sm font-bold px-4 py-2 rounded-lg"
                  >
                    정지
                  </button>
                </>
              )}
              {d.user.isBanned && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => toggleBan(d.user.id, false)}
                  className="chip-on text-sm font-bold px-4 py-2 rounded-lg"
                >
                  정지 해제
                </button>
              )}
            </div>
            {message && <p className="text-sm text-court">{message}</p>}
          </div>
        )}

        {/* 검색 */}
        <form onSubmit={submit} className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="닉네임 · 이메일 · 회원 ID로 검색"
            className="h-11 flex-1 rounded-xl border border-line px-4 text-sm bg-chalk"
          />
          <button type="submit" className="btn-clay px-6 rounded-xl text-sm font-bold">
            검색
          </button>
        </form>

        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => changeFilter(f.value)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium ${filter === f.value ? "chip-on" : "chip-off-court border border-line"}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 목록 */}
        <div className="surface rounded-2xl overflow-hidden">
          <div className="px-4 py-3 text-sm text-ink-muted border-b border-line flex items-center justify-between gap-3 flex-wrap">
            <span>{loading ? "불러오는 중..." : `총 ${total.toLocaleString()}명`}</span>
            <span className="flex items-center gap-3">
              {exportMsg && <span className="text-xs text-court">{exportMsg}</span>}
              <button
                type="button"
                onClick={downloadCsv}
                disabled={exporting || loading || total === 0}
                className="btn-outline-court border text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-40"
              >
                {exporting ? "만드는 중..." : "⬇ CSV 내보내기"}
              </button>
            </span>
          </div>
          {rows.length === 0 && !loading ? (
            <p className="py-12 text-center text-sm text-ink-muted">조건에 맞는 회원이 없어요.</p>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => openDetail(u.id)}
                    className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-[var(--mist)]"
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-ink truncate">{u.nickname}</span>
                        <StatusBadges u={u} />
                      </span>
                      <span className="block text-xs text-ink-muted truncate">{u.email}</span>
                    </span>
                    <span className="text-right text-xs text-ink-muted shrink-0">
                      <span className="block">{u.tennisLevel} · {u.mannerScore.toFixed(1)}도</span>
                      <span className="block">{fmtDate(u.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => token && load(token, q, filter, page - 1)}
              className="px-4 py-2 rounded-lg text-sm border border-line surface disabled:opacity-40"
            >
              이전
            </button>
            <span className="text-sm text-ink-muted">{page} / {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => token && load(token, q, filter, page + 1)}
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
