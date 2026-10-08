"use client"; // 화면에서 유저 상태(State)를 실시간으로 확인하기 위해 추가합니다.

import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/lib/useAuthUser";
import HeroCourt from "@/components/HeroCourt";
import { Search, PlusCircle, CalendarClock, Trophy, History, User } from "lucide-react";

const SHORTCUTS = [
  { href: "/matches", label: "방 찾기", sub: "열린 방 보기", Icon: Search, cls: "sc-hard" },
  { href: "/matches/create", label: "방 만들기", sub: "내가 방장", Icon: PlusCircle, cls: "sc-clay" },
  { href: "/courts", label: "빈 코트 찾기", sub: "내일·7일·이번 달 확인", Icon: CalendarClock, cls: "sc-grass" },
  { href: "/tournaments", label: "대회", sub: "대진표·결과", Icon: Trophy, cls: "sc-sky" },
  { href: "/history", label: "기록실", sub: "내 경기 기록", Icon: History, cls: "sc-hard" },
  { href: "/mypage", label: "마이페이지", sub: "프로필·설정", Icon: User, cls: "sc-grass" },
];

export default function HomeClient({ live, children }: { live?: ReactNode; children?: ReactNode }) {
  // 로그인 여부는 저장된 세션에서 바로 읽음 (서버 왕복 없음)
  const { userId } = useAuthUser();
  const user = userId;

  return (
    <div className="min-h-screen flex flex-col tint">
      {/* 히어로 섹션: 하드코트 블루 */}
      <main className="flex-1">
        <section className="hero-blue relative overflow-hidden">
          <div className="hero-cloud w-72 h-16 top-10 left-[6%]" aria-hidden />
          <div className="hero-cloud w-96 h-20 top-40 right-[4%]" style={{ animationDelay: "-6s" }} aria-hidden />
          <div className="max-w-6xl mx-auto px-4 pt-8 pb-10 md:pt-12 md:pb-14 grid md:grid-cols-[1.05fr_0.95fr] gap-8 md:gap-10 items-center relative">
            {/* 왼쪽: 큰 타이포 + 행동 버튼 */}
            <div>
              <h1 className="font-display text-[2.1rem] md:text-6xl leading-[1.1] mb-4 text-white">
                실력 맞는
                <br />
                파트너,
                <br />
                오늘 코트에서.
              </h1>
              <p className="text-base md:text-lg mb-6 max-w-md text-white/85 leading-relaxed">
                레벨·연령·성별 조건으로 방을 찾고, 매너 온도로 쾌적하게 치세요. 방 하나 열면 끝이에요.
              </p>

              {user ? (
                <div className="max-w-md">
                  <Link href="/courts" className="block">
                    <Button className="h-14 px-8 text-lg w-full btn-clay">🎾 빈 코트 찾기</Button>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/signup" className="block">
                    <Button className="h-13 px-8 text-lg w-full sm:w-auto btn-clay">지금 바로 시작하기</Button>
                  </Link>
                  <Link href="/matches" className="block">
                    <Button variant="outline" className="h-13 px-8 text-lg w-full sm:w-auto bg-transparent text-white border-2 border-white hover:bg-white/10 hover:text-white">
                      열린 방 구경하기
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* 오른쪽: 하드코트 + 마스코트 */}
            <HeroCourt />
          </div>
          <div className="surface-band" />
        </section>

        {/* 바로가기 슬라이드 배너 (로그인 후) */}
        {user && (
          <section className="max-w-6xl mx-auto pt-5" aria-label="바로가기">
            <h2 className="px-4 mb-2 text-sm font-extrabold text-court">바로가기</h2>
            <div className="shortcut-rail">
              {SHORTCUTS.map(({ href, label, sub, Icon, cls }) => (
                <Link key={href} href={href} className={`shortcut-card ${cls}`}>
                  <Icon className="w-6 h-6 shrink-0" aria-hidden />
                  <span className="flex flex-col leading-tight">
                    <span className="text-sm">{label}</span>
                    <span className="text-[11px] font-medium text-white/85">{sub}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 실시간 현황 + 모집 중인 방 (app/page.tsx에서 주입) */}
        {live}

        {/* 안내 섹션들 */}
        {children}
      </main>
    </div>
  );
}
