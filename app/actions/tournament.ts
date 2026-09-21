// app/actions/tournament.ts
"use server"

import { PrismaClient } from "@prisma/client"
import { isAdmin } from "@/app/actions/admin"
import { sendPushToUsers, sendPushToUser } from "@/app/actions/notification"

const prisma = new PrismaClient()

interface CreateTournamentInput {
  title: string
  description?: string
  courtId: string
  startDate: string // YYYY-MM-DD
  registrationDeadline: string // YYYY-MM-DDTHH:mm
  minNtrp: number
  maxNtrp: number
  minMannerScore?: number | null
  maxParticipants: number
}

/** 관리자가 대회를 개설합니다. 개설 즉시, 조건에 맞는 유저 전원에게 알림을 보냅니다. */
export async function createTournament(adminId: string, data: CreateTournamentInput) {
  const admin = await isAdmin(adminId)
  if (!admin) {
    return { success: false, error: "관리자만 대회를 개설할 수 있습니다." }
  }

  try {
    const tournament = await prisma.tournament.create({
      data: {
        title: data.title,
        description: data.description || null,
        courtId: data.courtId,
        startDate: new Date(data.startDate),
        registrationDeadline: new Date(data.registrationDeadline),
        minNtrp: data.minNtrp,
        maxNtrp: data.maxNtrp,
        minMannerScore: data.minMannerScore ?? null,
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
      await sendPushToUsers(
        eligibleUsers.map((u) => u.id),
        {
          title: `🏆 새 대회가 열렸어요: ${data.title}`,
          body: `참여 조건에 맞는 대회가 개설됐어요. 지금 확인하고 신청해보세요!`,
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

/** 공개 대회 목록 (모집중/진행중인 것 우선) */
export async function getTournaments() {
  try {
    const tournaments = await prisma.tournament.findMany({
      include: {
        court: { select: { name: true } },
        _count: { select: { participants: true } },
      },
      orderBy: [{ status: "asc" }, { startDate: "asc" }],
    })
    return { success: true, tournaments }
  } catch (error) {
    console.error("대회 목록 조회 에러:", error)
    return { success: false, tournaments: [] }
  }
}

/** 대회 상세 (참가자 목록 포함) + 현재 유저의 신청가능여부 */
export async function getTournamentDetail(tournamentId: string, viewerId?: string) {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        court: true,
        participants: {
          include: { user: { select: { id: true, nickname: true, ntrpScore: true, mannerScore: true } } },
          orderBy: { registeredAt: "asc" },
        },
      },
    })
    if (!tournament) {
      return { success: false, error: "대회를 찾을 수 없습니다." }
    }

    let eligibility: { eligible: boolean; reason?: string; alreadyRegistered: boolean } | null = null
    if (viewerId) {
      const already = tournament.participants.some((p) => p.userId === viewerId)
      const viewer = await prisma.user.findUnique({ where: { id: viewerId } })

      if (!viewer) {
        eligibility = { eligible: false, reason: "유저 정보를 찾을 수 없습니다.", alreadyRegistered: already }
      } else if (already) {
        eligibility = { eligible: true, alreadyRegistered: true }
      } else if (viewer.ntrpCount < 3) {
        eligibility = { eligible: false, reason: "실력 평가가 3회 이상 쌓여야 대회 신청이 가능합니다.", alreadyRegistered: false }
      } else {
        const score = Number(viewer.ntrpScore ?? 0)
        const inRange = score >= Number(tournament.minNtrp) && score <= Number(tournament.maxNtrp)
        const mannerOk = !tournament.minMannerScore || Number(viewer.mannerScore) >= Number(tournament.minMannerScore)
        if (!inRange) {
          eligibility = {
            eligible: false,
            reason: `이 대회는 NTRP ${tournament.minNtrp}~${tournament.maxNtrp} 전용이에요. (내 실력: ${score.toFixed(1)})`,
            alreadyRegistered: false,
          }
        } else if (!mannerOk) {
          eligibility = {
            eligible: false,
            reason: `매너 온도 ${Number(tournament.minMannerScore).toFixed(1)}도 이상만 신청 가능해요.`,
            alreadyRegistered: false,
          }
        } else {
          eligibility = { eligible: true, alreadyRegistered: false }
        }
      }
    }

    return { success: true, tournament, eligibility }
  } catch (error) {
    console.error("대회 상세 조회 에러:", error)
    return { success: false, error: "대회 정보를 불러오지 못했습니다." }
  }
}

/** 대회 신청 */
export async function registerForTournament(userId: string, tournamentId: string) {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { _count: { select: { participants: true } } },
    })
    if (!tournament) return { success: false, error: "대회를 찾을 수 없습니다." }
    if (tournament.status !== "RECRUITING") return { success: false, error: "지금은 신청할 수 없는 대회예요." }
    if (new Date() > tournament.registrationDeadline) return { success: false, error: "신청 마감일이 지났습니다." }
    if (tournament._count.participants >= tournament.maxParticipants) {
      return { success: false, error: "정원이 마감되었습니다." }
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return { success: false, error: "유저 정보를 찾을 수 없습니다." }
    if (user.ntrpCount < 3) return { success: false, error: "실력 평가가 3회 이상 쌓여야 신청할 수 있습니다." }

    const score = Number(user.ntrpScore ?? 0)
    if (score < Number(tournament.minNtrp) || score > Number(tournament.maxNtrp)) {
      return { success: false, error: "이 대회의 실력 조건에 맞지 않습니다." }
    }
    if (tournament.minMannerScore && Number(user.mannerScore) < Number(tournament.minMannerScore)) {
      return { success: false, error: "매너 온도 조건에 맞지 않습니다." }
    }

    await prisma.tournamentParticipant.create({ data: { tournamentId, userId } })
    return { success: true }
  } catch (error) {
    console.error("대회 신청 에러:", error)
    return { success: false, error: "이미 신청했거나 처리에 실패했습니다." }
  }
}

export async function cancelTournamentRegistration(userId: string, tournamentId: string) {
  try {
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

/** 관리자: 대회 결과(1~3위) 기록 → 완료 처리 + 전체 참가자에게 결과 알림 */
export async function recordTournamentResult(
  adminId: string,
  tournamentId: string,
  result: { championId: string; runnerUpId?: string; thirdPlaceId?: string }
) {
  const admin = await isAdmin(adminId)
  if (!admin) return { success: false, error: "관리자만 가능합니다." }

  try {
    const tournament = await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: "COMPLETED",
        championId: result.championId,
        runnerUpId: result.runnerUpId || null,
        thirdPlaceId: result.thirdPlaceId || null,
      },
      include: { participants: { select: { userId: true } } },
    })

    const champion = await prisma.user.findUnique({ where: { id: result.championId }, select: { nickname: true } })

    await sendPushToUsers(
      tournament.participants.map((p) => p.userId),
      {
        title: `🎉 "${tournament.title}" 대회 결과가 나왔어요`,
        body: `우승: ${champion?.nickname ?? "알 수 없음"}님 — 지금 확인해보세요!`,
        url: `/tournaments/${tournamentId}`,
      }
    )

    // 우승자에게는 축하 메시지 한 번 더
    await sendPushToUser(result.championId, {
      title: "🏆 우승을 축하드려요!",
      body: `"${tournament.title}" 대회에서 우승하셨습니다!`,
      url: `/tournaments/${tournamentId}`,
    })

    return { success: true }
  } catch (error) {
    console.error("대회 결과 기록 에러:", error)
    return { success: false, error: "결과 기록에 실패했습니다." }
  }
}
