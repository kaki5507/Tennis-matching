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
          className="absolute left-1/2"
          style={{
            top: 12 * scale,
            width: 34 * scale,
            height: 34 * scale,
            marginLeft: -17 * scale,
            animation: "tennis-ball-bounce 0.95s cubic-bezier(0.45,0,0.55,1) infinite",
          }}
        >
          <svg viewBox="0 0 60 60" className="w-full h-full">
            <defs>
              <clipPath id="loader-ball-clip">
                <circle cx="30" cy="30" r="25" />
              </clipPath>
            </defs>
            <circle cx="30" cy="30" r="26" fill="var(--ball)" />
            <g clipPath="url(#loader-ball-clip)">
              {/* 솔기 (공 밖까지 그린 뒤 잘라서 윤곽에 딱 맞춤) */}
              <path d="M 4 10 Q 26 30 4 50" stroke="#F7F9E4" strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M 56 10 Q 34 30 56 50" stroke="#F7F9E4" strokeWidth="3" fill="none" strokeLinecap="round" />
              {/* 마스코트와 같은 헤어밴드 */}
              <path d="M 0 21 Q 30 8 60 21 L 60 27 Q 30 14 0 27 Z" fill="var(--clay)" />
              <path d="M 0 25 Q 30 12 60 25 L 60 27 Q 30 14 0 27 Z" fill="#9E3F22" opacity="0.55" />
            </g>
            <circle cx="30" cy="30" r="26" fill="none" stroke="#B7C21E" strokeWidth="2" />
            <circle cx="22" cy="33" r="2.4" fill="var(--court)" />
            <circle cx="38" cy="33" r="2.4" fill="var(--court)" />
            <path d="M 23 41 Q 30 46 37 41" stroke="var(--court)" strokeWidth="2.2" strokeLinecap="round" fill="none" />
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

        {/* 라켓: 위에서 비스듬히 본 모습 (타원 헤드 + 스트링 + 목 + 그립) */}
        <svg
          viewBox="0 0 120 72"
          className="absolute left-1/2 bottom-0"
          style={{
            width: 100 * scale,
            height: 60 * scale,
            marginLeft: -50 * scale,
            transformOrigin: "50% 40%",
            animation: "tennis-racket-flick 0.95s cubic-bezier(0.45,0,0.55,1) infinite",
          }}
        >
          <defs>
            <clipPath id="loader-racket-strings">
              <ellipse cx="60" cy="24" rx="33" ry="12.5" />
            </clipPath>
          </defs>
          {/* 그립 + 손잡이 끝 */}
          <rect x="54" y="44" width="12" height="24" rx="5" fill="var(--clay)" />
          <path d="M 54 50 L 66 54 M 54 56 L 66 60 M 54 62 L 66 66" stroke="#E2815F" strokeWidth="1.6" opacity="0.8" />
          <rect x="52.5" y="64" width="15" height="5" rx="2.5" fill="var(--court)" />
          {/* 목 (헤드와 손잡이를 잇는 Y자) */}
          <path d="M 47 35 Q 58 40 58 46 M 73 35 Q 62 40 62 46" stroke="var(--court)" strokeWidth="3.2" fill="none" strokeLinecap="round" />
          {/* 스트링 면 */}
          <ellipse cx="60" cy="24" rx="35" ry="14" fill="#F7F9E4" fillOpacity="0.55" />
          <g clipPath="url(#loader-racket-strings)" stroke="var(--court)" strokeWidth="1" opacity="0.5">
            <path d="M 34 8 V 40 M 42 8 V 40 M 50 8 V 40 M 60 8 V 40 M 70 8 V 40 M 78 8 V 40 M 86 8 V 40" />
            <path d="M 20 14 H 100 M 20 19 H 100 M 20 24 H 100 M 20 29 H 100 M 20 34 H 100" />
          </g>
          {/* 프레임 (두꺼운 바깥선 + 안쪽 하이라이트) */}
          <ellipse cx="60" cy="24" rx="37" ry="15.5" fill="none" stroke="var(--court)" strokeWidth="4.5" />
          <ellipse cx="60" cy="24" rx="37" ry="15.5" fill="none" stroke="#6E9A72" strokeWidth="1" opacity="0.6" />
        </svg>
      </div>

      {label && (
        <p className="text-sm font-medium text-court">
          {label}
        </p>
      )}
    </div>
  );
}
