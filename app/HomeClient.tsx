"use client"; // 화면에서 유저 상태(State)를 실시간으로 확인하기 위해 추가합니다.

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import HeroCourt from "@/components/HeroCourt";
import { Target, Thermometer, MapPin } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import NotificationBell from "@/components/NotificationBell";

export default function HomeClient({ children }: { children?: ReactNode }) {
  // 현재 로그인한 유저 정보를 담을 공간
  const [user, setUser] = useState<User | null>(null);

  // 화면이 처음 켜질 때, Supabase에 "지금 로그인한 사람 있어?" 라고 물어보는 기능
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    checkUser();

    // 유저가 로그인/로그아웃 할 때마다 실시간으로 화면을 바꿔주기 위한 감지기(Listener)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 로그아웃 버튼을 눌렀을 때 실행될 함수
  const handleLogout = async () => {
    await supabase.auth.signOut();
    alert("안전하게 로그아웃 되었습니다.");
  };

  return (
    <div className="min-h-screen flex flex-col tint">
      {/* 헤더 */}
      <header className="border-b sticky top-0 z-10 app-bar">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <BrandLogo size="lg" mood="happy" />

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm font-medium hidden sm:inline-block text-ink">
                  환영합니다!
                </span>
                <NotificationBell />
                <Link href="/mypage">
                  <Button variant="ghost" className="h-9 font-medium text-court">
                    마이페이지
                  </Button>
                </Link>
                <Button onClick={handleLogout} variant="outline" className="h-9">
                  로그아웃
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="h-9">로그인</Button>
                </Link>
                <Link href="/signup">
                  <Button className="h-9 text-white hover:opacity-90 bg-clay text-white">
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

        {/* 세 가지 코트 표면 = 세 가지 장점 */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { cls: "panel-hard", Icon: Target, tag: "하드코트", title: "레벨별 매칭", desc: "내 실력에 맞는 상대만 골라서 만나요." },
              { cls: "panel-grass", Icon: Thermometer, tag: "잔디", title: "매너 온도", desc: "블라인드 평가로 쾌적한 코트 문화를 만듭니다." },
              { cls: "panel-clay", Icon: MapPin, tag: "클레이", title: "지도로 확인", desc: "테니스장 위치와 예약 현황을 한눈에." },
            ].map(({ cls, Icon, tag, title, desc }) => (
              <div key={title} className={`${cls} panel-lines rounded-2xl p-8 pt-9 min-h-[220px] flex flex-col`}>
                <span className="relative z-10 self-start text-xs font-extrabold bg-white/95 text-ink rounded-full px-3 py-1">{tag}</span>
                <Icon className="relative z-10 w-10 h-10 mt-6 mb-3" strokeWidth={2.4} aria-hidden />
                <h3 className="relative z-10 font-display text-2xl mb-1.5">{title}</h3>
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
