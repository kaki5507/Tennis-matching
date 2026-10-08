"use client";

// components/admin/AdminUi.tsx
// 관리자 화면들이 같이 쓰는 작은 부품 + 권한 확인 상태 화면.

import TennisLoader from "@/components/TennisLoader";

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="surface rounded-xl p-4">
      <div className="text-xs text-ink-muted mb-1">{label}</div>
      <div className="text-2xl heading">{value}</div>
    </div>
  );
}

export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface rounded-xl p-5">
      <h3 className="font-bold text-ink mb-3">{title}</h3>
      {children}
    </div>
  );
}

export function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-ink-muted mb-1">
        <span className="truncate max-w-[70%]">{label}</span>
        <span className="font-medium">{count}</span>
      </div>
      <div className="h-2 tint rounded-full overflow-hidden">
        <div className="h-full bg-court rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** 일자별 막대 그래프 (값 위에 마우스를 올리면 날짜/수치 표시) */
export function DailyBars({
  data,
  valueKey,
  unit,
  barClass,
}: {
  data: { date: string; visitors: number; pageViews: number; signups: number }[];
  valueKey: "visitors" | "pageViews" | "signups";
  unit: string;
  barClass: string;
}) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]));
  return (
    <>
      <div className="flex items-end gap-[2px] h-24">
        {data.map((d) => (
          <div
            key={d.date}
            title={`${d.date}: ${d[valueKey]}${unit}`}
            className={`flex-1 rounded-sm hover:opacity-70 ${barClass}`}
            style={{ height: `${Math.max(d[valueKey] === 0 ? 2 : 6, Math.round((d[valueKey] / max) * 100))}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-ink-muted mt-2">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </>
  );
}

export type GateStatus = "checking" | "denied" | "ok";

/** 권한 확인 중 / 거부 화면. ok 면 children 을 그대로 보여줍니다. */
export function AdminGate({ status, children }: { status: GateStatus; children: React.ReactNode }) {
  if (status === "checking") {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <TennisLoader label="불러오는 중..." />
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
  return <>{children}</>;
}

/** 안에 들어갈 통계가 아직 안 왔을 때 보여주는 자리 표시 */
export function PanelSkeleton({ h = "h-32" }: { h?: string }) {
  return <div className={`surface rounded-xl ${h} animate-pulse`} aria-hidden />;
}
