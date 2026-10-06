"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/authToken";
import { getMaintenanceAdmin, setMaintenance, type MaintenanceAdminView } from "@/app/actions/adminMaintenance";
import TennisLoader from "@/components/TennisLoader";

/** ISO → <input type="datetime-local"> 값 (KST) */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  return new Date(new Date(iso).getTime() + 9 * 3600_000).toISOString().slice(0, 16);
}
/** datetime-local 값(KST로 해석) → ISO */
function fromLocalInput(v: string) {
  return v ? new Date(`${v}:00+09:00`).toISOString() : null;
}

export default function AdminMaintenancePage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "denied" | "ok">("checking");
  const [view, setView] = useState<MaintenanceAdminView | null>(null);
  const [message, setMessage] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }
    const res = await getMaintenanceAdmin(token);
    if (!res.success) {
      setStatus("denied");
      return;
    }
    setView(res.data);
    setMessage(res.data.message ?? "");
    setEndsAt(toLocalInput(res.data.endsAt));
    setStatus("ok");
  }, [router]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const apply = async (enabled: boolean) => {
    if (enabled && !confirm("점검 모드를 켜면 일반 사용자는 모든 화면에서 점검 안내만 보게 됩니다. 켤까요?")) return;
    setBusy(true);
    setNotice(null);
    const token = await getAccessToken();
    const res = await setMaintenance(token, { enabled, message, endsAt: fromLocalInput(endsAt) });
    setBusy(false);
    if (!res.success) {
      setNotice(res.error);
      return;
    }
    setNotice(enabled ? "점검 모드를 켰습니다." : "점검 모드를 껐습니다.");
    await load();
    router.refresh();
  };

  if (status === "checking") {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <TennisLoader label="권한 확인 중..." />
      </div>
    );
  }
  if (status === "denied" || !view) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <p className="text-ink-muted">관리자만 접근할 수 있는 페이지입니다.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen page-bg py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl heading">🛠 서비스 점검 모드</h1>
          <p className="text-sm text-ink-muted mt-1">
            켜면 일반 사용자는 점검 안내 화면만 보게 됩니다. 관리자는 평소처럼 이용할 수 있고, 로그인·약관 페이지도 열려 있어요.
          </p>
        </div>

        <div className="surface rounded-2xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-ink-muted">현재 상태</p>
            <p className="text-lg font-bold mt-0.5">
              {view.enabled ? <span className="badge-live px-3 py-1 rounded-full text-sm">점검 중 (ON)</span> : <span className="badge-win px-3 py-1 rounded-full text-sm">정상 운영 (OFF)</span>}
            </p>
            {view.updatedAt && (
              <p className="text-xs text-ink-muted mt-2">
                마지막 변경: {new Date(view.updatedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                {view.updatedByNickname ? ` · ${view.updatedByNickname}` : ""}
              </p>
            )}
          </div>
        </div>

        <div className="surface rounded-2xl p-5 space-y-4">
          <label className="block">
            <span className="text-sm font-bold">사용자에게 보여줄 안내 문구</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 300))}
              rows={3}
              placeholder="예) 서버 업그레이드로 오후 2시~4시 서비스 이용이 어렵습니다."
              className="mt-1 w-full rounded-xl border border-line px-4 py-3 text-sm bg-chalk"
            />
            <span className="text-xs text-ink-muted">{message.length}/300 · 비워두면 기본 문구가 나옵니다</span>
          </label>
          <label className="block">
            <span className="text-sm font-bold">종료 예정 시각 (한국 시간, 선택)</span>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border border-line px-4 text-sm bg-chalk"
            />
            <span className="text-xs text-ink-muted">입력하면 안내 화면에 표시되고, 그 시각이 지나면 자동으로 해제됩니다.</span>
          </label>

          {notice && <p className="text-sm text-ink-muted">{notice}</p>}

          <div className="flex gap-2 flex-wrap">
            {view.enabled ? (
              <>
                <button disabled={busy} onClick={() => apply(false)} className="btn-clay px-6 h-11 rounded-xl text-sm font-bold">
                  점검 모드 끄기
                </button>
                <button disabled={busy} onClick={() => apply(true)} className="btn-outline-court px-6 h-11 rounded-xl text-sm font-bold">
                  문구·시간만 수정
                </button>
              </>
            ) : (
              <button disabled={busy} onClick={() => apply(true)} className="btn-clay px-6 h-11 rounded-xl text-sm font-bold">
                점검 모드 켜기
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-ink-muted">
          * 열려 있는 사용자 화면에는 최대 1분 안에 반영됩니다. 켜고 끈 기록은 &quot;작업 기록&quot; 탭에 남습니다.
        </p>
      </div>
    </div>
  );
}
