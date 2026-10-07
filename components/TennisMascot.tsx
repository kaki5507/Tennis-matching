// components/TennisMascot.tsx
// 사이트 전체에서 재사용하는 테니스공 캐릭터. 이미지 대신 손으로 그린 SVG라
// 어떤 해상도/배경에서도 깨지지 않고 색상도 코드에서 바로 조절됩니다.
//
// 포즈(상황별로 골라 쓰세요)
//  wave   인사        홈, 환영
//  serve  서브        안내/소개
//  ready  라켓 준비    "곧 시작", 첫 방 만들기 유도
//  search 돋보기      조건에 맞는 결과가 없을 때, 기다리는 중
//  sleep  쿨쿨        비어 있음, 점검 중, 알림 없음
//  cheer  만세        축하, 성공, 대회
//  sad    시무룩      권한 없음/실패

export type MascotPose = "wave" | "serve" | "ready" | "search" | "sleep" | "cheer" | "sad";

interface Props {
  pose?: MascotPose;
  className?: string;
}

const LABEL: Record<MascotPose, string> = {
  wave: "인사하는 테니스공 캐릭터",
  serve: "서브하는 테니스공 캐릭터",
  ready: "라켓을 들고 준비하는 테니스공 캐릭터",
  search: "돋보기로 찾아보는 테니스공 캐릭터",
  sleep: "쿨쿨 자는 테니스공 캐릭터",
  cheer: "만세를 부르는 테니스공 캐릭터",
  sad: "시무룩한 테니스공 캐릭터",
};

const INK = "#16284f";
const FUR = "#B7C21E";
const BALL = "#D7DE23";
const CLAY = "#C1512F";
const CHALK = "#F7F9E4";

function Arm({ d, w = 13 }: { d: string; w?: number }) {
  return <path d={d} stroke={FUR} strokeWidth={w} strokeLinecap="round" fill="none" />;
}

function Racket({ transform }: { transform: string }) {
  return (
    <g transform={transform}>
      <path d="M 20 36 L 20 52" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <rect x="16" y="48" width="8" height="20" rx="4" fill={CLAY} />
      <ellipse cx="20" cy="17" rx="14.5" ry="18.5" fill={CHALK} fillOpacity="0.35" />
      <g clipPath="url(#mascot-racket-strings)" stroke={INK} strokeWidth="0.9" opacity="0.5">
        <path d="M 8 -2 V 40 M 14 -2 V 40 M 20 -2 V 40 M 26 -2 V 40 M 32 -2 V 40" />
        <path d="M 0 6 H 40 M 0 12 H 40 M 0 18 H 40 M 0 24 H 40 M 0 30 H 40" />
      </g>
      <ellipse cx="20" cy="17" rx="16" ry="20" fill="none" stroke={INK} strokeWidth="4" />
    </g>
  );
}

/** 반짝이 (4갈래 별) */
function Sparkle({ x, y, s = 1, fill, delay = 0 }: { x: number; y: number; s?: number; fill: string; delay?: number }) {
  const r = 8 * s;
  const k = 2.6 * s;
  return (
    <path
      className="mascot-twinkle"
      style={{ animationDelay: `${delay}s`, transformOrigin: `${x}px ${y}px` }}
      d={`M ${x} ${y - r} L ${x + k} ${y - k} L ${x + r} ${y} L ${x + k} ${y + k} L ${x} ${y + r} L ${x - k} ${y + k} L ${x - r} ${y} L ${x - k} ${y - k} Z`}
      fill={fill}
    />
  );
}

