"use client";

// components/LevelFilterToggle.tsx
// "내 레벨에 맞는 방만 보기" 토글. 서버 화면은 로그인 정보를 알 수 없어서,
// 브라우저에서 내 점수를 확인한 뒤 ?lv=2.5 처럼 점수를 주소에 실어 보냅니다.
// (주소의 점수는 목록 필터용일 뿐이며 참가 가능 여부는 서버가 따로 검사합니다)

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProfile } from "@/app/actions/profile";
import { getAccessToken } from "@/lib/authToken";

export default function LevelFilterToggle({ active, baseParams }: { active: boolean; baseParams: Record<string, string> }) {
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const token = await getAccessToken();
      if (!token) return;
      const res = await getProfile(token);
      if (!alive || !res.success || !res.user) return;
      // 평가 3회 미만(미검증)이면 기본값 2.0 (방 만들기 화면과 같은 규칙)
      const raw = res.user.ntrpCount >= 3 && res.user.ntrpScore ? res.user.ntrpScore : 2.0;
      setScore(Math.round(raw * 2) / 2);
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (score === null) return null;

  const params = new URLSearchParams(baseParams);
  if (!active) params.set("lv", score.toFixed(1));
  const qs = params.toString();

  return (
    <Link
      href={qs ? `/matches?${qs}` : "/matches"}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${
        active ? "chip-on border-transparent" : "surface border-line chip-off-court"
      }`}
      aria-pressed={active}
    >
      🎯 내 레벨({score.toFixed(1)})에 맞는 방만 보기
    </Link>
  );
}
