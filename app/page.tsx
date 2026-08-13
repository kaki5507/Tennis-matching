"use client"; // 화면에서 유저 상태(State)를 실시간으로 확인하기 위해 추가합니다.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 🟢 헤더 (상단 네비게이션) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-bold text-xl text-green-600">
            🎾 TennisMatch
          </div>
          
          <div className="flex items-center gap-4">
            {/* 유저가 있으면(로그인 상태) 로그아웃 버튼을, 없으면 로그인/가입 버튼을 보여줍니다. */}
            {user ? (
              <>
                <span className="text-sm text-slate-600 font-medium hidden sm:inline-block">
                  환영합니다!
                </span>
                <Link href="/mypage">
                  <Button variant="ghost" className="h-9 text-green-700 font-medium hover:bg-green-50">
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
                  <Button className="h-9 bg-green-600 hover:bg-green-700">회원가입</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 🟢 메인 콘텐츠 영역 (히어로 섹션) */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">
          나에게 딱 맞는 <br className="md:hidden" />
          <span className="text-green-600">테니스 파트너</span>를 찾아보세요
        </h1>
        <p className="text-lg text-slate-600 mb-10 max-w-lg">
          실력, 연령, 성별 조건에 맞는 매칭 방을 찾거나 직접 만들어보세요. 매너 온도로 쾌적한 경기를 보장합니다.
        </p>
        
        {user ? (
          <div className="flex gap-4">
            <Link href="/matches">
              <Button className="h-12 px-8 text-lg bg-green-600 hover:bg-green-700">
                매칭 방 찾기
              </Button>
            </Link>
            <Link href="/matches/create">
              <Button variant="outline" className="h-12 px-8 text-lg border-green-600 text-green-600 hover:bg-green-50">
                방 만들기
              </Button>
            </Link>
          </div>
        ) : (
          <Link href="/signup">
            <Button className="h-12 px-8 text-lg bg-green-600 hover:bg-green-700">
              지금 바로 시작하기
            </Button>
          </Link>
        )}
      </main>
    </div>
  );
}