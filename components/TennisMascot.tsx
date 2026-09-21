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
        <g transform="translate(150,10) rotate(18)">
          <ellipse cx="20" cy="16" rx="17" ry="21" fill="none" stroke="#2F4A33" strokeWidth="5" />
          <line x1="20" y1="36" x2="20" y2="66" stroke="#2F4A33" strokeWidth="6" strokeLinecap="round" />
          <path d="M6 8 L34 24 M6 24 L34 8 M13 -2 L13 34 M27 -2 L27 34" stroke="#2F4A33" strokeWidth="1.6" opacity="0.55" />
        </g>
      )}

      {/* 몸통 (테니스공) */}
      <circle cx="100" cy="120" r="62" fill="#D7DE23" stroke="#B7C21E" strokeWidth="3" />

      {/* 테니스공 특유의 곡선 솔기 */}
      <path
        d="M 46 88 Q 90 108 46 152"
        stroke="#F7F9E4"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 154 88 Q 110 108 154 152"
        stroke="#F7F9E4"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />

      {/* 헤어밴드 */}
      <path d="M 44 96 Q 100 74 156 96 L 156 106 Q 100 86 44 106 Z" fill="#C1512F" />

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
