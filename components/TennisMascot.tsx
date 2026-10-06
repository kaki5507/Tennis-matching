// components/TennisMascot.tsx
// 사이트 전체에서 재사용하는 테니스공 캐릭터. 이미지 생성 대신 손으로 그린
// SVG라, 어떤 해상도/배경에서도 깨지지 않고 색상도 코드에서 바로 조절됩니다.

interface Props {
  pose?: "wave" | "sad" | "serve";
  className?: string;
}

export default function TennisMascot({ pose = "wave", className }: Props) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label={
        pose === "wave" ? "인사하는 테니스공 캐릭터" : pose === "sad" ? "시무룩한 테니스공 캐릭터" : "서브하는 테니스공 캐릭터"
      }
    >
      {/* 그림자 */}
      <ellipse cx="100" cy="182" rx="46" ry="9" fill="#2F4A33" opacity="0.12" />

      {/* 팔 (몸통보다 먼저 그려서 뒤에 깔리게) */}
      {pose === "wave" && (
        <path
          d="M 138 108 Q 168 92 176 62"
          stroke="#B7C21E"
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
        />
      )}
      {pose === "serve" && (
        <path
          d="M 140 100 Q 172 78 168 40"
          stroke="#B7C21E"
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
        />
      )}
      {pose === "sad" && (
        <path
          d="M 62 130 Q 48 148 58 168"
          stroke="#B7C21E"
          strokeWidth="13"
          strokeLinecap="round"
          fill="none"
        />
      )}
      {/* 반대쪽 팔 (아래로 축 처진 기본 포즈) */}
      <path
        d="M 66 118 Q 44 128 40 152"
        stroke="#B7C21E"
        strokeWidth="13"
        strokeLinecap="round"
        fill="none"
      />

      {/* 라켓 (서브 포즈일 때만) */}
      {pose === "serve" && (
        <g transform="translate(146,6) rotate(18)">
          <defs>
            <clipPath id="mascot-racket-strings">
              <ellipse cx="20" cy="17" rx="14.5" ry="18.5" />
            </clipPath>
          </defs>
          <path d="M 20 36 L 20 52" stroke="#2F4A33" strokeWidth="4" strokeLinecap="round" />
          <rect x="16" y="48" width="8" height="20" rx="4" fill="#C1512F" />
          <ellipse cx="20" cy="17" rx="14.5" ry="18.5" fill="#F7F9E4" fillOpacity="0.35" />
          <g clipPath="url(#mascot-racket-strings)" stroke="#2F4A33" strokeWidth="0.9" opacity="0.5">
            <path d="M 8 -2 V 40 M 14 -2 V 40 M 20 -2 V 40 M 26 -2 V 40 M 32 -2 V 40" />
            <path d="M 0 6 H 40 M 0 12 H 40 M 0 18 H 40 M 0 24 H 40 M 0 30 H 40" />
          </g>
          <ellipse cx="20" cy="17" rx="16" ry="20" fill="none" stroke="#2F4A33" strokeWidth="4" />
        </g>
      )}

      {/* 몸통 (테니스공) */}
      <defs>
        {/* 공 안쪽으로만 그리도록 자르는 영역: 솔기/머리띠가 윤곽 밖으로 튀어나오지 않게 */}
        <clipPath id="mascot-ball-clip">
          <circle cx="100" cy="120" r="61" />
        </clipPath>
      </defs>
      <circle cx="100" cy="120" r="62" fill="#D7DE23" />

      <g clipPath="url(#mascot-ball-clip)">
        {/* 테니스공 특유의 곡선 솔기 (양끝이 공 밖까지 이어진 뒤 잘려서 윤곽에 딱 맞음) */}
        <path d="M 36 70 Q 92 110 36 170" stroke="#F7F9E4" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M 164 70 Q 108 110 164 170" stroke="#F7F9E4" strokeWidth="5" fill="none" strokeLinecap="round" />

        {/* 헤어밴드: 공의 곡면을 따라 감기도록 곡선, 양끝은 공 밖으로 길게 뺀 뒤 잘림 */}
        <path d="M 30 100 Q 100 70 170 100 L 170 114 Q 100 84 30 114 Z" fill="#C1512F" />
        {/* 밴드 아래쪽 그늘 + 윗면 하이라이트로 입체감 */}
        <path d="M 30 111 Q 100 81 170 111 L 170 114 Q 100 84 30 114 Z" fill="#9E3F22" opacity="0.55" />
        <path d="M 30 102.5 Q 100 72.5 170 102.5" stroke="#E2815F" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
      </g>

      {/* 공 윤곽선 (맨 위에 다시 그려 안쪽 선들의 끝을 깔끔하게 마감) */}
      <circle cx="100" cy="120" r="62" fill="none" stroke="#B7C21E" strokeWidth="3" />

      {/* 얼굴 */}
      {pose === "sad" ? (
        <>
          <circle cx="82" cy="122" r="5" fill="#2F4A33" />
          <circle cx="118" cy="122" r="5" fill="#2F4A33" />
          <path d="M 84 146 Q 100 138 116 146" stroke="#2F4A33" strokeWidth="4" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="82" cy="120" r="5" fill="#2F4A33" />
          <circle cx="118" cy="120" r="5" fill="#2F4A33" />
          <path d="M 82 138 Q 100 152 118 138" stroke="#2F4A33" strokeWidth="4" strokeLinecap="round" fill="none" />
        </>
      )}

      {/* 다리 */}
      <path d="M 82 176 Q 78 192 66 196" stroke="#B7C21E" strokeWidth="12" strokeLinecap="round" fill="none" />
      <path d="M 118 176 Q 124 192 136 194" stroke="#B7C21E" strokeWidth="12" strokeLinecap="round" fill="none" />
    </svg>
  );
}
