// components/HomeSections.tsx
// 메인 페이지의 정적 안내 섹션: 이용 방법 / 기능 소개 / 하단 CTA / 푸터.

import Link from "next/link";
import TennisMascot from "@/components/TennisMascot";
import { BUCHEON_COURTS } from "@/lib/bucheonCourts";

const BUCHEON_LIST_URL =
  "https://reserv.bucheon.go.kr/site/main/lending/lendingList?lending_inst_nm=tennis&inst_cate=01";
const bucheonDetailUrl = (seq: string) =>
  `https://reserv.bucheon.go.kr/site/main/lending/lendingDetail?lending_info_seq=${seq}&cp=1&pageSize=16&listType=list&inst_cate=01&lending_inst_nm=tennis`;

const STEPS = [
  { title: "가입하고 프로필 만들기", desc: "구력과 선호 위치를 입력하면 나에게 맞는 방이 보여요." },
  { title: "방 찾기 · 만들기", desc: "레벨·성별·참가비 조건을 보고 신청하거나 직접 방을 열어요." },
  { title: "코트에서 즐기기", desc: "호스트가 수락하면 지도로 장소를 확인하고 만나요." },
  { title: "블라인드 평가", desc: "경기 후 서로를 익명으로 평가해 매너 온도가 쌓여요." },
];

const FEATURES = [
  { emoji: "🏆", title: "대회 · 자동 대진표", desc: "단식·복식 대회를 열면 시드 배정과 대진표를 자동으로 만들어줘요." },
  { emoji: "👥", title: "복식 파트너", desc: "파트너를 초대하고, 두 사람 평균 레벨로 출전 조건을 맞춰요." },
  { emoji: "🔔", title: "똑똑한 알림", desc: "내 방 신청·수락, 입금 확인, 대회 소식을 푸시로 받아요." },
  { emoji: "🏟️", title: "코트 예약 알림", desc: "부천 테니스장 취소표가 나오면 바로 알려드려요." },
  { emoji: "🥇", title: "트로피 진열장", desc: "우승·준우승 기록이 프로필에 트로피로 하나씩 쌓여요." },
  { emoji: "🛡️", title: "신뢰할 수 있는 매칭", desc: "본인인증과 허위 구력 자동 점검으로 안심하고 만나요." },
];

export default function HomeSections() {
  return (
    <>
      {/* 이용 방법 */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="font-display text-2xl md:text-3xl text-center text-court mb-10">이렇게 이용해요</h2>
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className="surface rounded-2xl p-6 text-center">
              <div className="chip-on w-10 h-10 mx-auto mb-4 rounded-full flex items-center justify-center font-display text-lg">
                {i + 1}
              </div>
              <h3 className="font-display text-lg mb-2 text-court">{s.title}</h3>
              <p className="text-sm text-ink-muted">{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 기능 소개 */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="font-display text-2xl md:text-3xl text-center text-court mb-2">테니스를 더 재미있게</h2>
        <p className="text-sm text-center mb-10 text-ink-muted">매칭부터 대회, 기록까지 한 곳에서.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="surface rounded-2xl p-6">
              <div className="text-3xl mb-3">{f.emoji}</div>
              <h3 className="font-display text-lg mb-1.5 text-court">{f.title}</h3>
              <p className="text-sm text-ink-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 부천 테니스장 예약 바로가기 (부천시 공공서비스예약 사이트로 연결) */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-end justify-between mb-6 gap-3">
          <div>
            <h2 className="font-display text-2xl md:text-3xl text-court">🏟️ 부천 테니스장 예약 바로가기</h2>
            <p className="text-sm mt-1 text-ink-muted">부천시 공공서비스예약 사이트가 새 창으로 열려요.</p>
          </div>
          <a
            href={BUCHEON_LIST_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold underline text-court shrink-0"
          >
            전체 목록 보기 ↗
          </a>
        </div>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {BUCHEON_COURTS.map((c) => (
            <li key={c.facilityId}>
              <a
                href={bucheonDetailUrl(c.facilityId)}
                target="_blank"
                rel="noopener noreferrer"
                className="card-link surface rounded-xl px-4 py-3.5 flex items-center justify-between gap-3"
              >
                <span className="font-medium text-ink truncate">{c.name}</span>
                <span className="flex items-center gap-1.5 shrink-0">
                  {c.indoor && <span className="chip-on text-[10px] font-bold px-2 py-0.5 rounded-full">실내</span>}
                  <span className="text-court text-sm" aria-hidden="true">↗</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* 하단 CTA */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="hero-court rounded-3xl px-6 py-10 md:py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h2 className="font-display text-2xl md:text-3xl text-chalk">오늘 칠 상대, 지금 찾아볼까요?</h2>
            <p className="text-sm mt-2 text-chalk opacity-80">가입은 1분이면 끝나요.</p>
            <div className="flex gap-3 mt-5 justify-center md:justify-start">
              <Link href="/signup" className="btn-clay px-6 py-2.5 rounded-full text-sm font-bold">
                무료로 시작하기
              </Link>
              <Link href="/matches" className="chip-off-on-court px-6 py-2.5 rounded-full text-sm font-bold">
                방 둘러보기
              </Link>
            </div>
          </div>
          <TennisMascot pose="serve" className="w-32 h-32 md:w-40 md:h-40 shrink-0" />
        </div>
      </section>

      {/* 푸터 */}
      <footer className="border-t border-line mt-8">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-muted">
          <span>🎾 테니스매칭 · 함께 치는 즐거움</span>
          <nav className="flex gap-4">
            <Link href="/terms" className="underline">이용약관</Link>
            <Link href="/privacy" className="underline">개인정보처리방침</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
