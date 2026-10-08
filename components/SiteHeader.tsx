"use client";

// components/SiteHeader.tsx
// 모든 페이지 상단에 공통으로 붙는 네비게이션.
// 대진표 전용 화면처럼 자체 헤더를 가진 화면에서는 숨깁니다.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthUser } from "@/lib/useAuthUser";
import BrandLogo from "@/components/BrandLogo";
import NotificationBell from "@/components/NotificationBell";
import SideMenu from "@/components/SideMenu";

const NAV = [
  { href: "/courts", label: "빈 코트" },
  { href: "/matches", label: "매칭" },
  { href: "/tournaments", label: "대회" },
  { href: "/history", label: "기록실" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const { userId } = useAuthUser();

  // 자체 헤더/레이아웃을 가진 화면에서는 숨김
  if (pathname === "/" || pathname.endsWith("/bracket")) return null;

  return (
    <header className="sticky top-0 z-30 border-b app-bar">
      <div className="max-w-6xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-4">
        <BrandLogo />

        <div className="flex items-center gap-1">
          {/* 데스크톱 바로가기 */}
          <nav className="hidden sm:flex items-center gap-1">
            {NAV.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link key={link.href} href={link.href} className={`px-3 py-1.5 rounded-full text-sm font-medium ${active ? "chip-on" : "chip-off"}`}>
                  {link.label}
                </Link>
              );
            })}
            {!userId && (
              <>
                <span className="w-px h-5 mx-1.5 bg-line" />
                <Link href="/login" className="chip-off px-3 py-1.5 rounded-full text-sm font-medium">로그인</Link>
                <Link href="/signup" className="px-3 py-1.5 rounded-full text-sm font-bold btn-clay">회원가입</Link>
              </>
            )}
          </nav>
          {userId && <NotificationBell />}
          <SideMenu buttonClassName="-mr-2 sm:mr-0" />
        </div>
      </div>
    </header>
  );
}
