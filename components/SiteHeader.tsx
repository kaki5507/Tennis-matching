"use client";

// components/SiteHeader.tsx
// 모든 페이지 상단에 공통으로 붙는 네비게이션.
// 대진표 전용 화면처럼 자체 헤더를 가진 화면에서는 숨깁니다.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { checkAdminAccess } from "@/app/actions/admin";
import { getAccessToken } from "@/lib/authToken";
import BrandLogo from "@/components/BrandLogo";
import NotificationBell from "@/components/NotificationBell";
import { Menu, X } from "lucide-react";

const NAV = [
  { href: "/matches", label: "매칭" },
  { href: "/tournaments", label: "대회" },
  { href: "/history", label: "기록실" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
      if (data.user) setIsAdminUser(await checkAdminAccess(await getAccessToken()));
    };
    check();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      if (!session?.user) setIsAdminUser(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // 자체 헤더/레이아웃을 가진 화면에서는 숨김
  if (pathname === "/" || pathname.endsWith("/bracket")) return null;

  const links = isAdminUser ? [...NAV, { href: "/admin", label: "관리자" }] : NAV;

  return (
    <header className="sticky top-0 z-30 border-b app-bar">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <BrandLogo />

        {/* 데스크톱 메뉴 */}
        <nav className="hidden sm:flex items-center gap-1">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${active ? "chip-on" : "chip-off"}`}
              >
                {link.label}
              </Link>
            );
          })}
          <span className="w-px h-5 mx-1.5 bg-line" />
          {userId ? (
            <>
              <NotificationBell />
              <Link href="/mypage" className="chip-off px-3 py-1.5 rounded-full text-sm font-medium">
                마이페이지
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="chip-off px-3 py-1.5 rounded-full text-sm font-medium">
                로그인
              </Link>
              <Link href="/signup" className="px-3 py-1.5 rounded-full text-sm font-bold btn-clay">
                회원가입
              </Link>
            </>
          )}
        </nav>

        {/* 모바일: 종 + 메뉴 토글 */}
        <div className="sm:hidden flex items-center -mr-2">
          <NotificationBell />
          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            className="p-2 text-court"
            aria-label={isOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {isOpen && (
        <nav className="sm:hidden border-t px-4 py-3 space-y-1 border-line">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setIsOpen(false)} className="block py-2 text-sm font-medium text-ink">
              {link.label}
            </Link>
          ))}
          <div className="h-px my-2 bg-line" />
          {userId ? (
            <Link href="/mypage" onClick={() => setIsOpen(false)} className="block py-2 text-sm font-medium text-ink">
              마이페이지
            </Link>
          ) : (
            <>
              <Link href="/login" onClick={() => setIsOpen(false)} className="block py-2 text-sm font-medium text-ink">
                로그인
              </Link>
              <Link href="/signup" onClick={() => setIsOpen(false)} className="block py-2 text-sm font-bold text-clay">
                회원가입
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
