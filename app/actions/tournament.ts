// app/actions/tournament.ts
// 대회 개설 / 조회 / 신청 / 취소 / 상태 변경.
// 복식 팀 신청은 tournamentTeam.ts, 대진표·결과는 tournamentBracket.ts 에 있습니다.
"use server"

import { isAdmin } from "@/app/actions/admin"
import { sendPushToUsers } from "@/app/actions/notification"
import { checkPlayer } from "@/lib/tournamentRules"
import { prisma, findTeamOf, getPlayer, toRule } from "@/lib/tournamentData"

interface CreateTournamentInput {
  title: string
  description?: string
  courtId: string
  startDate: string // YYYY-MM-DD
  registrationDeadline: string // YYYY-MM-DDTHH:mm
  format: "SINGLES" | "DOUBLES"
  minNtrp: number
  maxNtrp: number
  minMannerScore?: number | null
  maxTeamNtrp?: number | null // 복식 합산 NTRP 상한
  maxParticipants: number // 단식: 인원 / 복식: 팀 수
}

/** 관리자가 대회를 개설합니다. 개설 즉시, 조건에 맞는 유저 전원에게 알림을 보냅니다. */
export async function createTournament(adminId: string, data: CreateTournamentInput) {
  const admin = await isAdmin(adminId)
  if (!admin) {
    return { success: false, error: "관리자만 대회를 개설할 수 있습니다." }
  }
  if (data.minNtrp > data.maxNtrp) {
    return { success: false, error: "최소 실력이 최대 실력보다 클 수 없습니다." }
  }
  if (data.maxParticipants < 2) {
    return { success: false, error: `정원은 최소 2${data.format === "DOUBLES" ? "팀" : "명"} 이상이어야 합니다.` }
  }
  if (data.format === "DOUBLES" && data.maxTeamNtrp != null && data.maxTeamNtrp < data.minNtrp * 2) {
    return { success: false, error: "합산 NTRP 상한이 너무 낮아서, 조건을 만족하는 팀을 만들 수 없어요." }
  }

  try {
    const tournament = await prisma.tournament.create({
      data: {
        title: data.title,
        description: data.description || null,
        courtId: data.courtId,
        startDate: new Date(data.startDate),
        registrationDeadline: new Date(data.registrationDeadline),
        format: data.format,
        minNtrp: data.minNtrp,
        maxNtrp: data.maxNtrp,
        minMannerScore: data.minMannerScore ?? null,
        maxTeamNtrp: data.format === "DOUBLES" ? data.maxTeamNtrp ?? null : null,
        maxParticipants: data.maxParticipants,
        createdBy: adminId,
      },
    })

    // 조건(NTRP 범위 + 매너온도)에 맞는 유저 전원에게 알림 (평가 3회 이상, 정지 안 된 유저만)
    const eligibleUsers = await prisma.user.findMany({
      where: {
        deletedAt: null,
        isBanned: false,
        ntrpCount: { gte: 3 },
        ntrpScore: { gte: data.minNtrp, lte: data.maxNtrp },
        ...(data.minMannerScore ? { mannerScore: { gte: data.minMannerScore } } : {}),
      },
      select: { id: true },
    })

    if (eligibleUsers.length > 0) {
      const isDoubles = data.format === "DOUBLES"
      await sendPushToUsers(
        eligibleUsers.map((u) => u.id),
        {
          title: `🏆 새 ${isDoubles ? "복식 " : ""}대회가 열렸어요: ${data.title}`,
          body: isDoubles
            ? "파트너와 함께 팀으로 신청해보세요!"
            : "참여 조건에 맞는 대회가 개설됐어요. 지금 확인하고 신청해보세요!",
          url: `/tournaments/${tournament.id}`,
        }
      )
    }

    return { success: true, tournamentId: tournament.id, notifiedCount: eligibleUsers.length }
  } catch (error) {
    console.error("대회 개설 에러:", error)
    return { success: false, error: "대회 개설에 실패했습니다." }
  }
}