function Face({ pose }: { pose: MascotPose }) {
  const cheeks = (
    <>
      <ellipse cx="64" cy="143" rx="9" ry="5.5" fill="#ff7a6b" opacity="0.4" />
      <ellipse cx="136" cy="143" rx="9" ry="5.5" fill="#ff7a6b" opacity="0.4" />
    </>
  );
  // 크고 반짝이는 눈: 큰 타원 + 큰/작은 하이라이트 2개
  const dotEyes = (dx = 0, dy = 0) => (
    <>
      <ellipse cx={80 + dx} cy={124 + dy} rx="10" ry="12" fill={INK} />
      <ellipse cx={120 + dx} cy={124 + dy} rx="10" ry="12" fill={INK} />
      <circle cx={84 + dx} cy={118.5 + dy} r="4.4" fill="#fff" />
      <circle cx={124 + dx} cy={118.5 + dy} r="4.4" fill="#fff" />
      <circle cx={76.5 + dx} cy={129 + dy} r="2.2" fill="#fff" opacity="0.9" />
      <circle cx={116.5 + dx} cy={129 + dy} r="2.2" fill="#fff" opacity="0.9" />
    </>
  );

  switch (pose) {
    case "sad":
      return (
        <>
          <ellipse cx="80" cy="127" rx="10" ry="12" fill={INK} />
          <ellipse cx="120" cy="127" rx="10" ry="12" fill={INK} />
          <circle cx="84" cy="121" r="4.6" fill="#fff" />
          <circle cx="124" cy="121" r="4.6" fill="#fff" />
          <circle cx="77" cy="132" r="2.3" fill="#fff" opacity="0.9" />
          <circle cx="117" cy="132" r="2.3" fill="#fff" opacity="0.9" />
          <path d="M 68 108 Q 78 103 91 110 M 132 108 Q 122 103 109 110" stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M 88 150 Q 100 142 112 150" stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M 94 140 q 6 12 0 18" stroke="none" fill="none" />
          <path d="M 134 134 q 5 10 0 15 q -5 -5 0 -15 Z" fill="#7DB7E8" />
        </>
      );
    case "sleep":
      return (
        <>
          {/* 감은 눈 */}
          <path d="M 73 123 Q 82 131 91 123" stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M 109 123 Q 118 131 127 123" stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none" />
          {cheeks}
          <ellipse cx="100" cy="144" rx="5" ry="6" fill={INK} opacity="0.85" />
          {/* 콧방울 */}
          <ellipse className="mascot-bubble" cx="113" cy="140" rx="6" ry="6.5" fill="#fff" fillOpacity="0.55" stroke={INK} strokeOpacity="0.35" strokeWidth="1.5" />
        </>
      );
    case "search":
      return (
        <>
          {dotEyes(4, -1)}
          <path d="M 70 104 Q 80 99 92 104" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M 108 101 Q 120 95 130 101" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M 94 148 Q 102 144 110 148" stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none" />
          {cheeks}
        </>
      );
    case "cheer":
      return (
        <>
          <path d="M 73 125 Q 82 112 91 125" stroke={INK} strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <path d="M 109 125 Q 118 112 127 125" stroke={INK} strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <path d="M 84 136 Q 100 164 116 136 Z" fill={INK} />
          <path d="M 92 149 Q 100 142 108 149 Q 100 157 92 149 Z" fill={CLAY} opacity="0.85" />
          {cheeks}
        </>
      );
    case "ready":
      return (
        <>
          {dotEyes()}
          <path d="M 68 104 L 92 109 M 132 104 L 108 109" stroke={INK} strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M 88 146 Q 100 156 112 146" stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none" />
          {cheeks}
        </>
      );
    default: // wave, serve
      return (
        <>
          {dotEyes()}
          <path d="M 88 146 Q 100 158 112 146" stroke={INK} strokeWidth="4" strokeLinecap="round" fill="none" />
          {cheeks}
        </>
      );
  }
}

