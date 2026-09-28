// lib/tournamentData.ts
// 대회 관련 서버 액션들이 함께 쓰는 DB 헬퍼.
//
// ⚠️ 이 파일에는 "use server"를 붙이지 마세요. "use server" 파일의 export 함수는 전부
// 브라우저에서 호출 가능한 공개 API가 되는데, 여기 함수들은 권한 검사를 하지 않는 내부용입니다.
// 서버 액션 파일(app/actions/*)이 검사를 마친 뒤에만 불러 써야 합니다.

import { PrismaClient, Prisma } from "@prisma/client";
import type { PlayerInfo, TournamentRule } from "@/lib/tournamentRules";
import { teamLabel, teamAvgNtrp } from "@/lib/tournamentRules";

// Next.js 개발 서버가 핫리로드할 때마다 새 커넥션이 생기는 걸 막기 위해 전역에 하나만 둡니다.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const playerSelect = {
  id: true,
  nickname: true,
  ntrpScore: true,
  ntrpCount: true,
  mannerScore: true,
  isBanned: true,
} satisfies Prisma.UserSelect;

type PlayerRow = Prisma.UserGetPayload<{ select: typeof playerSelect }>;

/** Prisma Decimal을 숫자로 바꿔서 자격 검사용 PlayerInfo로 만듭니다. */
export function toPlayerInfo(user: PlayerRow): PlayerInfo {
  return {
    nickname: user.nickname,
    ntrpScore: user.ntrpScore === null ? null : Number(user.ntrpScore),
    ntrpCount: user.ntrpCount,
    mannerScore: Number(user.mannerScore),
    isBanned: user.isBanned,
  };
}

export async function getPlayer(userId: string): Promise<PlayerInfo | null> {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: playerSelect });
  return user ? toPlayerInfo(user) : null;
}

export function toRule(t: {
  minNtrp: Prisma.Decimal;
  maxNtrp: Prisma.Decimal;
  minMannerScore: Prisma.Decimal | null;
  maxTeamAvgNtrp: Prisma.Decimal | null;
}): TournamentRule {
  return {
    minNtrp: Number(t.minNtrp),
    maxNtrp: Number(t.maxNtrp),
    minMannerScore: t.minMannerScore === null ? null : Number(t.minMannerScore),
    maxTeamAvgNtrp: t.maxTeamAvgNtrp === null ? null : Number(t.maxTeamAvgNtrp),
  };
}

/** 이 유저가 이 대회에서 이미 어떤 팀에든 속해 있는지 (신청자든 파트너든) */
export async function findTeamOf(tournamentId: string, userId: string) {
  return prisma.tournamentTeam.findFirst({
    where: { tournamentId, OR: [{ captainId: userId }, { partnerId: userId }] },
  });
}

/**
 * 대진표에 오를 참가 단위(entrant) 목록을 시드 순서(강한 순)로 만듭니다.
 * - 단식: 참가 신청한 유저 ID
 * - 복식: 확정된(CONFIRMED) 팀 ID  (파트너 수락 대기 중인 팀은 제외)
 * 정렬 기준: NTRP(복식은 두 선수 평균) 높은 순 → 매너 온도 높은 순 → 먼저 신청한 순
 */
export async function getSeededEntrants(tournamentId: string, format: "SINGLES" | "DOUBLES") {
  if (format === "SINGLES") {
    const rows = await prisma.tournamentParticipant.findMany({
      where: { tournamentId },
      include: { user: { select: { ntrpScore: true, mannerScore: true } } },
    });
    return rows
      .map((r) => ({
        id: r.userId,
        ntrp: Number(r.user.ntrpScore ?? 0),
        manner: Number(r.user.mannerScore),
        at: r.registeredAt.getTime(),
      }))
      .sort((a, b) => b.ntrp - a.ntrp || b.manner - a.manner || a.at - b.at)
      .map((e) => e.id);
  }

  const teams = await prisma.tournamentTeam.findMany({
    where: { tournamentId, status: "CONFIRMED" },
    include: {
      captain: { select: { ntrpScore: true, mannerScore: true } },
      partner: { select: { ntrpScore: true, mannerScore: true } },
    },
  });
  return teams
    .map((t) => ({
      id: t.id,
      ntrp: teamAvgNtrp(
        { ntrpScore: t.captain.ntrpScore === null ? null : Number(t.captain.ntrpScore) },
        { ntrpScore: t.partner.ntrpScore === null ? null : Number(t.partner.ntrpScore) }
      ),
      manner: (Number(t.captain.mannerScore) + Number(t.partner.mannerScore)) / 2,
      at: t.createdAt.getTime(),
    }))
    .sort((a, b) => b.ntrp - a.ntrp || b.manner - a.manner || a.at - b.at)
    .map((e) => e.id);
}

/** 참가 단위 ID → 화면에 보여줄 이름. 단식은 닉네임, 복식은 "닉A · 닉B" */
export async function getEntrantNames(tournamentId: string, format: "SINGLES" | "DOUBLES") {
  const names: Record<string, string> = {};
  if (format === "SINGLES") {
    const rows = await prisma.tournamentParticipant.findMany({
      where: { tournamentId },
      include: { user: { select: { nickname: true } } },
    });
    rows.forEach((r) => (names[r.userId] = r.user.nickname || "익명"));
  } else {
    const teams = await prisma.tournamentTeam.findMany({
      where: { tournamentId },
      include: { captain: { select: { nickname: true } }, partner: { select: { nickname: true } } },
    });
    teams.forEach((t) => (names[t.id] = teamLabel(t.captain.nickname, t.partner.nickname)));
  }
  return names;
}

/** 참가 단위(entrant) ID에 해당하는 실제 선수(유저) ID들. 단식은 본인, 복식은 팀원 두 명. */
export async function getPlayerIdsOfEntrant(entrantId: string, format: "SINGLES" | "DOUBLES"): Promise<string[]> {
  if (format === "SINGLES") return [entrantId];
  const team = await prisma.tournamentTeam.findUnique({ where: { id: entrantId } });
  return team ? [team.captainId, team.partnerId] : [];
}
