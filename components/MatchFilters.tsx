"use client";

// components/MatchFilters.tsx
// 방 찾기 필터: 셀렉트박스(경기 종류 · 코트 · 실력 · 모집 상태). 바꾸면 바로 목록이 갱신됩니다.
// 값은 주소(?type=&court=&lvl=&seat=)에 실려서, 서버가 그대로 걸러 줍니다.

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import LevelFilterToggle from "@/components/LevelFilterToggle";

export interface Filters {
  type: string;
  court: string;
  lvl: string;
  seat: string;
  lv: string; // 내 레벨 점수 (있으면 "내 레벨에 맞는 방만")
}

const TYPE_OPTIONS = [
  { v: "", l: "경기 종류: 전체" },
  { v: "단식", l: "단식" },
  { v: "복식", l: "복식" },
  { v: "혼합복식", l: "혼합복식" },
  { v: "랠리(연습)", l: "랠리" },
];

const LEVEL_OPTIONS = [
  { v: "", l: "실력: 전체" },
  { v: "open", l: "누구나 · 초보 환영" },
  { v: "beginner", l: "초보 (NTRP 2.0 이하)" },
  { v: "mid", l: "초중급~중급 (2.0~3.0)" },
  { v: "high", l: "중급 이상 (3.0~)" },
];

const SEAT_OPTIONS = [
  { v: "", l: "모집 상태: 전체" },
  { v: "open", l: "자리 있음 (모집중)" },
  { v: "full", l: "정원 마감" },
  { v: "waiting", l: "신청 대기자 있는 방" },
];

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div className="relative min-w-0">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-10 w-full appearance-none rounded-xl border pl-3 pr-8 text-sm font-semibold truncate outline-none surface ${value ? "border-court text-court" : "border-line text-slate-700"}`}
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>{o.l}</option>
        ))}
      </select>
      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

export default function MatchFilters({ current, courts }: { current: Filters; courts: { id: string; name: string }[] }) {
  const router = useRouter();

  const go = (patch: Partial<Filters>) => {
    const next = { ...current, ...patch };
    const p = new URLSearchParams();
    if (next.type) p.set("type", next.type);
    if (next.court) p.set("court", next.court);
    if (next.lvl) p.set("lvl", next.lvl);
    if (next.seat) p.set("seat", next.seat);
    if (next.lv) p.set("lv", next.lv);
    const qs = p.toString();
    router.push(qs ? `/matches?${qs}` : "/matches", { scroll: false });
  };

  const courtOptions = [{ v: "", l: "코트: 전체" }, ...courts.map((c) => ({ v: c.id, l: c.name }))];
  const baseParams: Record<string, string> = {};
  if (current.type) baseParams.type = current.type;
  if (current.court) baseParams.court = current.court;
  if (current.lvl) baseParams.lvl = current.lvl;
  if (current.seat) baseParams.seat = current.seat;
  const anyActive = !!(current.type || current.court || current.lvl || current.seat || current.lv);

  return (
    <div className="mb-3" role="group" aria-label="매칭 방 필터">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Select label="경기 종류" value={current.type} onChange={(v) => go({ type: v })} options={TYPE_OPTIONS} />
        <Select label="코트" value={current.court} onChange={(v) => go({ court: v })} options={courtOptions} />
        <Select label="실력" value={current.lvl} onChange={(v) => go({ lvl: v })} options={LEVEL_OPTIONS} />
        <Select label="모집 상태" value={current.seat} onChange={(v) => go({ seat: v })} options={SEAT_OPTIONS} />
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <LevelFilterToggle active={!!current.lv} baseParams={baseParams} />
        {anyActive && (
          <button type="button" onClick={() => router.push("/matches", { scroll: false })} className="text-xs font-bold text-slate-500 underline px-1">
            필터 초기화
          </button>
        )}
      </div>
    </div>
  );
}
