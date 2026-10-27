// app/guide/page.tsx
// 이용 가이드. 탭은 ?t= 로 구분해서 링크로 바로 공유할 수 있고, 서버에서 한 탭만 그려 가볍게 보여줍니다.
import type { Metadata } from "next";
import Link from "next/link";
import StartTab from "@/components/guide/tabs/StartTab";
import CourtsTab from "@/components/guide/tabs/CourtsTab";
import MatchTab from "@/components/guide/tabs/MatchTab";
import TournamentTab from "@/components/guide/tabs/TournamentTab";
import GrowthTab from "@/components/guide/tabs/GrowthTab";
import TrustTab from "@/components/guide/tabs/TrustTab";
import MoreTab from "@/components/guide/tabs/MoreTab";
import FaqTab from "@/components/guide/tabs/FaqTab";

export const metadata: Metadata = {
  title: "이용 가이드 | 테니스매칭",
  description: "가입부터 빈 코트 찾기, 매칭, 대회, 레벨·매너 온도까지 화면과 함께 따라 하는 이용 가이드",
};

const TABS = [
  { key: "start", label: "시작하기", emoji: "🚀", intro: "가입하고 프로필을 채운 뒤 첫 경기까지", Body: StartTab },
  { key: "courts", label: "빈 코트", emoji: "🎾", intro: "비어 있는 시간을 찾고 알림 받기", Body: CourtsTab },
  { key: "match", label: "매칭", emoji: "🤝", intro: "방에 신청하고, 방을 만들고, 방장 관리하기", Body: MatchTab },
  { key: "tournament", label: "대회", emoji: "🏆", intro: "신청부터 대진표, 우승 기록까지", Body: TournamentTab },
  { key: "growth", label: "레벨·랭킹", emoji: "👑", intro: "레벨 조건, 칭호, 랭킹 보는 법", Body: GrowthTab },
  { key: "trust", label: "평가·매너", emoji: "🌡️", intro: "경기 후 평가와 매너 온도 계산", Body: TrustTab },
  { key: "more", label: "알림·게시판", emoji: "🔔", intro: "알림, 게시판, 기록실, 계정", Body: MoreTab },
  { key: "faq", label: "FAQ", emoji: "❓", intro: "자주 묻는 질문", Body: FaqTab },
] as const;

export default async function GuidePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const sp = await searchParams;
  const idx = Math.max(0, TABS.findIndex((t) => t.key === sp.t));
  const tab = TABS[idx];
  const prev = TABS[idx - 1];
  const next = TABS[idx + 1];
  const Body = tab.Body;

  return (
    <div className="min-h-screen page-bg">
      <header className="hero-blue">
        <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
          <h1 className="font-display text-3xl sm:text-4xl">이용 가이드</h1>
          <p className="mt-2 text-white/85 text-sm sm:text-base">화면을 보면서 따라 하면 돼요. 아래 탭에서 궁금한 기능을 골라 보세요.</p>
        </div>
        <div className="surface-band" />
      </header>

      <nav aria-label="가이드 탭" className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-line">
        <div className="max-w-3xl mx-auto px-3 overflow-x-auto">
          <ul className="flex gap-1.5 py-2 w-max">
            {TABS.map((t) => {
              const on = t.key === tab.key;
              return (
                <li key={t.key}>
                  <Link
                    href={t.key === "start" ? "/guide" : `/guide?t=${t.key}`}
                    scroll={false}
                    aria-current={on ? "page" : undefined}
                    className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold ${on ? "chip-on" : "chip-off"}`}
                  >
                    <span aria-hidden>{t.emoji}</span>{t.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-7">
        <p className="text-sm text-ink-muted mb-6">{tab.emoji} {tab.intro}</p>
        <div className="surface rounded-2xl p-5 sm:p-7">
          <Body />
        </div>

        <div className="flex justify-between gap-3 mt-6">
          {prev ? (
            <Link href={prev.key === "start" ? "/guide" : `/guide?t=${prev.key}`} className="surface rounded-xl px-4 py-3 text-sm flex-1">
              <span className="block text-xs text-ink-muted">이전</span><b>{prev.label}</b>
            </Link>
          ) : <span className="flex-1" />}
          {next ? (
            <Link href={`/guide?t=${next.key}`} className="surface rounded-xl px-4 py-3 text-sm flex-1 text-right">
              <span className="block text-xs text-ink-muted">다음</span><b>{next.label}</b>
            </Link>
          ) : <span className="flex-1" />}
        </div>
      </main>
    </div>
  );
}
