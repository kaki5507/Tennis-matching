// components/BadgeShowcase.tsx
// 프로필의 레벨 · 칭호 진열장. 숨겨진 칭호는 얻기 전까지 "???"로 보입니다.

import type { BadgeView } from "@/app/actions/badges";

export default function BadgeShowcase({ badges }: { badges: BadgeView }) {
  const earned = badges.titles.filter((t) => t.earned);
  const locked = badges.titles.filter((t) => !t.earned);
  return (
    <div>
      <div className="tint rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-bold text-slate-900">
            {badges.levelEmoji} Lv.{badges.level} {badges.levelName}
          </p>
          <p className="text-xs text-slate-500">경험치 {badges.xp.toLocaleString()}</p>
        </div>
        {badges.next ? (
          <>
            <div className="h-2 rounded-full bg-white/70 overflow-hidden mt-2" role="presentation">
              <div className="h-full bg-court rounded-full" style={{ width: `${Math.round(badges.next.progress * 100)}%` }} />
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              다음 {badges.next.emoji} {badges.next.name}까지 경험치 {badges.next.xpLeft}
              {badges.next.mannerLeft > 0 ? ` · 매너 온도 ${badges.next.mannerLeft.toFixed(1)}도 더 필요` : ""}
            </p>
          </>
        ) : (
          <p className="text-xs text-slate-500 mt-1.5">최고 레벨이에요 👑</p>
        )}
        <p className="text-[11px] text-slate-400 mt-1">경기 1판 10점 · 대회 참가 20점 · 방문 하루 1점(하루 여러 번 와도 1번)</p>
      </div>

      {badges.weekly.length > 0 && (
        <div className="mb-5">
          <h3 className="text-sm font-bold text-slate-700 mb-2">이번 주 칭호 <span className="font-normal text-slate-400">· 지난주({badges.weekLabel}) 결과</span></h3>
          <div className="flex flex-wrap gap-2">
            {badges.weekly.map((w) => (
              <span key={w.key} title={w.desc} className="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                {w.emoji} {w.name} · {w.count}회
              </span>
            ))}
          </div>
        </div>
      )}

      <h3 className="text-sm font-bold text-slate-700 mb-2">
        칭호 {earned.length}/{badges.titles.length}
      </h3>
      {earned.length === 0 && <p className="text-sm text-slate-400 mb-3">아직 얻은 칭호가 없어요. 경기에 참여하면 하나씩 생겨요!</p>}
      <div className="flex flex-wrap gap-2">
        {earned.map((t) => (
          <span key={t.id} title={t.desc} className="text-xs font-bold px-3 py-1.5 rounded-full chip-on">
            {t.emoji} {t.name}
          </span>
        ))}
        {locked.map((t) => (
          <span
            key={t.id}
            title={t.hidden ? "숨겨진 칭호예요. 조건은 비밀!" : t.desc}
            className="text-xs px-3 py-1.5 rounded-full border border-dashed border-slate-300 text-slate-400"
          >
            {t.hidden ? "❓ ???" : `🔒 ${t.name}`}
          </span>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 mt-3">잠긴 칭호는 이름 위에 마우스를 올리면 얻는 방법이 보여요. 숨겨진 칭호는 직접 찾아보세요!</p>
    </div>
  );
}
