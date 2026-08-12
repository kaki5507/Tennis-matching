"use client"; // 상태 관리(useState)를 쓰기 위해 맨 위에 추가!

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { createUserInDB } from "@/app/actions/auth";

export default function SignupPage() {
  const router = useRouter();
  
  // 사용자가 입력한 값을 담아둘 공간
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  
  // 로딩 상태 및 에러 메시지
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); // 폼 제출 시 새로고침 방지
    setErrorMsg("");

    // 1. 비밀번호 확인 검사
    if (password !== passwordConfirm) {
      return setErrorMsg("비밀번호가 서로 다릅니다.");
    }
    
    setIsLoading(true);

    try {
      // 2. Supabase Auth에 회원가입 요청
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw new Error(error.message);
      if (!data.user) throw new Error("유저 생성 실패");

      // 3. 성공했다면, Prisma를 통해 우리 DB(users 테이블)에 프로필 저장
      const dbResult = await createUserInDB({
        id: data.user.id,
        email: data.user.email!,
        nickname,
      });

      if (!dbResult.success) {
        throw new Error(dbResult.error);
      }

      // 4. 모든 것이 성공하면 로그인 페이지로 이동!
      alert("회원가입이 완료되었습니다! 로그인해주세요.");
      router.push("/login");
      
    } catch (error: unknown) { // any 대신 unknown 사용
      if (error instanceof Error) {
        setErrorMsg(error.message);
      } else {
        setErrorMsg("가입 중 오류가 발생했습니다.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">반갑습니다! 🎾</h1>
          <p className="text-slate-500">딱 맞는 테니스 파트너를 찾아드릴게요.</p>
        </div>

        {/* 에러가 있으면 보여주는 빨간 박스 */}
        {errorMsg && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nickname">닉네임</Label>
            <Input id="nickname" type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} required />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6자리 이상 입력" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="passwordConfirm">비밀번호 확인</Label>
            <Input id="passwordConfirm" type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} required />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg">
            {isLoading ? "가입 처리 중..." : "가입하기"}
          </Button>
        </form>

        <div className="mt-6 text-center text-slate-600">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-green-600 font-semibold hover:underline">
            로그인하기
          </Link>
        </div>
      </div>
    </div>
  );
}