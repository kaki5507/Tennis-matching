// app/loading.tsx
// Next.js App Router가 페이지(서버 컴포넌트) 데이터를 불러오는 동안
// 자동으로 보여주는 화면입니다. 더 구체적인 라우트에 자체 loading.tsx가
// 없으면 이 화면이 fallback으로 쓰입니다.

import TennisLoader from "@/components/TennisLoader";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--mist)" }}>
      <TennisLoader label="코트로 이동 중..." />
    </div>
  );
}
