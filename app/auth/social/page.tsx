"use client";

// app/auth/social/page.tsx
// 구글/카카오 로그인 후 돌아오는 곳. 가입 여부를 확인해서
//  - 이미 가입 → 메인으로
//  - 처음 → 닉네임·약관 동의 후 가입
//  - 같은 이메일로 이미 이메일 가입 → 로그인 화면으로 돌려보내며 안내

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getAccessToken } from "@/lib/authToken";
import { checkSocialLogin, createSocialProfile } from "@/app/actions/social";
import { checkNickname } from "@/app/actions/nickname";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TennisLoader from "@/components/TennisLoader";

type Phase = "loading" | "profile" | "error";

export default function SocialCallbackPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [nickMsg, setNickMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const started = useRef(false);

  const leaveToLogin = useCallback(
    async (reason: "exists" | "error") => {
      await supabase.auth.signOut().catch(() => {});
      router.replace(`/login?social=${reason}`);
    },
    [router],
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      // 제공업체에서 취소/거부하고 돌아온 경우
      const params = new URLSearchParams(window.location.search + "&" + window.location.hash.replace(/^#/, ""));
      if (params.get("error") || params.get("error_description")) {
        setError(params.get("error_description")?.replace(/\+/g, " ") || "로그인이 취소됐어요.");
        setPhase("error");
        return;
      }

      // 주소에 담긴 로그인 정보를 supabase-js 가 세션으로 바꿀 때까지 잠깐 기다림
      let token: string | null = null;
      for (let i = 0; i < 25 && !token; i++) {
        token = await getAccessToken();
        if (!token) await new Promise((r) => setTimeout(r, 200));
      }
      if (!token) {
        setError("로그인 정보를 확인하지 못했어요. 다시 시도해 주세요.");
        setPhase("error");
        return;
      }

      const res = await checkSocialLogin(token);
      if (res.status === "EXISTS") {
        router.replace("/");
        router.refresh();
      } else if (res.status === "NEEDS_PROFILE") {
        setEmail(res.email);
        setNickname(res.suggestedNickname);
        setPhase("profile");
      } else if (res.status === "BLOCKED_EMAIL") {
        await leaveToLogin("exists");
      } else {
        setError(res.error);
        setPhase("error");
      }
    })();
  }, [router, leaveToLogin]);

  const verifyNick = async () => {
    const r = await checkNickname(await getAccessToken(), nickname);
    setNickMsg({ ok: r.available, text: r.message });
    return r.available;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    setError("");
    if (!terms || !privacy) return setError("이용약관과 개인정보처리방침에 동의해야 가입할 수 있어요.");
    submitting.current = true;
    setBusy(true);
    try {
      if (!(await verifyNick())) return;
      const r = await createSocialProfile(await getAccessToken(), {
        nickname,
        termsAgreed: terms,
        privacyAgreed: privacy,
        marketingAgreed: marketing,
      });
      if (!r.success) return setError(r.error);
      router.replace("/");
      router.refresh();
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <TennisLoader label="로그인 확인 중..." />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center tint px-4">
        <div className="w-full max-w-md surface p-8 rounded-2xl text-center">
          <p className="text-sm alert-danger p-3 rounded-lg mb-5">{error}</p>
          <Link href="/login" className="btn-clay inline-block px-6 py-2.5 rounded-full text-sm font-bold">로그인 화면으로</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center tint px-4 py-12">
      <div className="w-full max-w-md surface p-8 rounded-2xl shadow-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl heading mb-2">거의 다 됐어요! 🎾</h1>
          <p className="text-slate-500 text-sm">{email} 로 가입해요.<br />닉네임을 정하고 약관에 동의하면 끝나요.</p>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="nickname">닉네임</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setNickMsg(null);
              }}
              onBlur={() => nickname.trim() && verifyNick()}
              maxLength={20}
              required
            />
            {nickMsg && <p className={`text-xs font-bold ${nickMsg.ok ? "text-ok" : "text-danger"}`}>{nickMsg.text}</p>}
          </div>

          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="w-5 h-5" />
              <span>(필수) 이용약관 동의</span>
              <Link href="/terms" target="_blank" className="ml-auto text-slate-400 underline text-xs">보기</Link>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} className="w-5 h-5" />
              <span>(필수) 개인정보처리방침 동의</span>
              <Link href="/privacy" target="_blank" className="ml-auto text-slate-400 underline text-xs">보기</Link>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="w-5 h-5" />
              <span>(선택) 매칭/대회 알림 수신 동의</span>
            </label>
          </div>

          {error && <div className="p-3 alert-danger text-sm rounded-lg text-center font-bold" role="alert">{error}</div>}

          <Button type="submit" disabled={busy} className="w-full btn-clay h-12 text-lg">
            {busy ? "가입 처리 중..." : "가입 완료"}
          </Button>
          <button type="button" onClick={() => leaveToLogin("error")} className="w-full text-xs text-slate-400 underline">
            취소하고 로그인 화면으로
          </button>
        </form>
      </div>
    </div>
  );
}
