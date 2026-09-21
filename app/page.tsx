"use client"; // 화면에서 유저 상태(State)를 실시간으로 확인하기 위해 추가합니다.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import TennisMascot from "@/components/TennisMascot";
import CourtLines from "@/components/CourtLines";

export default function HomePage() {
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
    <div className="min-h-screen flex flex-col" style={{ background: "var(--mist)" }}>
      {/* 헤더 */}
      <header className="border-b sticky top-0 z-10" style={{ background: "var(--chalk)", borderColor: "#dfe3d4" }}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TennisMascot pose="wave" className="w-9 h-9" />
            <span className="font-display text-xl" style={{ color: "var(--court)" }}>
              테니스매칭
            </span>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm font-medium hidden sm:inline-block" style={{ color: "var(--ink)" }}>
                  환영합니다!
                </span>
                <Link href="/mypage">
                  <Button variant="ghost" className="h-9 font-medium" style={{ color: "var(--court)" }}>
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
                  <Button className="h-9 text-white hover:opacity-90" style={{ background: "var(--clay)" }}>
                    회원가입
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <main className="flex-1">
        <section className="relative overflow-hidden">
          {/* 배경 코트라인 장식 (우측에 크게, 옅게) */}
          <CourtLines
            className="absolute -right-32 -top-10 w-[720px] h-[500px] opacity-[0.07] pointer-events-none hidden md:block"
            style={{ color: "var(--court)" }}
          />

          <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center relative">
            {/* 왼쪽: 카피 */}
            <div className="text-center md:text-left">
              <h1 className="font-display text-4xl md:text-6xl leading-tight mb-6" style={{ color: "var(--ink)" }}>
                오늘도 코트에서
                <br />
                만나요
              </h1>
              <p className="text-lg mb-10 max-w-md mx-auto md:mx-0" style={{ color: "var(--ink)", opacity: 0.75 }}>
                실력, 연령, 성별 조건에 맞는 매칭 방을 찾거나 직접 만들어보세요.
                매너 온도로 쾌적한 경기를 보장합니다.
              </p>

              {user ? (
                <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                  <Link href="/matches">
                    <Button
                      className="h-12 px-8 text-lg w-full sm:w-auto text-white hover:opacity-90"
                      style={{ background: "var(--clay)" }}
                    >
                      매칭 방 찾기
                    </Button>
                  </Link>
                  <Link href="/matches/create">
                    <Button
                      variant="outline"
                      className="h-12 px-8 text-lg w-full sm:w-auto"
                      style={{ borderColor: "var(--court)", color: "var(--court)" }}
                    >
                      방 만들기
                    </Button>
                  </Link>
                </div>
              ) : (
                <Link href="/signup">
                  <Button
                    className="h-12 px-8 text-lg text-white hover:opacity-90"
                    style={{ background: "var(--clay)" }}
                  >
                    지금 바로 시작하기
                  </Button>
                </Link>
              )}
            </div>

            {/* 오른쪽: 마스코트 일러스트 */}
            <div className="flex justify-center">
              <div
                className="relative w-64 h-64 md:w-80 md:h-80 rounded-full flex items-center justify-center"
                style={{ background: "var(--chalk)", border: "3px dashed var(--ball)" }}
              >
                <TennisMascot pose="wave" className="w-48 h-48 md:w-60 md:h-60" />
              </div>
            </div>
          </div>
        </section>

        {/* 특징 3가지 - 코트 라인으로 구획 */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x" style={{ borderColor: "#dfe3d4" }}>
            {[
              { emoji: "🎯", title: "레벨별 매칭", desc: "내 실력에 맞는 상대만 골라서 만나요." },
              { emoji: "🌡️", title: "매너 온도", desc: "블라인드 평가로 쾌적한 코트 문화를 만듭니다." },
              { emoji: "📍", title: "지도로 확인", desc: "테니스장 위치와 예약 현황을 한눈에." },
            ].map((f) => (
              <div key={f.title} className="py-8 sm:py-0 sm:px-8 text-center first:pl-0 last:pr-0">
                <div className="text-3xl mb-3">{f.emoji}</div>
                <h3 className="font-display text-xl mb-2" style={{ color: "var(--court)" }}>
                  {f.title}
                </h3>
                <p className="text-sm" style={{ color: "var(--ink)", opacity: 0.7 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
