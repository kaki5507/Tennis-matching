"use client"; // 화면에서 유저 상태(State)를 실시간으로 확인하기 위해 추가합니다.

import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuthUser } from "@/lib/useAuthUser";
import HeroCourt from "@/components/HeroCourt";
import { Target, Thermometer, MapPin, Search, PlusCircle, CalendarClock, Trophy, History, User } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import NotificationBell from "@/components/NotificationBell";
import SideMenu from "@/components/SideMenu";

const SHORTCUTS = [
  { href: "/matches", label: "방 찾기", sub: "열린 방 보기", Icon: Search, cls: "sc-hard" },
  { href: "/matches/create", label: "방 만들기", sub: "내가 방장", Icon: PlusCircle, cls: "sc-clay" },
  { href: "/mypage#court-watch", label: "빈 코트 찾기", sub: "3시간마다 자동 확인", Icon: CalendarClock, cls: "sc-grass" },
  { href: "/tournaments", label: "대회", sub: "대진표·결과", Icon: Trophy, cls: "sc-sky" },
  { href: "/history", label: "기록실", sub: "내 경기 기록", Icon: History, cls: "sc-hard" },
  { href: "/mypage", label: "마이페이지", sub: "프로필·설정", Icon: User, cls: "sc-grass" },
];

export default function HomeClient({ children }: { children?: ReactNode }) {
  // 로그인 여부는 저장된 세션에서 바로 읽음 (서버 왕복 없음)
  const { userId } = useAuthUser();
  const user = userId;

  return (
    <div className="min-h-screen flex flex-col tint">
      {/* 헤더 */}
      <header className="border-b sticky top-0 z-10 app-bar">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
          <BrandLogo size="md" mood="happy" />

          <div className="flex items-center gap-1 sm:gap-2">
            {user ? (
              <>
                <NotificationBell />
                <Link href="/mypage" className="hidden sm:block">
                  <Button variant="ghost" className="h-9 px-3 text-sm font-medium text-court">
                    마이페이지
                  </Button>
                </Link>
                <SideMenu buttonClassName="-mr-1" />
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="h-9 px-2.5 sm:px-3 text-sm">로그인</Button>
                </Link>
                <Link href="/signup">
                  <Button className="h-9 px-3 text-sm btn-clay">
                    회원가입
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 히어로 섹션: 하드코트 블루 */}
      <main className="flex-1">
        <section className="hero-blue relative overflow-hidden">
          <div className="hero-cloud w-72 h-16 top-10 left-[6%]" aria-hidden />
          <div className="hero-cloud w-96 h-20 top-40 right-[4%]" style={{ animationDelay: "-6s" }} aria-hidden />
          <div className="max-w-6xl mx-auto px-4 pt-14 pb-16 md:pt-20 md:pb-24 grid md:grid-cols-[1.05fr_0.95fr] gap-12 items-center relative">
            {/* 왼쪽: 큰 타이포 + 행동 버튼 */}
            <div>
              <h1 className="font-display text-[2.6rem] md:text-7xl leading-[1.08] mb-6 text-white">
                실력 맞는
                <br />
                파트너,
                <br />
                오늘 코트에서.
              </h1>
              <p className="text-lg mb-9 max-w-md text-white/85 leading-relaxed">
                레벨·연령·성별 조건으로 방을 찾고, 매너 온도로 쾌적하게 치세요. 방 하나 열면 끝이에요.
              </p>

              {user ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/matches">
                    <Button className="h-13 px-8 text-lg w-full sm:w-auto btn-clay">매칭 방 찾기</Button>
                  </Link>
                  <Link href="/matches/create">
                    <Button variant="outline" className="h-13 px-8 text-lg w-full sm:w-auto bg-transparent text-white border-2 border-white hover:bg-white/10 hover:text-white">
                      방 만들기
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href="/signup">
                    <Button className="h-13 px-8 text-lg w-full sm:w-auto btn-clay">지금 바로 시작하기</Button>
                  </Link>
                  <Link href="/matches">
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

        {/* 세 가지 코트 표면 = 세 가지 장점 */}
        <section className="max-w-6xl mx-auto px-4 py-8 md:py-10">
          <div className="grid md:grid-cols-3 gap-3 md:gap-4">
            {[
              { cls: "panel-hard", Icon: Target, tag: "하드코트", title: "레벨별 매칭", desc: "내 실력에 맞는 상대만 골라서 만나요." },
              { cls: "panel-grass", Icon: Thermometer, tag: "잔디", title: "매너 온도", desc: "블라인드 평가로 쾌적한 코트 문화를 만듭니다." },
              { cls: "panel-clay", Icon: MapPin, tag: "클레이", title: "지도로 확인", desc: "테니스장 위치와 예약 현황을 한눈에." },
            ].map(({ cls, Icon, tag, title, desc }) => (
              <div key={title} className={`${cls} panel-lines rounded-2xl p-5 md:p-6 flex flex-col`}>
                <span className="relative z-10 self-start text-xs font-extrabold bg-white/95 text-ink rounded-full px-3 py-1">{tag}</span>
                <Icon className="relative z-10 w-8 h-8 mt-3 mb-2" strokeWidth={2.4} aria-hidden />
                <h3 className="relative z-10 font-display text-xl mb-1">{title}</h3>
                <p className="relative z-10 text-sm text-white/90 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 서버에서 가져온 실시간 현황/안내 섹션들 (app/page.tsx에서 주입) */}
        {children}
      </main>
    </div>
  );
}
