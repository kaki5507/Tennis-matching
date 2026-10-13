"use client";

// components/SocialLoginButtons.tsx
// 구글 / 카카오 간편로그인 버튼. 로그인이 끝나면 /auth/social 로 돌아와 가입 여부를 확인합니다.

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Provider = "google" | "kakao";

export default function SocialLoginButtons({ onError }: { onError?: (msg: string) => void }) {
  const [busy, setBusy] = useState<Provider | null>(null);

  const go = async (provider: Provider) => {
    setBusy(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/social` },
    });
    if (error) {
      setBusy(null);
      onError?.("간편로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={() => go("kakao")}
        disabled={busy !== null}
        className="w-full h-12 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
        style={{ background: "#FEE500", color: "#191919" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
          <path fill="#191919" d="M12 3C6.48 3 2 6.58 2 11c0 2.86 1.9 5.37 4.75 6.78-.2.74-.75 2.68-.86 3.1-.14.52.19.51.4.37.17-.11 2.65-1.8 3.72-2.53.64.09 1.3.14 1.99.14 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
        </svg>
        {busy === "kakao" ? "카카오로 이동 중..." : "카카오로 계속하기"}
      </button>
      <button
        type="button"
        onClick={() => go("google")}
        disabled={busy !== null}
        className="w-full h-12 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-2 border-2 border-line bg-chalk text-ink disabled:opacity-60"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
          <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.3.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
        </svg>
        {busy === "google" ? "구글로 이동 중..." : "Google로 계속하기"}
      </button>
      <div className="flex items-center gap-3 pt-2 text-xs text-ink-muted" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        또는 이메일로
        <span className="h-px flex-1 bg-line" />
      </div>
    </div>
  );
}
