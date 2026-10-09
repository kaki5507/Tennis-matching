// lib/ntrpLevels.ts
// 자기신고 구력(NTRP) 선택지. 화면(프로필)과 서버(허위 구력 검사, 방 참여 제한)가 같은 표를 씁니다.
// 초보는 구력만으로 실력 차이가 크기 때문에, 0.5부터 "할 수 있는 것" 기준으로 세밀하게 나눴어요.

export interface NtrpOption {
  label: string; // DB에 저장되는 값 (예: "NTRP 1.5")
  value: number;
  name: string; // 짧은 이름
  short: string; // 선택 목록에 같이 보이는 한 줄
  desc: string; // 선택 후 보여주는 자세한 설명
}

export const NTRP_OPTIONS: NtrpOption[] = [
  { label: "NTRP 0.5", value: 0.5, name: "입문", short: "라켓 처음 잡아봄", desc: "라켓을 처음 잡아봤어요. 공 맞히는 건 아직 시작 단계예요. (보통 한 달 미만)" },
  { label: "NTRP 0.75", value: 0.75, name: "왕초보", short: "공을 거의 못 맞힘", desc: "공을 거의 못 맞혀요. 맞혀도 어디로 갈지 몰라요. (보통 1~2개월)" },
  { label: "NTRP 1.0", value: 1.0, name: "초보", short: "공 가끔 맞힘 · 서브 못 넣음", desc: "공을 가끔 맞혀요. 서브는 아직 코트에 못 넣고 랠리는 이어지기 어려워요. (보통 2~3개월)" },
  { label: "NTRP 1.25", value: 1.25, name: "초보+", short: "포핸드만 겨우 가능", desc: "포핸드는 겨우 보내고 백핸드는 못 쳐요. 서브는 아직 어려워요. (보통 3~4개월)" },
  { label: "NTRP 1.5", value: 1.5, name: "초보++", short: "백핸드 겨우 · 서브 가끔", desc: "포핸드는 보내고 백핸드도 겨우 해요. 서브는 가끔 들어가요. 랠리는 몇 번 이어져요. (보통 4~6개월)" },
  { label: "NTRP 1.75", value: 1.75, name: "초급", short: "포·백 가능 · 서브 불안", desc: "포핸드·백핸드 모두 보내지만 방향은 마음대로 안 돼요. 서브는 들어갈 때도 안 들어갈 때도 있어요. (보통 6개월 안팎)" },
  { label: "NTRP 2.0", value: 2.0, name: "초중급", short: "꾸준한 랠리 · 서브 넣음", desc: "초보 탈출! 포·백핸드로 꾸준히 랠리하고 서브도 넣어요. 방향 조절은 아직 서툴러요. (보통 6개월~1년)" },
  { label: "NTRP 2.5", value: 2.5, name: "중급 입문", short: "방향 조절 시작 · 발리 서툼", desc: "방향을 조절하기 시작해요. 발리·스매시는 아직 서툴러요. (보통 1년 내외)" },
  { label: "NTRP 3.0", value: 3.0, name: "중급", short: "발리 가능 · 단식 가능", desc: "중간 속도 공을 꾸준히 보내고 방향도 어느 정도 조절해요. 발리가 가능하고 단식도 칠 수 있어요. (보통 1~2년)" },
  { label: "NTRP 3.5", value: 3.5, name: "중상급", short: "깊이 조절 · 스매시 가능", desc: "공의 방향과 깊이를 조절해요. 발리·스매시도 자신 있게 써요." },
  { label: "NTRP 4.0", value: 4.0, name: "상급", short: "다양한 구질 · 실수 적음", desc: "스핀·파워를 섞어 치고 실수가 적어요. 전술을 생각하며 쳐요." },
  { label: "NTRP 4.5", value: 4.5, name: "고수 (4.5 이상)", short: "대회 입상권", desc: "파워와 전술을 모두 갖췄어요. 대회에서 입상하는 수준이에요." },
];

/** 예전에 쓰던 "테린이" 값도 인식 (NTRP 1.0으로 취급) */
const LEGACY: Record<string, number> = { 테린이: 1.0 };

export function ntrpFromLabel(label: string | null | undefined): number | null {
  if (!label) return null;
  if (label in LEGACY) return LEGACY[label];
  return NTRP_OPTIONS.find((o) => o.label === label)?.value ?? null;
}

/** 저장된 값을 현재 선택지 중 하나로 정리 (예: "테린이" → "NTRP 1.0"). 알 수 없으면 NTRP 1.0 */
export function normalizeLevelLabel(label: string | null | undefined): string {
  const v = ntrpFromLabel(label);
  if (v === null) return NTRP_OPTIONS[1].label;
  return NTRP_OPTIONS.reduce((a, b) => (Math.abs(b.value - v) < Math.abs(a.value - v) ? b : a)).label;
}

export function nearestNtrpLabel(score: number): string {
  return NTRP_OPTIONS.reduce((a, b) => (Math.abs(b.value - score) < Math.abs(a.value - score) ? b : a)).label;
}
