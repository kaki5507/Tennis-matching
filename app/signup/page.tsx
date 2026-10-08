"use client"; // 상태 관리(useState)를 쓰기 위해 맨 위에 추가!

import { checkNickname } from "@/app/actions/nickname";
import { signUpWithoutEmailVerification } from "@/app/actions/testSignup";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { createUserInDB } from "@/app/actions/auth";
import { completeIdentityVerification, devBypassIdentityVerification, getSignupMode } from "@/app/actions/verification";
import { ShieldCheck, CheckCircle2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();

  // 사용자가 입력한 값을 담아둘 공간
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [nickStatus, setNickStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  // 입력칸 바로 아래에 보여줄 안내 (맨 위 에러 박스까지 올라가지 않아도 어디가 문제인지 바로 보이게)
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [pwTouched, setPwTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const pwTooShort = (pwTouched || submitted) && password.length > 0 && password.length < 6;
  const pwMismatch = (confirmTouched || submitted) && passwordConfirm.length > 0 && password !== passwordConfirm;
  const pwMatch = passwordConfirm.length > 0 && password === passwordConfirm;
  const nickBad = nickStatus !== null && !nickStatus.ok;
  const focusField = (id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    (el as HTMLInputElement | null)?.focus({ preventScroll: true });
  };

  // 서버가 "본인인증 없이 가입"을 허용 중인지 (운영에서는 ALLOW_UNVERIFIED_SIGNUP 스위치)
  const [unverifiedAllowed, setUnverifiedAllowed] = useState(false);
  useEffect(() => {
    getSignupMode().then((m) => setUnverifiedAllowed(m.unverifiedAllowed));
  }, []);

  // [NEW] 본인인증 관련 상태
  const [isVerifying, setIsVerifying] = useState(false);
  // 본인인증 완료 표시: 포트원 인증 ID(운영) 또는 "dev"(개발용 우회). CI/DI 같은 민감 값은 화면에 오지 않고,
  // 가입 시 서버가 인증 ID로 포트원에 직접 다시 확인합니다.
  const [verifiedId, setVerifiedId] = useState<string | null>(null);
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
          unverifiedAllowed
            ? "본인인증 서비스가 아직 준비 중이에요. 아래 '본인인증 없이 가입하기'를 이용해주세요."
            : "본인인증 서비스가 아직 준비 중이에요. 잠시 후 다시 시도해주세요."
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

      if (!result.success) {
        setErrorMsg(result.error ?? "본인인증에 실패했습니다.");
        setIsVerifying(false);
        return;
      }

      setVerifiedId(response.identityVerificationId);
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
    if (!result.success) {
      setErrorMsg(result.error ?? "개발용 우회에 실패했습니다.");
      setIsVerifying(false);
      return;
    }
    setVerifiedId("dev");
    setVerifiedName(result.name ?? null);
    setIsVerifying(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); // 폼 제출 시 새로고침 방지
    setErrorMsg("");

    // 0. 본인인증 완료 여부 확인 (재가입 방지의 최소 조건)
    if (!verifiedId) {
      return setErrorMsg("먼저 본인인증을 완료해주세요.");
    }

    // 0-1. 필수 약관 동의 확인
    if (!allRequiredAgreed) {
      return setErrorMsg("이용약관과 개인정보처리방침에 동의해야 가입할 수 있습니다.");
    }

    // 1. 입력값 검사: 틀린 칸으로 바로 이동 + 그 칸 아래에 이유 표시
    setSubmitted(true);
    let nick = nickStatus;
    if (!nick && nickname.trim()) {
      const r = await checkNickname(null, nickname);
      nick = { ok: r.available, message: r.message };
      setNickStatus(nick);
    }
    if (nick && !nick.ok) {
      focusField("nickname");
      return;
    }
    if (password.length < 6) {
      focusField("password");
      return;
    }
    if (password !== passwordConfirm) {
      focusField("passwordConfirm");
      return;
    }

    setIsLoading(true);

    try {
      // 1-1. [테스트 단계] 임시 가입이고 서버에 관리자 키가 있으면, 이메일 인증 없이 가입하고 바로 로그인
      if (verifiedId === "dev") {
        const fast = await signUpWithoutEmailVerification({
          email, password, nickname, termsAgreed, privacyAgreed, marketingAgreed,
          adminCode: wantsAdmin ? adminCode : undefined,
        });
        if (fast.success && fast.needsEmailConfirm) {
          // 인증 메일은 기다리지 않고 백그라운드로 보냄 → 안내 후 바로 메인으로
          void supabase.auth
            .resend({ type: "signup", email, options: { emailRedirectTo: `${window.location.origin}/login` } })
            .catch(() => {});
          alert("회원가입이 완료되었습니다!\n인증 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해주세요. (안 보이면 스팸함도 확인해 주세요)");
          router.push("/");
          return;
        }
        if (fast.success) {
          const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
          if (loginError) {
            alert("회원가입이 완료되었습니다! 로그인해주세요.");
            router.push("/login");
          } else {
            alert("회원가입이 완료되었습니다! 환영합니다 🎾");
            router.push("/");
            router.refresh();
          }
          return;
        }
        if (fast.code !== "DISABLED") throw new Error(fast.error ?? "가입에 실패했습니다.");
        // DISABLED → 서버 키가 없는 것이므로 아래의 일반 가입 흐름으로 진행
      }

      // 2. Supabase Auth에 회원가입 요청
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        // 인증 메일의 링크가 localhost 가 아니라 지금 보고 있는 사이트로 돌아오게 함
        options: { emailRedirectTo: `${window.location.origin}/login` },
      });

      if (error) {
        if (/already registered/i.test(error.message)) {
          throw new Error("이미 가입된 이메일이에요. 로그인하거나, 비밀번호를 잊었다면 로그인 화면에서 재설정해 주세요.");
        }
        throw new Error(error.message);
      }
      if (!data.user) throw new Error("유저 생성 실패");
      // 이메일 인증이 켜져 있으면 이미 가입된 이메일은 에러 대신 identities 가 빈 사용자로 돌아옵니다.
      if (data.user.identities && data.user.identities.length === 0) {
        throw new Error("이미 가입된 이메일이에요. 로그인하거나, 비밀번호를 잊었다면 로그인 화면에서 재설정해 주세요.");
      }

      // 3. 성공했다면, Prisma를 통해 우리 DB(users 테이블)에 프로필 저장
      //    본인인증 값은 서버가 인증 ID로 포트원에서 직접 확인합니다. (이메일 인증 없이 바로 로그인되는
      //    설정이라면 토큰도 같이 보내 가입 계정과 일치하는지 확인)
      const dbResult = await createUserInDB({
        id: data.user.id,
        email: data.user.email!,
        nickname,
        identityVerificationId: verifiedId === "dev" ? undefined : verifiedId,
        devBypass: verifiedId === "dev",
        accessToken: data.session?.access_token ?? null,
        termsAgreed,
        privacyAgreed,
        marketingAgreed,
        adminCode: wantsAdmin ? adminCode : undefined,
      });

      if (!dbResult.success) {
        throw new Error(dbResult.error);
      }

      // 4. 모든 것이 성공하면 로그인 페이지로 이동!
      // 세션이 없으면 이메일 인증이 필요한 설정 → 메일의 링크를 눌러야 로그인할 수 있음
      alert(
        data.session
          ? "회원가입이 완료되었습니다! 로그인해주세요."
          : "회원가입이 완료되었습니다!\n입력하신 이메일로 인증 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해주세요. (안 보이면 스팸함도 확인해 주세요)"
      );
      router.push("/login");

    } catch (error: unknown) { // any 대신 unknown 사용
      if (error instanceof Error) {
        // 브라우저가 서버와 통신 자체에 실패한 경우 (iOS: "Load failed", 그 외: "Failed to fetch")
        if (/load failed|failed to fetch|networkerror|network request failed/i.test(error.message)) {
          setErrorMsg(
            "서버와 연결하지 못했어요. 잠시 후 다시 시도해 주세요. 만약 인증 메일이 이미 도착했다면 가입은 처리된 것일 수 있어요. 메일함을 확인하고 로그인해 보세요."
          );
        } else {
          setErrorMsg(error.message);
        }
      } else {
        setErrorMsg("가입 중 오류가 발생했습니다.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center tint px-4 py-12">
      <div className="w-full max-w-md surface p-8 rounded-2xl shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl heading mb-2">반갑습니다! 🎾</h1>
          <p className="text-slate-500">딱 맞는 테니스 파트너를 찾아드릴게요.</p>
        </div>

        {/* 에러가 있으면 보여주는 빨간 박스 */}
        {errorMsg && (
          <div className="mb-6 p-3 alert-danger text-sm rounded-lg text-center">
            {errorMsg}
          </div>
        )}

        {/* [NEW] 본인인증 단계 */}
        <div className="mb-6">
          {!verifiedId ? (
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
            <div className="flex items-center gap-2 p-3 badge-ok text-sm rounded-lg">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {verifiedId === "dev" ? "본인인증 없이 가입합니다 (임시)." : <>본인인증이 완료되었습니다{verifiedName ? ` (${verifiedName}님)` : ""}.</>}
            </div>
          )}

          {/* 서버가 임시 가입을 허용 중일 때만 노출됩니다. (포트원 키가 없는 동안 기본 허용, 키를 넣으면 자동으로 사라짐)
              버튼이 보여도 실제 허용 여부는 가입 시 서버가 다시 검사합니다. */}
          {!verifiedId && unverifiedAllowed && (
            <div className="mt-3 rounded-xl p-4 alert-warn">
              <p className="text-sm font-bold">지금은 본인인증 없이도 가입할 수 있어요</p>
              <p className="text-xs mt-1 opacity-90">
                서비스 준비 기간에는 임시 가입이 가능합니다. 본인인증이 열리면 안내해 드릴게요.
              </p>
              <Button
                type="button"
                onClick={handleDevBypass}
                disabled={isVerifying}
                className="w-full mt-3 h-11 btn-clay font-bold"
              >
                본인인증 없이 가입하기 (임시)
              </Button>
            </div>
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
          {!allRequiredAgreed && (
            <p className="text-xs rounded-lg p-2.5 alert-info text-center">위의 필수 약관에 동의하면 아래 칸을 입력할 수 있어요.</p>
          )}
          <fieldset disabled={!allRequiredAgreed} className="space-y-6 disabled:opacity-50">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname">닉네임</Label>
              <Input
                id="nickname" type="text" value={nickname} maxLength={20} required
                aria-invalid={nickBad}
                style={nickBad ? { borderColor: "var(--danger)" } : undefined}
                onChange={(e) => { setNickname(e.target.value); setNickStatus(null); }}
                onBlur={async () => {
                  if (!nickname.trim()) return;
                  const r = await checkNickname(null, nickname);
                  setNickStatus({ ok: r.available, message: r.message });
                }}
                aria-describedby="nickname-status"
              />
              <p id="nickname-status" aria-live="polite" className={`text-xs min-h-4 ${nickBad ? "font-bold" : ""} ${nickStatus ? (nickStatus.ok ? "text-ok" : "text-danger") : "text-ink-muted"}`}>
                {nickStatus ? `${nickStatus.ok ? "✓ " : "✕ "}${nickStatus.message}` : "2~20자, 다른 회원과 겹치지 않아야 해요."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password" type="password" value={password} placeholder="6자리 이상 입력" required
                aria-invalid={pwTooShort}
                style={pwTooShort ? { borderColor: "var(--danger)" } : undefined}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setPwTouched(true)}
              />
              <p aria-live="polite" className={`text-xs min-h-4 ${pwTooShort ? "text-danger font-bold" : "text-ink-muted"}`}>
                {pwTooShort ? "✕ 비밀번호는 6자리 이상이어야 해요." : "6자리 이상"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">비밀번호 확인</Label>
              <Input
                id="passwordConfirm" type="password" value={passwordConfirm} required
                aria-invalid={pwMismatch}
                style={pwMismatch ? { borderColor: "var(--danger)" } : pwMatch ? { borderColor: "var(--ok)" } : undefined}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                onBlur={() => setConfirmTouched(true)}
              />
              <p aria-live="polite" className={`text-xs min-h-4 ${pwMismatch ? "text-danger font-bold" : pwMatch ? "text-ok font-bold" : "text-ink-muted"}`}>
                {pwMismatch ? "✕ 비밀번호가 일치하지 않아요." : pwMatch ? "✓ 비밀번호가 일치해요." : "위와 같은 비밀번호를 한 번 더 입력해요."}
              </p>
            </div>
          </fieldset>

          {allRequiredAgreed && !verifiedId && (
            <p className="text-xs text-warn font-bold text-center">위의 &quot;본인인증&quot; 또는 &quot;본인인증 없이 가입하기(임시)&quot;를 먼저 눌러주세요.</p>
          )}
          <Button type="submit" disabled={isLoading || !verifiedId || !allRequiredAgreed} className="w-full btn-clay h-12 text-lg">
            {isLoading ? "가입 처리 중..." : "가입하기"}
          </Button>
        </form>

        <div className="mt-6 text-center text-slate-600">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-ok font-semibold hover:underline">
            로그인하기
          </Link>
        </div>
      </div>
    </div>
  );
}
