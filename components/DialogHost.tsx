"use client";

// components/DialogHost.tsx
// lib/dialog.ts 의 showAlert / showConfirm 이 요청한 팝업을 그려 줍니다. layout 에 한 번만 넣으면 됩니다.
// 여러 개가 연달아 오면 순서대로 하나씩 보여줍니다.

import { useCallback, useEffect, useRef, useState } from "react";
import { registerDialogHost, type DialogRequest, type DialogTone } from "@/lib/dialog";

const TONE: Record<DialogTone, { icon: string; ring: string; bg: string }> = {
  ok: { icon: "🎾", ring: "var(--ok)", bg: "var(--ok-soft)" },
  info: { icon: "🎾", ring: "var(--court)", bg: "var(--info-soft)" },
  warn: { icon: "✋", ring: "var(--warn)", bg: "var(--warn-soft)" },
  danger: { icon: "⚠️", ring: "var(--danger)", bg: "var(--danger-soft)" },
};

export default function DialogHost() {
  const [queue, setQueue] = useState<DialogRequest[]>([]);
  const okRef = useRef<HTMLButtonElement>(null);
  const current = queue[0];

  useEffect(() => {
    registerDialogHost((r) => setQueue((q) => [...q, r]));
    return () => registerDialogHost(null);
  }, []);

  const close = useCallback((result: boolean) => {
    setQueue((q) => {
      q[0]?.resolve(result);
      return q.slice(1);
    });
  }, []);

  useEffect(() => {
    if (!current) return;
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [current, close]);

  if (!current) return null;
  const t = TONE[current.tone];
  const danger = current.tone === "danger" && current.kind === "confirm";

  return (
    <div
      className="dialog-backdrop fixed inset-0 z-[1000] flex items-center justify-center px-4"
      style={{ background: "var(--overlay)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close(false);
      }}
    >
      <div
        role={current.kind === "confirm" ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-label={current.title ?? (current.kind === "confirm" ? "확인" : "알림")}
        className="dialog-card surface w-full max-w-sm rounded-2xl p-6 text-center"
      >
        <div
          className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full text-2xl"
          style={{ background: t.bg, boxShadow: `0 0 0 2px ${t.ring}` }}
          aria-hidden
        >
          {t.icon}
        </div>
        {current.title && <h2 className="font-display text-lg text-ink mb-1">{current.title}</h2>}
        <p className="text-sm text-ink whitespace-pre-line break-keep leading-relaxed">{current.message}</p>

        <div className={`mt-5 grid gap-2 ${current.kind === "confirm" ? "grid-cols-2" : "grid-cols-1"}`}>
          {current.kind === "confirm" && (
            <button
              type="button"
              onClick={() => close(false)}
              className="btn-outline-court border-2 h-11 rounded-xl text-sm font-bold"
            >
              {current.cancelText}
            </button>
          )}
          <button
            ref={okRef}
            type="button"
            onClick={() => close(true)}
            className={`${danger ? "" : "btn-clay"} h-11 rounded-xl text-sm font-bold`}
            style={danger ? { background: "var(--danger)", color: "var(--chalk)" } : undefined}
          >
            {current.okText}
          </button>
        </div>
      </div>
    </div>
  );
}
