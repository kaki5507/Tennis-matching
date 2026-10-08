// components/HomeSections.tsx
// 메인 페이지 하단: 이용 안내(통합) / 예약 바로가기(접힘) / 작은 CTA / 푸터.

import Link from "next/link";
import HomeGuide from "@/components/HomeGuide";
import CourtLinks from "@/components/CourtLinks";

export default function HomeSections() {
  return (
    <>
      <HomeGuide />
      <CourtLinks />

      {/* 하단 CTA */}
      <section className="max-w-6xl mx-auto px-4 pb-8">
        <div className="hero-court rounded-2xl px-5 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-display text-lg text-chalk text-center sm:text-left">오늘 칠 상대, 지금 찾아볼까요?</p>
          <div className="flex gap-2">
            <Link href="/signup" className="btn-clay px-5 py-2 rounded-full text-sm font-bold">무료로 시작하기</Link>
            <Link href="/matches" className="chip-off-on-court px-5 py-2 rounded-full text-sm font-bold">방 둘러보기</Link>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-muted">
          <span>🎾 테니스매칭 · 함께 치는 즐거움</span>
          <nav className="flex gap-4">
            <Link href="/terms" className="underline">이용약관</Link>
            <Link href="/privacy" className="underline">개인정보처리방침</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
