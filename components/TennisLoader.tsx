// components/TennisLoader.tsx
// 화면/데이터를 불러오는 동안 보여주는 로딩 표시. 테니스공(마스코트)이
// 라켓 위에서 통통 튀는 애니메이션으로, 평범한 스피너 대신 브랜드 캐릭터를
// 재사용합니다. size="full"은 페이지 전체 로딩용, "inline"은 좁은 공간용.

interface Props {
  label?: string;
  size?: "full" | "inline";
}

export default function TennisLoader({ label = "불러오는 중...", size = "full" }: Props) {
  const scale = size === "full" ? 1 : 0.6;

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <div className="relative" style={{ width: 96 * scale, height: 96 * scale }}>
        {/* 튕기는 공 (마스코트 얼굴 재사용) */}
        <div
          className="absolute left-1/2 top-0"
          style={{
            width: 34 * scale,
            height: 34 * scale,
            marginLeft: -17 * scale,
            animation: "tennis-ball-bounce 0.95s cubic-bezier(0.45,0,0.55,1) infinite",
          }}
        >
          <svg viewBox="0 0 60 60" className="w-full h-full">
            <circle cx="30" cy="30" r="26" fill="var(--ball)" stroke="#B7C21E" strokeWidth="2" />
            <path d="M 10 16 Q 28 30 10 44" stroke="#F7F9E4" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 50 16 Q 32 30 50 44" stroke="#F7F9E4" strokeWidth="3" fill="none" strokeLinecap="round" />
            <circle cx="22" cy="28" r="2.6" fill="var(--court)" />
            <circle cx="38" cy="28" r="2.6" fill="var(--court)" />
            <path d="M 22 38 Q 30 44 38 38" stroke="var(--court)" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          </svg>
        </div>

        {/* 바닥 그림자 (공 높이에 맞춰 늘었다 줄었다) */}
        <div
          className="absolute rounded-full bg-[var(--court)]"
          style={{
            width: 30 * scale,
            height: 7 * scale,
            left: "50%",
            bottom: 6 * scale,
            marginLeft: -15 * scale,
            animation: "tennis-ball-shadow 0.95s cubic-bezier(0.45,0,0.55,1) infinite",
          }}
        />

        {/* 라켓 (닿는 타이밍에 살짝 흔들림) */}
        <svg
          viewBox="0 0 100 60"
          className="absolute left-1/2 bottom-0"
          style={{
            width: 100 * scale,
            height: 60 * scale,
            marginLeft: -50 * scale,
            transformOrigin: "50% 90%",
            animation: "tennis-racket-flick 0.95s cubic-bezier(0.45,0,0.55,1) infinite",
          }}
        >
          <ellipse cx="50" cy="18" rx="30" ry="16" fill="none" stroke="var(--court)" strokeWidth="5" />
          <path
            d="M14 12 L86 24 M14 24 L86 12 M32 3 L32 33 M50 2 L50 34 M68 3 L68 33"
            stroke="var(--court)"
            strokeWidth="1.4"
            opacity="0.5"
          />
          <rect x="45" y="34" width="10" height="24" rx="4" fill="var(--clay)" />
        </svg>
      </div>

      {label && (
        <p className="text-sm font-medium" style={{ color: "var(--court)" }}>
          {label}
        </p>
      )}
    </div>
  );
}
