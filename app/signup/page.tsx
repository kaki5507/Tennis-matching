"use client"; // 상태 관리(useState)를 쓰기 위해 맨 위에 추가!

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { createUserInDB } from "@/app/actions/auth";
import { completeIdentityVerification, devBypassIdentityVerification } from "@/app/actions/verification";
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

  // [NEW] 약관/개인정보처리방침 동의 상태
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);

  // [NEW] 관리자 가입 (초대코드가 맞아야만 실제로 관리자가 됨 — 서버에서 검증)
  const [wantsAdmin, setWantsAdmin] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [marketingAgreed, setMarketingAgreed] = useState(false);
  const allRequiredAgreed = termsAgreed && privacyAgreed;
  const allAgreed = allRequiredAgreed && marketingAgreed;

  const handleToggleAll = (checked: boolean) => {
    setTermsAgreed(checked);
    setPrivacyAgreed(checked);
    setMarketingAgreed(checked);
  };

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
        // 개발 환경에서 PG 계약 전이라면, 본인인증 버튼 자체를 우회 버튼으로 대체합니다.
        // (아래 handleDevBypass 참고 — 이 분기는 프로덕션에서는 절대 안 그려집니다)
        setErrorMsg(
          "본인인증 서비스가 아직 설정되지 않았습니다. 아래 개발용 버튼을 이용해주세요."
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

  // ⚠️ [DEV ONLY] 포트원 PG 계약 전, 회원가입 플로우 테스트용 우회 버튼 핸들러.
  // 서버 액션(devBypassIdentityVerification) 자체가 production에서는 항상 실패를
  // 반환하도록 이중으로 막혀있어서, 실수로 배포돼도 실제로 우회되지 않습니다.
  const handleDevBypass = async () => {
    setErrorMsg("");
    setIsVerifying(true);
    const result = await devBypassIdentityVerification();
    if (!result.success || !result.ciDi) {
      setErrorMsg(result.error ?? "개발용 우회에 실패했습니다.");
      setIsVerifying(false);
      return;
    }
    setVerifiedCiDi(result.ciDi);
    setVerifiedName(result.name ?? null);
    setIsVerifying(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); // 폼 제출 시 새로고침 방지
    setErrorMsg("");

    // 0. 본인인증 완료 여부 확인 (재가입 방지의 최소 조건)
    if (!verifiedCiDi) {
      return setErrorMsg("먼저 본인인증을 완료해주세요.");
    }

    // 0-1. 필수 약관 동의 확인
    if (!allRequiredAgreed) {
      return setErrorMsg("이용약관과 개인정보처리방침에 동의해야 가입할 수 있습니다.");
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
        termsAgreed,
        privacyAgreed,
        marketingAgreed,
        adminCode: wantsAdmin ? adminCode : undefined,
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

          {/* ⚠️ 개발 환경(NODE_ENV !== production)에서만 노출됩니다.
              프로덕션 빌드에서는 이 블록 자체가 렌더링되지 않고,
              혹시 남아있어도 서버 액션이 production에서 항상 실패를 반환합니다. */}
          {!verifiedCiDi && process.env.NODE_ENV !== "production" && (
            <button
              type="button"
              onClick={handleDevBypass}
              disabled={isVerifying}
              className="w-full mt-2 text-xs text-amber-700 bg-amber-50 border border-dashed border-amber-300 rounded-lg py-2 hover:bg-amber-100"
            >
              🛠️ [개발용] 포트원 PG 계약 전 — 본인인증 건너뛰고 테스트하기
            </button>
          )}
        </div>

        {/* [NEW] 약관/개인정보처리방침 동의 섹션 */}
        <div className="mb-6 border border-slate-200 rounded-lg p-4 space-y-3">
          <label className="flex items-center gap-2 font-semibold text-slate-900 cursor-pointer pb-2 border-b border-slate-100">
            <input
              type="checkbox"
              checked={allAgreed}
              onChange={(e) => handleToggleAll(e.target.checked)}
              className="w-4 h-4 accent-green-600"
            />
            전체 동의합니다
          </label>

          <label className="flex items-center justify-between text-sm text-slate-700 cursor-pointer">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className="w-4 h-4 accent-green-600"
              />
              (필수) 이용약관 동의
            </span>
            <Link href="/terms" target="_blank" className="text-slate-400 underline text-xs shrink-0">
              보기
            </Link>
          </label>

          <label className="flex items-center justify-between text-sm text-slate-700 cursor-pointer">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={privacyAgreed}
                onChange={(e) => setPrivacyAgreed(e.target.checked)}
                className="w-4 h-4 accent-green-600"
              />
              (필수) 개인정보처리방침 동의
            </span>
            <Link href="/privacy" target="_blank" className="text-slate-400 underline text-xs shrink-0">
              보기
            </Link>
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={marketingAgreed}
              onChange={(e) => setMarketingAgreed(e.target.checked)}
              className="w-4 h-4 accent-green-600"
            />
            (선택) 매칭/입금/대회 알림 수신 동의
          </label>
        </div>

        {/* [NEW] 관리자 가입 (초대코드 보유자만) */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={wantsAdmin}
              onChange={(e) => setWantsAdmin(e.target.checked)}
              className="w-3.5 h-3.5"
            />
            관리자 초대코드가 있어요
          </label>
          {wantsAdmin && (
            <Input
              type="password"
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
              placeholder="관리자 초대코드"
              className="mt-2"
            />
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

          <Button type="submit" disabled={isLoading || !verifiedCiDi || !allRequiredAgreed} className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg">
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
