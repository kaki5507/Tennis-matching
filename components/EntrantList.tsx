// components/EntrantList.tsx
// 대회 참가 명단. 단식은 선수 목록, 복식은 팀 목록(확정/수락 대기 구분)을 보여줍니다.
// 성별은 글자가 아니라 색으로만 드러냅니다: 남성=파랑, 여성=장미, 혼복=반반, 미입력=회색.

import Link from "next/link";
import { singleKind, teamKind, teamKindLabel, genderBadgeClass } from "@/lib/gender";
import { teamAvgNtrp, formatNtrp } from "@/lib/tournamentRules";

interface Player {
  id: string;
  nickname: string | null;
  gender: string | null;
  ntrpScore: number | null;
}

export interface TeamRow {
  id: string;
  status: "PENDING" | "CONFIRMED";
  captain: Player;
  partner: Player;
}

interface Props {
  format: "SINGLES" | "DOUBLES";
  participants: { userId: string; user: Player }[];
  teams: TeamRow[];
}

const STRIPE: Record<string, string> = {
  M: "stripe-m",
  MM: "stripe-m",
  F: "stripe-f",
  FF: "stripe-f",
  MF: "stripe-mf",
  unknown: "stripe-none",
};

const fmt = (n: number | null) => (n !== null ? formatNtrp(n) : "-");

/** 명단 위쪽에 보여주는 색 안내 (실제로 있는 유형만 표시) */
function Legend({ kinds }: { kinds: string[] }) {
  const items = [
    { kind: "MM", label: "남복" },
    { kind: "FF", label: "여복" },
    { kind: "MF", label: "혼복" },
    { kind: "M", label: "남성" },
    { kind: "F", label: "여성" },
  ].filter((i) => kinds.includes(i.kind));
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-3 mb-3">
      {items.map((i) => (
        <span key={i.kind} className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className={`w-3 h-3 rounded-full ${genderBadgeClass(i.kind as never)}`} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

export default function EntrantList({ format, participants, teams }: Props) {
  if (format === "SINGLES") {
    if (participants.length === 0) return <p className="text-sm text-slate-400">아직 신청자가 없어요.</p>;
    const kinds = [...new Set(participants.map((p) => singleKind(p.user.gender)))];
    return (
      <div>
        <Legend kinds={kinds} />
        <ul className="space-y-1.5">
          {participants.map((p) => (
            <li key={p.userId}>
              <Link
                href={`/users/${p.userId}`}
                className={`flex justify-between items-center text-sm rounded-lg pl-4 pr-3 py-2 tint hover:brightness-95 ${STRIPE[singleKind(p.user.gender)]}`}
              >
                <span className="text-slate-700 truncate">{p.user.nickname || "익명"}</span>
                <span className="text-slate-400 shrink-0">NTRP {fmt(p.user.ntrpScore)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (teams.length === 0) return <p className="text-sm text-slate-400">아직 신청한 팀이 없어요.</p>;

  // 확정 팀을 먼저, 수락 대기 팀은 아래에 흐리게
  const confirmed = teams.filter((t) => t.status === "CONFIRMED");
  const pending = teams.filter((t) => t.status === "PENDING");
  const kindOf = (t: TeamRow) => teamKind(t.captain.gender, t.partner.gender);
  const kinds = [...new Set(teams.map(kindOf))];

  const avgOf = (t: TeamRow) =>
    t.captain.ntrpScore !== null && t.partner.ntrpScore !== null
      ? teamAvgNtrp({ ntrpScore: t.captain.ntrpScore }, { ntrpScore: t.partner.ntrpScore })
      : null;

  const row = (t: TeamRow, dim: boolean) => {
    const kind = kindOf(t);
    const avg = avgOf(t);
    return (
      <li
        key={t.id}
        className={`flex items-center justify-between gap-3 text-sm rounded-lg pl-4 pr-3 py-2.5 tint ${STRIPE[kind]} ${dim ? "opacity-50" : ""}`}
      >
        <span className="min-w-0 truncate">
          <Link href={`/users/${t.captain.id}`} className="text-slate-700 hover:underline">
            {t.captain.nickname || "익명"}
          </Link>
          <span className="text-slate-300 mx-1.5">·</span>
          <Link href={`/users/${t.partner.id}`} className="text-slate-700 hover:underline">
            {t.partner.nickname || "익명"}
          </Link>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {teamKindLabel(kind) && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${genderBadgeClass(kind)}`}>
              {teamKindLabel(kind)}
            </span>
          )}
          <span className="text-slate-400 text-xs">평균 {avg !== null ? formatNtrp(avg) : "-"}</span>
        </span>
      </li>
    );
  };

  return (
    <div>
      <Legend kinds={kinds} />
      <div className="space-y-4">
        {confirmed.length > 0 && (
          <div>
            <div className="text-xs font-bold text-ok mb-2">확정된 팀 {confirmed.length}</div>
            <ul className="space-y-1.5">{confirmed.map((t) => row(t, false))}</ul>
          </div>
        )}
        {pending.length > 0 && (
          <div>
            <div className="text-xs font-bold text-slate-400 mb-2">파트너 수락 대기 {pending.length}</div>
            <ul className="space-y-1.5">{pending.map((t) => row(t, true))}</ul>
          </div>
        )}
      </div>
    </div>
  );
}
