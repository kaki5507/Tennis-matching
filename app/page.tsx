import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* 헤더 (네비게이션 바) */}
      <header className="w-full px-6 py-4 bg-white border-b flex justify-between items-center shadow-sm">
        <div className="text-2xl font-extrabold text-green-600 tracking-tighter">
          🎾 TennisRallio
        </div>
        <nav className="flex gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">로그인</Link>
          </Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white" asChild>
            <Link href="/signup">회원가입</Link>
          </Button>
        </nav>
      </header>

      {/* 메인 히어로 섹션 */}
      <main className="flex-grow flex flex-col items-center justify-center text-center px-4">
        <div className="inline-block px-3 py-1 mb-6 text-sm font-semibold text-green-700 bg-green-100 rounded-full">
          매칭 성공률 1위 테니스 플랫폼
        </div>
        
        <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight">
          나와 딱 맞는 <br className="md:hidden" />
          <span className="text-green-600">테니스 파트너</span>를 찾아보세요
        </h2>
        
        <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl">
          실력, 지역, 시간에 맞는 상대를 쉽고 빠르게 매칭해 드립니다. <br className="hidden md:block" />
          지금 바로 코트 위에서 새로운 만남을 시작하세요!
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white text-lg h-14 px-8" asChild>
            <Link href="/matches">매칭 시작하기</Link>
          </Button>
          <Button size="lg" variant="outline" className="text-lg h-14 px-8 border-slate-300" asChild>
            <Link href="/courts">주변 코트장 찾기</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}