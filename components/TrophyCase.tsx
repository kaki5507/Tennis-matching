// components/TrophyCase.tsx
// 프로필의 트로피 진열장. 입상할 때마다 트로피가 하나씩 쌓입니다.
//  - 금(우승)/은(준우승)/동(3위) 등급별로 한 줄씩, 딴 개수만큼 트로피를 진열
//  - 같은 등급을 많이 딸수록 트로피가 커지고, 금을 2번 이상 따면 은은하게 빛남
//  - 트로피를 누르면 그 대회의 대진표로 이동, 마우스를 올리면 대회 정보가 보임
//  - 단식/복식은 트로피 가운데 글자('단'/'복')로 구분

import Link from "next/link";
import Trophy from "@/components/Trophy";
import { championTitle, hasGlow, shelfSlice, tierOf, trophySize, TIER_LABEL, type TrophyTier } from "@/lib/trophies";

export interface Honor {
  tournamentId: string;
  title: string;
  date: string | Date;
  place: 1 | 2 | 3;
  format: "SINGLES" | "DOUBLES";
  partnerName: string | null;
}

const TIERS: TrophyTier[] = ["gold", "silver", "bronze"];
const TIER_ICON: Record<TrophyTier, string> = { gold: "🏆", silver: "🥈", bronze: "🥉" };

export default function TrophyCase({ honors }: { honors: Honor[] }) {
  if (honors.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="flex justify-center gap-3 opacity-25 grayscale mb-3" aria-hidden="true">
          <Trophy tier="silver" size={40} />
          <Trophy tier="silver" size={52} />
          <Trophy tier="silver" size={40} />
        </div>
        <p className="text-sm text-slate-400">아직 진열장이 비어 있어요.</p>
        <p className="text-xs text-slate-400 mt-1">대회에서 입상하면 트로피가 하나씩 쌓여요!</p>
      </div>
    );
  }

  const byTier = (tier: TrophyTier) =>
    honors
      .filter((h) => tierOf(h.place) === tier)
      // 최근에 딴 트로피가 왼쪽 (가장 앞자리에 자랑)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const goldCount = byTier("gold").length;
  const title = championTitle(goldCount);

  return (
    <div className="space-y-2">
      {title && (
        <div className="flex justify-center mb-1">
          <span className="text-xs font-bold px-3 py-1 rounded-full medal-1">
            👑 {title}
            {goldCount >= 2 && ` · 우승 ${goldCount}회`}
          </span>
        </div>
      )}

      {TIERS.map((tier) => {
        const list = byTier(tier);
        if (list.length === 0) return null;
        const { shown, hidden } = shelfSlice(list.length);
        const size = trophySize(tier, list.length);
        const glow = hasGlow(tier, list.length);

        return (
          <div key={tier}>
            {/* 진열장 한 칸: 트로피들이 선반 위에 놓여 있는 모양 */}
            <div className="flex items-end justify-center gap-1 flex-wrap px-2 pt-2 min-h-[64px]">
              {list.slice(0, shown).map((h) => (
                <Link
                  key={h.tournamentId}
                  href={`/tournaments/${h.tournamentId}/bracket`}
                  className="group relative transition-transform hover:-translate-y-1"
                  title={`${h.title} · ${TIER_LABEL[tier]} · ${new Date(h.date).toLocaleDateString("ko-KR")}${
                    h.partnerName ? ` · 파트너 ${h.partnerName}` : ""
                  }`}
                >
                  <Trophy tier={tier} size={size} glow={glow} mark={h.format === "DOUBLES" ? "복" : "단"} />
                </Link>
              ))}
              {hidden > 0 && <span className="text-sm font-bold text-slate-400 pb-3 pl-1">+{hidden}</span>}
            </div>
            {/* 선반 */}
            <div className="trophy-shelf" />
            <div className="text-center text-[11px] font-medium text-slate-500 mt-1.5">
              {TIER_ICON[tier]} {TIER_LABEL[tier]} {list.length}회
            </div>
          </div>
        );
      })}
    </div>
  );
}
