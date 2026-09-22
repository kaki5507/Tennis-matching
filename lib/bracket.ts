// lib/bracket.ts
// 싱글 엘리미네이션 대진표 생성 로직. DB와 무관한 순수 함수라 따로 테스트할 수 있습니다.

export interface BracketMatchSeed {
  round: number;
  position: number;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  isBye: boolean;
  isThirdPlace: boolean;
}

/** n 이상인 가장 작은 2의 거듭제곱 (최소 2) */
export function nextPowerOfTwo(n: number): number {
  let size = 2;
  while (size < n) size *= 2;
  return size;
}

/**
 * 표준 시드 배치 순서. size=8이면 [1, 8, 4, 5, 2, 7, 3, 6]
 * 붙어있는 두 자리끼리 1라운드에서 만나고, 1번과 2번 시드는 결승에서야 만나게 됩니다.
 */
export function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const nextSize = order.length * 2;
    order = order.flatMap((seed) => [seed, nextSize + 1 - seed]);
  }
  return order;
}

/**
 * 시드 순서대로 정렬된 참가자 ID 목록을 받아 전체 대진표를 만듭니다.
 * - 빈 자리(부전승)는 상위 시드와 짝지어지고, 해당 경기는 바로 승자가 확정되어 2라운드로 올라갑니다.
 * - 참가자가 4명 이상이면 3·4위전 경기도 함께 만듭니다.
 */
export function buildBracket(seededIds: string[]): BracketMatchSeed[] {
  const n = seededIds.length;
  if (n < 2) throw new Error("대진표를 만들려면 참가자가 2명 이상 필요합니다.");

  const size = nextPowerOfTwo(n);
  const totalRounds = Math.log2(size);
  const slots = seedOrder(size).map((seed) => (seed <= n ? seededIds[seed - 1] : null));

  const grid: BracketMatchSeed[][] = [];
  for (let round = 1; round <= totalRounds; round++) {
    const count = size / 2 ** round;
    grid.push(
      Array.from({ length: count }, (_, position) => ({
        round,
        position,
        player1Id: null,
        player2Id: null,
        winnerId: null,
        isBye: false,
        isThirdPlace: false,
      }))
    );
  }

  // 1라운드 채우기 + 부전승 처리
  grid[0].forEach((match, position) => {
    match.player1Id = slots[position * 2];
    match.player2Id = slots[position * 2 + 1];
    if (!match.player1Id || !match.player2Id) {
      match.isBye = true;
      match.winnerId = match.player1Id ?? match.player2Id;
    }
  });

  // 부전승 승자를 2라운드 자리로 올리기
  if (totalRounds >= 2) {
    grid[0].forEach((match) => {
      if (!match.isBye || !match.winnerId) return;
      const next = grid[1][Math.floor(match.position / 2)];
      if (match.position % 2 === 0) next.player1Id = match.winnerId;
      else next.player2Id = match.winnerId;
    });
  }

  const all = grid.flat();

  // 3·4위전은 준결승 두 경기에 모두 실제 패자가 나올 때만 의미가 있습니다.
  // 3명이면 준결승 한쪽이 부전승이라 3·4위전 없이 남은 준결승 패자가 곧바로 3위가 됩니다.
  if (totalRounds >= 2 && n >= 4) {
    all.push({
      round: totalRounds,
      position: 0,
      player1Id: null,
      player2Id: null,
      winnerId: null,
      isBye: false,
      isThirdPlace: true,
    });
  }

  return all;
}

/** 라운드 이름 (결승, 4강, 8강, 16강 ...) */
export function roundName(round: number, totalRounds: number): string {
  const players = 2 ** (totalRounds - round + 1);
  return players === 2 ? "결승" : `${players}강`;
}