export default function TennisMascot({ pose = "wave", className }: Props) {
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label={LABEL[pose]}>
      <defs>
        <clipPath id="mascot-ball-clip">
          <circle cx="100" cy="120" r="61" />
        </clipPath>
        <clipPath id="mascot-racket-strings">
          <ellipse cx="20" cy="17" rx="14.5" ry="18.5" />
        </clipPath>
      </defs>

      {/* 그림자 */}
      <ellipse cx="100" cy="182" rx="46" ry="9" fill={INK} opacity="0.12" />

      {/* 팔 (몸통보다 먼저 그려서 뒤에 깔리게) */}
      {pose === "wave" && <Arm d="M 138 108 Q 168 92 176 62" w={14} />}
      {pose === "serve" && <Arm d="M 140 100 Q 172 78 168 40" w={14} />}
      {pose === "ready" && <Arm d="M 138 116 Q 160 112 166 92" w={13} />}
      {pose === "search" && <Arm d="M 138 112 Q 152 104 156 90" w={13} />}
      {pose === "sad" && <Arm d="M 62 130 Q 48 148 58 168" w={13} />}
      {pose === "sleep" && <Arm d="M 138 120 Q 158 132 160 154" w={13} />}
      {pose === "cheer" && (
        <>
          <Arm d="M 62 108 Q 32 92 26 58" w={14} />
          <Arm d="M 138 108 Q 168 92 174 58" w={14} />
        </>
      )}
      {/* 반대쪽 팔 (아래로 축 처진 기본 포즈) */}
      {pose !== "cheer" && pose !== "sad" && <Arm d="M 66 118 Q 44 128 40 152" />}
      {pose === "sad" && <Arm d="M 66 118 Q 44 128 40 152" />}

      {/* 도구 */}
      {pose === "serve" && <Racket transform="translate(146,6) rotate(18)" />}
      {pose === "ready" && <Racket transform="translate(150,34) rotate(24) scale(0.95)" />}
      {pose === "search" && (
        <g>
          <path d="M 158 86 L 170 70" stroke={INK} strokeWidth="5" strokeLinecap="round" />
          <circle cx="178" cy="58" r="17" fill={CHALK} fillOpacity="0.55" stroke={INK} strokeWidth="5" />
          <path d="M 169 52 Q 172 46 179 45" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.9" />
        </g>
      )}

      {/* 몸통 (테니스공) */}
      <circle cx="100" cy="120" r="62" fill={BALL} />
      <g clipPath="url(#mascot-ball-clip)">
        <path d="M 36 70 Q 92 110 36 170" stroke={CHALK} strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M 164 70 Q 108 110 164 170" stroke={CHALK} strokeWidth="5" fill="none" strokeLinecap="round" />
        {/* 헤어밴드 */}
        <path d="M 30 100 Q 100 70 170 100 L 170 114 Q 100 84 30 114 Z" fill={CLAY} />
        <path d="M 30 111 Q 100 81 170 111 L 170 114 Q 100 84 30 114 Z" fill="#9E3F22" opacity="0.55" />
        <path d="M 30 102.5 Q 100 72.5 170 102.5" stroke="#E2815F" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
        {/* 입체감: 왼쪽 위 하이라이트 */}
        <ellipse cx="72" cy="86" rx="14" ry="7" fill="#fff" opacity="0.28" transform="rotate(-28 72 86)" />
      </g>
      <circle cx="100" cy="120" r="62" fill="none" stroke={FUR} strokeWidth="3" />

      <Face pose={pose} />

      {/* 다리 */}
      <path d="M 82 176 Q 78 192 66 196" stroke={FUR} strokeWidth="12" strokeLinecap="round" fill="none" />
      <path d="M 118 176 Q 124 192 136 194" stroke={FUR} strokeWidth="12" strokeLinecap="round" fill="none" />

      {/* 장식 */}
      {pose === "sleep" && (
        <g fill={INK} fontWeight="800" fontFamily="inherit" opacity="0.8">
          <text className="mascot-zzz" x="146" y="86" fontSize="24" style={{ animationDelay: "0s" }}>Z</text>
          <text className="mascot-zzz" x="162" y="62" fontSize="18" style={{ animationDelay: "0.6s" }}>z</text>
          <text className="mascot-zzz" x="174" y="42" fontSize="13" style={{ animationDelay: "1.2s" }}>z</text>
        </g>
      )}
      {pose === "cheer" && (
        <>
          <Sparkle x={44} y={34} s={1.1} fill={CLAY} />
          <Sparkle x={156} y={24} s={1.3} fill={BALL} delay={0.4} />
          <Sparkle x={100} y={14} s={0.8} fill={INK} delay={0.8} />
          <Sparkle x={14} y={96} s={0.7} fill={BALL} delay={1.1} />
          <Sparkle x={186} y={100} s={0.8} fill={CLAY} delay={0.2} />
        </>
      )}
    </svg>
  );
}
