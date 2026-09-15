"use client"; // 상태 관리(useState)를 쓰기 위해 맨 위에 추가!

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { createUserInDB } from "@/app/actions/auth";
import { completeIdentityVerification } from "@/app/actions/verification";
import { ShieldCheck, CheckCircle2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();

  // 사용자가 입력한 값을 담아둘 공간
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  // [NEW] 본인인증 관련 상태
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedCiDi, setVerifiedCiDi] = useState<string | null>(null);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);

  // 로딩 상태 및 에러 메시지
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // [NEW] 본인인증 시작 (재가입 방지의 핵심 단계)
  const handleVerifyIdentity = async () => {
    setErrorMsg("");
    setIsVerifying(true);

    try {
      // PortOne Browser SDK는 클라이언트에서만 동작하므로 동적 import
      const PortOne = (await import("@portone/browser-sdk/v2")).default;

      const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
      const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;

      if (!storeId || !channelKey) {
        setErrorMsg(
          "본인인증 서비스가 아직 설정되지 않았습니다. (.env에 NEXT_PUBLIC_PORTONE_STORE_ID / NEXT_PUBLIC_PORTONE_CHANNEL_KEY 필요)"
        );
        setIsVerifying(false);
        return;
      }

      const response = await PortOne.requestIdentityVerification({
        storeId,
        channelKey,
        identityVerificationId: `iv_${crypto.randomUUID()}`,
      });

      if (!response || response.code != null) {
        // 사용자가 인증창을 닫았거나 실패한 경우
        setErrorMsg(response?.message ?? "본인인증이 취소되었습니다.");
        setIsVerifying(false);
        return;
      }

      // 프론트에서 받은 결과는 절대 그대로 믿지 않고, 서버에서 재검증합니다.
      const result = await completeIdentityVerification(response.identityVerificationId);

      if (!result.success || !result.ciDi) {
        setErrorMsg(result.error ?? "본인인증에 실패했습니다.");
        setIsVerifying(false);
        return;
      }

      setVerifiedCiDi(result.ciDi);
      setVerifiedName(result.name ?? null);
    } catch (error) {
      console.error("본인인증 에러:", error);
      setErrorMsg("본인인증 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); // 폼 제출 시 새로고침 방지
    setErrorMsg("");

    // 0. 본인인증 완료 여부 확인 (재가입 방지의 최소 조건)
    if (!verifiedCiDi) {
      return setErrorMsg("먼저 본인인증을 완료해주세요.");
    }

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
      //    이때 더미값이 아닌, 위에서 검증된 실제 ciDi를 넣습니다.
      const dbResult = await createUserInDB({
        id: data.user.id,
        email: data.user.email!,
        nickname,
        ciDi: verifiedCiDi,
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

        {/* [NEW] 본인인증 단계 */}
        <div className="mb-6">
          {!verifiedCiDi ? (
            <Button
              type="button"
              onClick={handleVerifyIdentity}
              disabled={isVerifying}
              variant="outline"
              className="w-full h-12 border-slate-300"
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              {isVerifying ? "본인인증 진행 중..." : "본인인증 하기 (필수)"}
            </Button>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 text-sm rounded-lg">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              본인인증이 완료되었습니다{verifiedName ? ` (${verifiedName}님)` : ""}.
            </div>
          )}
        </div>

        <form onSubmit={handleSignup} className="space-y-6">
          <fieldset disabled={!verifiedCiDi} className="space-y-6 disabled:opacity-50">
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
          </fieldset>

          <Button type="submit" disabled={isLoading || !verifiedCiDi} className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg">
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
