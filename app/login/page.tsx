"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  
  // 사용자가 입력한 값을 담아둘 공간
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // 로딩 상태 및 에러 메시지
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // 폼 제출 시 새로고침 방지
    setErrorMsg("");
    setIsLoading(true);

    try {
      // Supabase Auth를 통해 로그인 시도
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // 에러가 있으면 에러 발생시키기 (비밀번호 틀림 등)
      if (error) throw new Error(error.message);

      // 로그인 성공 시!
      alert("로그인 성공! 환영합니다 🎾");
      router.push("/"); // 일단 메인 페이지로 이동 (나중에는 매칭 리스트로 이동할 수도 있음)
      
    } catch (error: unknown) {
      // TypeScript 에러 안전 처리
      if (error instanceof Error) {
        // Supabase에서 주는 영어 에러 메시지를 한국어로 친절하게 바꿔주기 (선택사항)
        if (error.message.includes("Invalid login credentials")) {
          setErrorMsg("이메일이나 비밀번호가 올바르지 않습니다.");
        } else {
          setErrorMsg(error.message);
        }
      } else {
        setErrorMsg("로그인 중 오류가 발생했습니다.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">다시 오셨군요! 🎾</h1>
          <p className="text-slate-500">테니스 파트너들이 기다리고 있어요.</p>
        </div>

        {/* 에러가 있으면 보여주는 빨간 박스 */}
        {errorMsg && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input 
              id="email" 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tennis@example.com" 
              required 
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">비밀번호</Label>
              <Link href="#" className="text-sm text-green-600 hover:underline">
                비밀번호를 잊으셨나요?
              </Link>
            </div>
            <Input 
              id="password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg">
            {isLoading ? "로그인 중..." : "로그인"}
          </Button>
        </form>

        <div className="mt-6 text-center text-slate-600">
          아직 계정이 없으신가요?{" "}
          <Link href="/signup" className="text-green-600 font-semibold hover:underline">
            회원가입하기
          </Link>
        </div>
      </div>
    </div>
  );
}