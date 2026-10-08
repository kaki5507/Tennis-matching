"use client";

// components/SideMenu.tsx
// 오른쪽에서 밀려 나오는 슬라이드 메뉴. 헤더의 햄버거 버튼으로 엽니다.
// 로그인 상태면 방 찾기/만들기·대회·기록실·알림·마이페이지, 주력 기능(빈 코트 찾기)을 위쪽에 크게 보여줍니다.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarClock, ChevronRight, Menu, X, Search, PlusCircle, Trophy, History, Bell, User, ShieldCheck, LogOut, LogIn, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthUser } from "@/lib/useAuthUser";
import { useIsAdmin } from "@/lib/useIsAdmin";

const ITEMS = [
  { href: "/matches", label: "방 찾기", Icon: Search },
  { href: "/matches/create", label: "방 만들기", Icon: PlusCircle },
  { href: "/tournaments", label: "대회", Icon: Trophy },
  { href: "/history", label: "기록실", Icon: History },
  { href: "/notifications", label: "알림", Icon: Bell },
  { href: "/mypage", label: "마이페이지", Icon: User },
];

export default function SideMenu({ buttonClassName = "" }: { buttonClassName?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { userId, email } = useAuthUser();
  const [open, setOpen] = useState(false);

  // 관리자 여부: 로그인 직후 미리 확인해 두고 탭에 기억 → 메뉴를 열 때 기다리지 않음
  const isAdmin = useIsAdmin(userId);

  // 페이지가 바뀌면 닫기
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  // 열려 있을 때: Esc로 닫기 + 배경 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const logout = async () => {
    setOpen(false);
    try {
      sessionStorage.removeItem("tm_admin_flag");
    } catch {
      /* 무시 */
    }
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`p-2 text-court ${buttonClassName}`} aria-label="메뉴 열기" aria-expanded={open}>
        <Menu className="w-6 h-6" />
      </button>

      <div className={`drawer-root ${open ? "is-open" : ""}`} aria-hidden={!open}>
        <div className="drawer-backdrop modal-overlay" onClick={() => setOpen(false)} />
        <aside className="drawer-panel" role="dialog" aria-modal="true" aria-label="메뉴">
          <div className="flex items-center justify-between px-4 h-14 border-b border-line">
            <div className="min-w-0">
              <p className="font-display text-court text-lg leading-tight">메뉴</p>
              {userId && email && <p className="text-xs text-ink-muted truncate">{email}</p>}
            </div>
            <button type="button" onClick={() => setOpen(false)} className="p-2 text-court" aria-label="메뉴 닫기">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
            {userId && (
              <Link href="/courts" className="drawer-feature flex items-center gap-3 rounded-xl p-3 mb-2">
                <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <CalendarClock className="w-5 h-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-extrabold text-sm">빈 코트 찾기</span>
                  <span className="block text-xs text-white/85">내일·7일·이번 달 한 번에 확인</span>
                </span>
                <ChevronRight className="w-4 h-4 shrink-0" />
              </Link>
            )}

            {userId ? (
              ITEMS.map(({ href, label, Icon }) => {
                const exact = href === "/matches" || href === "/matches/create";
                const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link key={href} href={href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${active ? "chip-on" : "chip-off drawer-hover"}`}>
                    <Icon className="w-[18px] h-[18px]" />
                    {label}
                  </Link>
                );
              })
            ) : (
              <>
                <Link href="/matches" className="chip-off flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold drawer-hover">
                  <Search className="w-[18px] h-[18px]" /> 열린 방 구경하기
                </Link>
                <Link href="/tournaments" className="chip-off flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold drawer-hover">
                  <Trophy className="w-[18px] h-[18px]" /> 대회
                </Link>
                <Link href="/history" className="chip-off flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold drawer-hover">
                  <History className="w-[18px] h-[18px]" /> 기록실
                </Link>
              </>
            )}

            {userId && isAdmin && (
              <Link href="/admin" className="chip-off flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold drawer-hover">
                <ShieldCheck className="w-[18px] h-[18px]" /> 관리자
              </Link>
            )}
          </div>

          <div className="px-3 py-3 border-t border-line">
            {userId ? (
              <button type="button" onClick={logout} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-danger drawer-hover">
                <LogOut className="w-[18px] h-[18px]" /> 로그아웃
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link href="/login" className="btn-outline-court border-2 rounded-xl py-2.5 text-sm font-bold text-center flex items-center justify-center gap-1.5">
                  <LogIn className="w-4 h-4" /> 로그인
                </Link>
                <Link href="/signup" className="btn-clay rounded-xl py-2.5 text-sm font-bold text-center flex items-center justify-center gap-1.5">
                  <UserPlus className="w-4 h-4" /> 회원가입
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
