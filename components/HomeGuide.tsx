"use client";

// components/HomeGuide.tsx
// 메인 하단의 "이렇게 이용해요 + 기능 소개"를 하나로 합친 섹션.
// 하드코트 / 잔디 / 클레이 세 가지 코트 표면이 탭이 되어, 한 번에 하나만 펼쳐 보여줍니다.

import { useState } from "react";
import TennisMascot from "@/components/TennisMascot";

const TABS = [
  {
    key: "hard",
    label: "하드코트",
    sub: "매칭",
    panel: "panel-hard",
    mascot: "ready" as const,
    items: [
      { e: "📝", t: "가입 · 프로필", d: "구력과 선호 위치만 입력" },
      { e: "🔍", t: "방 찾기 · 만들기", d: "레벨·성별·참가비로 골라요" },
      { e: "🤝", t: "코트에서 만나기", d: "수락되면 지도로 장소 확인" },
      { e: "🌡️", t: "매너 온도", d: "경기 후 블라인드 평가" },
    ],
  },
  {
    key: "grass",
    label: "잔디",
    sub: "대회 · 기록",
    panel: "panel-grass",
    mascot: "cheer" as const,
    items: [
      { e: "🏆", t: "자동 대진표", d: "시드 배정까지 자동으로" },
      { e: "👥", t: "복식 파트너", d: "초대하고 평균 레벨로 출전" },
      { e: "🥇", t: "트로피 진열장", d: "우승 기록이 프로필에 쌓여요" },
      { e: "📋", t: "기록실", d: "내 경기 결과를 한눈에" },
    ],
  },
  {
    key: "clay",
    label: "클레이",
    sub: "코트 · 알림",
    panel: "panel-clay",
    mascot: "search" as const,
    items: [
      { e: "🎾", t: "내일 빈 코트", d: "부천 코트 가능 시간 조회" },
      { e: "🔔", t: "예약 알림", d: "취소표가 나오면 바로 알림" },
      { e: "💬", t: "똑똑한 알림", d: "신청·수락·입금·대회 소식" },
      { e: "🛡️", t: "믿을 수 있는 매칭", d: "허위 구력 자동 점검" },
    ],
  },
];

export default function HomeGuide() {
  const [active, setActive] = useState(0);
  const tab = TABS[active];

  return (
    <section className="max-w-6xl mx-auto px-4 py-8" aria-label="이용 안내">
      <h2 className="font-display text-xl md:text-2xl text-court mb-3">테니스매칭, 이렇게 써요</h2>

      <div className="rounded-2xl overflow-hidden surface">
        <div className="grid grid-cols-3" role="tablist" aria-label="코트 표면별 기능">
          {TABS.map((t, i) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={`py-2.5 text-center ${i === active ? t.panel : "chip-off"}`}
            >
              <span className="block text-sm font-extrabold">{t.label}</span>
              <span className={`block text-[11px] ${i === active ? "text-white/85" : "text-ink-muted"}`}>{t.sub}</span>
            </button>
          ))}
        </div>

        <div className={`${tab.panel} panel-lines relative p-4 pt-5 md:p-6`} role="tabpanel">
          <TennisMascot pose={tab.mascot} className="absolute right-3 top-3 w-14 h-auto opacity-95 hidden sm:block" />
          <ul className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {tab.items.map((it) => (
              <li key={it.t} className="rounded-xl bg-white/15 px-3 py-2.5 backdrop-blur-[1px]">
                <div className="flex items-center gap-1.5 font-extrabold text-sm">
                  <span aria-hidden>{it.e}</span>
                  <span className="truncate">{it.t}</span>
                </div>
                <p className="text-[11px] text-white/90 leading-snug mt-0.5">{it.d}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