/** 공개 대회 목록 (모집중/진행중인 것 우선). 복식은 "확정된 팀 수"를 참가 규모로 보여줍니다. */
export async function getTournaments() {
  try {
    const rows = await prisma.tournament.findMany({
      include: {
        court: { select: { name: true } },
        _count: { select: { participants: true, teams: { where: { status: "CONFIRMED" } } } },
      },
      orderBy: [{ status: "asc" }, { startDate: "asc" }],
    })
    const tournaments = rows.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      format: t.format,
      startDate: t.startDate,
      minNtrp: Number(t.minNtrp),
      maxNtrp: Number(t.maxNtrp),
      maxTeamNtrp: t.maxTeamNtrp === null ? null : Number(t.maxTeamNtrp),
      maxParticipants: t.maxParticipants,
      courtName: t.court.name,
      // 단식이면 신청 인원, 복식이면 확정된 팀 수
      entrantCount: t.format === "DOUBLES" ? t._count.teams : t._count.participants,
    }))
    return { success: true, tournaments }
  } catch (error) {
    console.error("대회 목록 조회 에러:", error)
    return { success: false, tournaments: [] }
  }
}

/** 조회자가 이 대회에서 어떤 상태인지 (화면의 버튼/안내를 결정) */
export type ViewerStatus =
  | { kind: "guest" }
  | { kind: "registered" } // 단식 신청 완료 / 복식 팀 확정
  | { kind: "team_pending_captain"; teamId: string; partnerName: string } // 내가 신청자, 파트너 수락 대기
  | { kind: "team_invited"; teamId: string; captainName: string } // 내가 초대받음
  | { kind: "eligible" } // 신청 가능
  | { kind: "ineligible"; reason: string }

/** 대회 상세: 참가자/팀 목록, 대진표, 조회자의 상태 */
export async function getTournamentDetail(tournamentId: string, viewerId?: string) {
  try {
    const row = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        court: true,
        participants: {
          include: { user: { select: { id: true, nickname: true, ntrpScore: true, mannerScore: true } } },
          orderBy: { registeredAt: "asc" },
        },
        teams: {
          include: {
            captain: { select: { id: true, nickname: true, ntrpScore: true } },
            partner: { select: { id: true, nickname: true, ntrpScore: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        matches: { orderBy: [{ round: "asc" }, { position: "asc" }] },
      },
    })
    if (!row) {
      return { success: false, error: "대회를 찾을 수 없습니다." }
    }

    // Decimal은 클라이언트로 그대로 넘기지 않고 숫자로 바꿔서 내려줍니다.
    const tournament = {
      ...row,
      minNtrp: Number(row.minNtrp),
      maxNtrp: Number(row.maxNtrp),
      minMannerScore: row.minMannerScore === null ? null : Number(row.minMannerScore),
      maxTeamNtrp: row.maxTeamNtrp === null ? null : Number(row.maxTeamNtrp),
      participants: row.participants.map((p) => ({
        ...p,
        user: {
          ...p.user,
          ntrpScore: p.user.ntrpScore === null ? null : Number(p.user.ntrpScore),
          mannerScore: Number(p.user.mannerScore),
        },
      })),
      teams: row.teams.map((tm) => ({
        ...tm,
        captain: { ...tm.captain, ntrpScore: tm.captain.ntrpScore === null ? null : Number(tm.captain.ntrpScore) },
        partner: { ...tm.partner, ntrpScore: tm.partner.ntrpScore === null ? null : Number(tm.partner.ntrpScore) },
      })),
    }

    return { success: true, tournament, viewer: await resolveViewerStatus(row, viewerId) }
  } catch (error) {
    console.error("대회 상세 조회 에러:", error)
    return { success: false, error: "대회 정보를 불러오지 못했습니다." }
  }
}

async function resolveViewerStatus(
  t: Awaited<ReturnType<typeof prisma.tournament.findUniqueOrThrow>> & {
    participants: { userId: string }[]
    teams: { id: string; status: string; captainId: string; partnerId: string; captain: { nickname: string | null }; partner: { nickname: string | null } }[]
  },
  viewerId?: string
): Promise<ViewerStatus> {
  if (!viewerId) return { kind: "guest" }

  if (t.format === "DOUBLES") {
    const mine = t.teams.find((tm) => tm.captainId === viewerId || tm.partnerId === viewerId)
    if (mine?.status === "CONFIRMED") return { kind: "registered" }
    if (mine?.status === "PENDING") {
      return mine.captainId === viewerId
        ? { kind: "team_pending_captain", teamId: mine.id, partnerName: mine.partner.nickname || "파트너" }
        : { kind: "team_invited", teamId: mine.id, captainName: mine.captain.nickname || "회원" }
    }
  } else if (t.participants.some((p) => p.userId === viewerId)) {
    return { kind: "registered" }
  }

  const viewer = await getPlayer(viewerId)
  if (!viewer) return { kind: "ineligible", reason: "유저 정보를 찾을 수 없습니다." }
  const result = checkPlayer(viewer, toRule(t))
  return result.ok ? { kind: "eligible" } : { kind: "ineligible", reason: result.reason }
}

/** 단식 대회 신청 (복식은 tournamentTeam.ts 의 createTeam 으로 신청) */
export async function registerForTournament(userId: string, tournamentId: string) {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { _count: { select: { participants: true, matches: true } } },
    })
    if (!tournament) return { success: false, error: "대회를 찾을 수 없습니다." }
    if (tournament.format === "DOUBLES") return { success: false, error: "복식 대회는 파트너와 팀으로 신청해주세요." }
    if (tournament.status !== "RECRUITING") return { success: false, error: "지금은 신청할 수 없는 대회예요." }
    if (tournament._count.matches > 0) return { success: false, error: "대진표가 이미 나와서 신청할 수 없어요." }
    if (new Date() > tournament.registrationDeadline) return { success: false, error: "신청 마감일이 지났습니다." }
    if (tournament._count.participants >= tournament.maxParticipants) {
      return { success: false, error: "정원이 마감되었습니다." }
    }

    const player = await getPlayer(userId)
    if (!player) return { success: false, error: "유저 정보를 찾을 수 없습니다." }
    const eligibility = checkPlayer(player, toRule(tournament))
    if (!eligibility.ok) return { success: false, error: eligibility.reason }

    await prisma.tournamentParticipant.create({ data: { tournamentId, userId } })
    return { success: true }
  } catch (error) {
    console.error("대회 신청 에러:", error)
    return { success: false, error: "이미 신청했거나 처리에 실패했습니다." }
  }
}

