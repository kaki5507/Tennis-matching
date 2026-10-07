"use client";

// 비밀번호 재설정 화면. 메일의 링크를 누르고 들어오면 Supabase 가 임시 세션(복구 세션)을 만들어 주고,
// 여기서 새 비밀번호를 저장합니다.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 링크로 들어오면 주소의 토큰을 읽어 세션이 만들어질 때까지 잠깐 걸립니다.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) setReady("ok");
    });
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      setReady(data.session ? "ok" : "invalid");
    }, 1500);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (password.length < 6) return setErrorMsg("비밀번호는 6자 이상으로 정해주세요.");
    if (password !== confirm) return setErrorMsg("비밀번호가 서로 다릅니다.");
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (error) return setErrorMsg(error.message);
    await supabase.auth.signOut();
    alert("비밀번호를 바꿨어요. 새 비밀번호로 로그인해 주세요.");
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center tint px-4">
      <div className="w-full max-w-md surface p-8 rounded-2xl shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl heading mb-2">새 비밀번호 정하기</h1>
          <p className="text-slate-500">앞으로 로그인에 쓸 비밀번호를 입력해 주세요.</p>
        </div>

        {errorMsg && <div className="mb-6 p-3 alert-danger text-sm rounded-lg text-center">{errorMsg}</div>}

        {ready === "checking" && <p className="text-center text-sm text-ink-muted">링크를 확인하고 있어요...</p>}

        {ready === "invalid" && (
          <div className="text-center space-y-4">
            <p className="text-sm alert-warn rounded-lg p-3">링크가 만료됐거나 올바르지 않아요. 로그인 화면에서 재설정 메일을 다시 받아 주세요.</p>
            <Link href="/login" className="inline-block btn-clay px-5 py-2.5 rounded-lg text-sm font-bold">
              로그인 화면으로
            </Link>
          </div>
        )}

        {ready === "ok" && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">새 비밀번호</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6자 이상" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">새 비밀번호 확인</Label>
              <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            <Button type="submit" disabled={isLoading} className="w-full btn-clay h-12 text-lg">
              {isLoading ? "저장 중..." : "비밀번호 바꾸기"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
