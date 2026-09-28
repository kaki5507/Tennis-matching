// components/EntrantList.tsx
// 대회 참가 명단. 단식은 선수 목록, 복식은 팀 목록(확정/수락 대기 구분)을 보여줍니다.

import Link from "next/link";

interface Player {
  id: string;
  nickname: string | null;
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

const fmt = (n: number | null) => (n !== null ? n.toFixed(1) : "-");

export default function EntrantList({ format, participants, teams }: Props) {
  if (format === "SINGLES") {
    if (participants.length === 0) return <p className="text-sm text-slate-400">아직 신청자가 없어요.</p>;
    return (
      <ul className="space-y-2">
        {participants.map((p) => (
          <li key={p.userId}>
            <Link href={`/users/${p.userId}`} className="flex justify-between text-sm hover:underline">
              <span className="text-slate-700">{p.user.nickname || "익명"}</span>
              <span className="text-slate-400">NTRP {fmt(p.user.ntrpScore)}</span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  // 복식: 확정 팀을 먼저, 수락 대기 팀은 아래에 흐리게
  const confirmed = teams.filter((t) => t.status === "CONFIRMED");
  const pending = teams.filter((t) => t.status === "PENDING");
  if (teams.length === 0) return <p className="text-sm text-slate-400">아직 신청한 팀이 없어요.</p>;

  const teamSum = (t: TeamRow) =>
    t.captain.ntrpScore !== null && t.partner.ntrpScore !== null
      ? Math.round((t.captain.ntrpScore + t.partner.ntrpScore) * 10) / 10
      : null;

  const row = (t: TeamRow, dim: boolean) => (
    <li key={t.id} className={`flex items-center justify-between gap-3 text-sm ${dim ? "opacity-50" : ""}`}>
      <span className="min-w-0 truncate">
        <Link href={`/users/${t.captain.id}`} className="text-slate-700 hover:underline">
          {t.captain.nickname || "익명"}
        </Link>
        <span className="text-slate-300 mx-1.5">·</span>
        <Link href={`/users/${t.partner.id}`} className="text-slate-700 hover:underline">
          {t.partner.nickname || "익명"}
        </Link>
      </span>
      <span className="text-slate-400 text-xs shrink-0">합산 {fmt(teamSum(t))}</span>
    </li>
  );

  return (
    <div className="space-y-4">
      {confirmed.length > 0 && (
        <div>
          <div className="text-xs font-bold text-ok mb-2">확정된 팀 {confirmed.length}</div>
          <ul className="space-y-2">{confirmed.map((t) => row(t, false))}</ul>
        </div>
      )}
      {pending.length > 0 && (
        <div>
          <div className="text-xs font-bold text-slate-400 mb-2">파트너 수락 대기 {pending.length}</div>
          <ul className="space-y-2">{pending.map((t) => row(t, true))}</ul>
        </div>
      )}
    </div>
  );
}
