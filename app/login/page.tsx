"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { getEmailBypassMode, confirmEmailForTest } from "@/app/actions/testSignup";

export default function LoginPage() {
  const router = useRouter();
  
  // 사용자가 입력한 값을 담아둘 공간
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // 로딩 상태 및 에러 메시지
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [needsConfirm, setNeedsConfirm] = useState(false); // 이메일 인증이 안 된 계정
  const [emailBypass, setEmailBypass] = useState(false); // 테스트 단계: 이메일 인증 건너뛰기 가능
  useEffect(() => {
    getEmailBypassMode().then((m) => setEmailBypass(m.emailBypass)).catch(() => {});
  }, []);

const handleLogin = async (e: React.SyntheticEvent) => {
    e.preventDefault(); // 폼 제출 시 새로고침 방지
    setErrorMsg("");
    setInfoMsg("");
    setNeedsConfirm(false);
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
          setErrorMsg("이메일이나 비밀번호가 올바르지 않습니다. 인증 메일을 아직 안 눌렀다면 아래에서 다시 받을 수 있어요.");
          setNeedsConfirm(true);
        } else if (error.message.includes("Email not confirmed")) {
          setErrorMsg("이메일 인증이 아직 안 됐어요. 가입할 때 받은 메일의 링크를 눌러주세요.");
          setNeedsConfirm(true);
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

  // [테스트 단계] 이메일 인증을 건너뛰고 바로 로그인
  const handleSkipConfirm = async () => {
    setErrorMsg("");
    setInfoMsg("");
    if (!email || !password) return setErrorMsg("이메일과 비밀번호를 입력한 뒤 눌러 주세요.");
    setIsLoading(true);
    const r = await confirmEmailForTest(email);
    if (!r.success) {
      setIsLoading(false);
      return setErrorMsg(r.error ?? "처리에 실패했습니다.");
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);
    if (error) {
      return setErrorMsg(error.message.includes("Invalid login credentials") ? "이메일이나 비밀번호가 올바르지 않습니다." : error.message);
    }
    router.push("/");
    router.refresh();
  };

  // 인증 메일 다시 보내기
  const handleResend = async () => {
    setErrorMsg("");
    setInfoMsg("");
    if (!email) return setErrorMsg("위에 이메일을 먼저 입력해 주세요.");
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) return setErrorMsg(error.message.includes("rate") ? "잠시 후에 다시 시도해 주세요. (너무 자주 요청했어요)" : error.message);
    setInfoMsg("인증 메일을 다시 보냈어요. 메일함(스팸함 포함)을 확인해 주세요.");
  };

  // 비밀번호 재설정 메일 보내기
  const handleForgot = async () => {
    setErrorMsg("");
    setInfoMsg("");
    if (!email) return setErrorMsg("비밀번호를 재설정할 이메일을 먼저 입력해 주세요.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) return setErrorMsg(error.message.includes("rate") ? "잠시 후에 다시 시도해 주세요. (너무 자주 요청했어요)" : error.message);
    setInfoMsg("재설정 메일을 보냈어요. 가입된 이메일이라면 곧 도착합니다. 메일의 링크를 눌러 새 비밀번호를 정해주세요.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center tint px-4">
      <div className="w-full max-w-md surface p-8 rounded-2xl shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl heading mb-2">다시 오셨군요! 🎾</h1>
          <p className="text-slate-500">테니스 파트너들이 기다리고 있어요.</p>
        </div>

        {/* 에러가 있으면 보여주는 빨간 박스 */}
        {errorMsg && (
          <div className="mb-6 p-3 alert-danger text-sm rounded-lg text-center">
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div className="mb-6 p-3 alert-info text-sm rounded-lg text-center" role="status">
            {infoMsg}
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
              <button type="button" onClick={handleForgot} className="text-sm text-ok hover:underline">
                비밀번호를 잊으셨나요?
              </button>
            </div>
            <Input 
              id="password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full btn-clay h-12 text-lg">
            {isLoading ? "로그인 중..." : "로그인"}
          </Button>
        </form>

        {needsConfirm && emailBypass && (
          <button type="button" onClick={handleSkipConfirm} disabled={isLoading} className="mt-4 w-full text-sm font-bold btn-clay rounded-lg py-2.5">
            테스트 모드: 이메일 인증 건너뛰고 로그인
          </button>
        )}
        {needsConfirm && (
          <button type="button" onClick={handleResend} className="mt-4 w-full text-sm font-medium btn-outline-court border rounded-lg py-2.5">
            인증 메일 다시 받기
          </button>
        )}

        <div className="mt-6 text-center text-slate-600">
          아직 계정이 없으신가요?{" "}
          <Link href="/signup" className="text-ok font-semibold hover:underline">
            회원가입하기
          </Link>
        </div>
      </div>
    </div>
  );
}