/**
 * 신청 취소. 단식은 본인 신청을, 복식은 본인이 속한 팀 전체를 취소합니다.
 * 복식에서는 한 명이 취소하면 팀이 사라지므로 상대 선수에게 알림을 보냅니다.
 */
export async function cancelTournamentRegistration(userId: string, tournamentId: string) {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { _count: { select: { matches: true } } },
    })
    if (!tournament) return { success: false, error: "대회를 찾을 수 없습니다." }
    if (tournament._count.matches > 0) {
      return { success: false, error: "대진표가 이미 나와서 신청을 취소할 수 없어요. 관리자에게 문의해주세요." }
    }

    if (tournament.format === "DOUBLES") {
      const team = await findTeamOf(tournamentId, userId)
      if (!team) return { success: true }
      const otherId = team.captainId === userId ? team.partnerId : team.captainId
      const me = await prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } })

      await prisma.$transaction([
        prisma.tournamentParticipant.deleteMany({
          where: { tournamentId, userId: { in: [team.captainId, team.partnerId] } },
        }),
        prisma.tournamentTeam.delete({ where: { id: team.id } }),
      ])

      const { sendPushToUser } = await import("@/app/actions/notification")
      await sendPushToUser(otherId, {
        title: "팀 신청이 취소됐어요",
        body: `${me?.nickname ?? "파트너"}님이 "${tournament.title}" 팀 신청을 취소했어요.`,
        url: `/tournaments/${tournamentId}`,
      })
      return { success: true }
    }

    await prisma.tournamentParticipant.deleteMany({ where: { userId, tournamentId } })
    return { success: true }
  } catch (error) {
    console.error("대회 신청취소 에러:", error)
    return { success: false, error: "취소에 실패했습니다." }
  }
}

/** 관리자: 대회 상태 변경 (모집마감/진행중 등) */
export async function updateTournamentStatus(adminId: string, tournamentId: string, status: "RECRUITING" | "CLOSED" | "ONGOING" | "COMPLETED") {
  const admin = await isAdmin(adminId)
  if (!admin) return { success: false, error: "관리자만 가능합니다." }

  try {
    await prisma.tournament.update({ where: { id: tournamentId }, data: { status } })
    return { success: true }
  } catch (error) {
    console.error("대회 상태 변경 에러:", error)
    return { success: false, error: "상태 변경에 실패했습니다." }
  }
}
