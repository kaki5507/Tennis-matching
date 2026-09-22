// app/actions/tournament.ts
"use server"

import { PrismaClient } from "@prisma/client"
import { isAdmin } from "@/app/actions/admin"
import { sendPushToUsers, sendPushToUser } from "@/app/actions/notification"
import { buildBracket } from "@/lib/bracket"

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
        matches: { orderBy: [{ round: "asc" }, { position: "asc" }] },
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
      include: { _count: { select: { participants: true, matches: true } } },
    })
    if (!tournament) return { success: false, error: "대회를 찾을 수 없습니다." }
    if (tournament.status !== "RECRUITING") return { success: false, error: "지금은 신청할 수 없는 대회예요." }
    if (tournament._count.matches > 0) return { success: false, error: "대진표가 이미 나와서 신청할 수 없어요." }
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
    const matchCount = await prisma.tournamentMatch.count({ where: { tournamentId } })
    if (matchCount > 0) {
      return { success: false, error: "대진표가 이미 나와서 신청을 취소할 수 없어요. 관리자에게 문의해주세요." }
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

/** 관리자: 대회 결과(1~3위) 기록 → 완료 처리 + 전체 참가자에게 결과 알림 */
export async function recordTournamentResult(
  adminId: string,
  tournamentId: string,
  result: { championId: string; runnerUpId?: string; thirdPlaceId?: string }
) {
  const admin = await isAdmin(adminId)
  if (!admin) return { success: false, error: "관리자만 가능합니다." }

  try {
    await finalizeTournament(tournamentId, result.championId, result.runnerUpId || null, result.thirdPlaceId || null)
    return { success: true }
  } catch (error) {
    console.error("대회 결과 기록 에러:", error)
    return { success: false, error: "결과 기록에 실패했습니다." }
  }
}

/**
 * 1~3위를 확정하고 대회를 종료 처리한 뒤 알림을 보냅니다.
 * 수동 결과 입력과 대진표 자동 종료가 같이 쓰는 내부 함수입니다. (export하지 않음)
 */
async function finalizeTournament(
  tournamentId: string,
  championId: string,
  runnerUpId: string | null,
  thirdPlaceId: string | null
) {
  const tournament = await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "COMPLETED", championId, runnerUpId, thirdPlaceId },
    include: { participants: { select: { userId: true } } },
  })

  const champion = await prisma.user.findUnique({ where: { id: championId }, select: { nickname: true } })

  await sendPushToUsers(
    tournament.participants.map((p) => p.userId),
    {
      title: `🎉 "${tournament.title}" 대회 결과가 나왔어요`,
      body: `우승: ${champion?.nickname ?? "알 수 없음"}님 — 지금 확인해보세요!`,
      url: `/tournaments/${tournamentId}`,
    }
  )

  await sendPushToUser(championId, {
    title: "🏆 우승을 축하드려요!",
    body: `"${tournament.title}" 대회에서 우승하셨습니다!`,
    url: `/tournaments/${tournamentId}`,
  })
}

/**
 * 관리자: 참가자 NTRP 순으로 시드를 매겨 대진표를 자동 생성합니다.
 * 생성과 동시에 대회는 '진행중'이 되고 신청이 닫히며, 참가자 전원에게 알림이 갑니다.
 */
export async function generateBracket(adminId: string, tournamentId: string) {
  const admin = await isAdmin(adminId)
  if (!admin) return { success: false, error: "관리자만 가능합니다." }

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        participants: { include: { user: { select: { ntrpScore: true, mannerScore: true } } } },
        _count: { select: { matches: true } },
      },
    })
    if (!tournament) return { success: false, error: "대회를 찾을 수 없습니다." }
    if (tournament.status === "COMPLETED") return { success: false, error: "이미 종료된 대회입니다." }
    if (tournament._count.matches > 0) return { success: false, error: "이미 대진표가 있습니다. 초기화 후 다시 만들어주세요." }
    if (tournament.participants.length < 2) return { success: false, error: "참가자가 2명 이상이어야 대진표를 만들 수 있습니다." }

    // 시드: NTRP 높은 순 → 매너 온도 높은 순 → 먼저 신청한 순
    const seeded = [...tournament.participants].sort((a, b) => {
      const ntrpDiff = Number(b.user.ntrpScore ?? 0) - Number(a.user.ntrpScore ?? 0)
      if (ntrpDiff !== 0) return ntrpDiff
      const mannerDiff = Number(b.user.mannerScore) - Number(a.user.mannerScore)
      if (mannerDiff !== 0) return mannerDiff
      return a.registeredAt.getTime() - b.registeredAt.getTime()
    })

    const rows = buildBracket(seeded.map((p) => p.userId))

    await prisma.$transaction([
      prisma.tournamentMatch.createMany({ data: rows.map((row) => ({ ...row, tournamentId })) }),
      prisma.tournament.update({ where: { id: tournamentId }, data: { status: "ONGOING" } }),
    ])

    await sendPushToUsers(
      tournament.participants.map((p) => p.userId),
      {
        title: `📋 "${tournament.title}" 대진표가 나왔어요`,
        body: "내 첫 상대를 확인해보세요!",
        url: `/tournaments/${tournamentId}`,
      }
    )

    return { success: true, matchCount: rows.length }
  } catch (error) {
    console.error("대진표 생성 에러:", error)
    return { success: false, error: "대진표 생성에 실패했습니다." }
  }
}

/** 관리자: 대진표 초기화. 부전승 말고 실제 경기 결과가 하나라도 입력됐으면 막습니다. */
export async function resetBracket(adminId: string, tournamentId: string) {
  const admin = await isAdmin(adminId)
  if (!admin) return { success: false, error: "관리자만 가능합니다." }

  try {
    const playedCount = await prisma.tournamentMatch.count({
      where: { tournamentId, isBye: false, winnerId: { not: null } },
    })
    if (playedCount > 0) {
      return { success: false, error: "이미 결과가 입력된 경기가 있어서 초기화할 수 없습니다." }
    }

    await prisma.$transaction([
      prisma.tournamentMatch.deleteMany({ where: { tournamentId } }),
      prisma.tournament.update({ where: { id: tournamentId }, data: { status: "CLOSED" } }),
    ])
    return { success: true }
  } catch (error) {
    console.error("대진표 초기화 에러:", error)
    return { success: false, error: "초기화에 실패했습니다." }
  }
}

/**
 * 관리자: 경기 승자(와 스코어)를 입력합니다.
 * - 승자는 다음 라운드 자리로 자동 진출합니다.
 * - 준결승 패자는 3·4위전으로 자동 배정됩니다.
 * - 결승(과 3·4위전)이 모두 끝나면 1~3위가 확정되고 대회가 자동 종료됩니다.
 * - 이미 다음 경기 결과까지 입력된 상태에서 승자를 바꾸면 대진이 꼬이므로 막습니다.
 */
export async function setMatchWinner(adminId: string, matchId: string, winnerId: string, score?: string) {
  const admin = await isAdmin(adminId)
  if (!admin) return { success: false, error: "관리자만 가능합니다." }

  try {
    const match = await prisma.tournamentMatch.findUnique({
      where: { id: matchId },
      include: { tournament: { select: { status: true } } },
    })
    if (!match) return { success: false, error: "경기를 찾을 수 없습니다." }
    if (match.tournament.status === "COMPLETED") return { success: false, error: "이미 종료된 대회입니다." }
    if (match.isBye) return { success: false, error: "부전승 경기는 결과를 입력할 수 없습니다." }
    if (!match.player1Id || !match.player2Id) return { success: false, error: "아직 두 선수가 모두 정해지지 않은 경기입니다." }
    if (winnerId !== match.player1Id && winnerId !== match.player2Id) {
      return { success: false, error: "이 경기의 선수만 승자로 지정할 수 있습니다." }
    }

    const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id
    const winnerChanged = match.winnerId !== null && match.winnerId !== winnerId

    const finalRound = await prisma.tournamentMatch.aggregate({
      where: { tournamentId: match.tournamentId, isThirdPlace: false },
      _max: { round: true },
    })
    const totalRounds = finalRound._max.round ?? match.round
    const isFinal = !match.isThirdPlace && match.round === totalRounds
    const isSemiFinal = !match.isThirdPlace && match.round === totalRounds - 1
    const slot = match.position % 2 === 0 ? "player1Id" : "player2Id"

    const nextMatch = !match.isThirdPlace && !isFinal
      ? await prisma.tournamentMatch.findUnique({
          where: {
            tournamentId_round_position_isThirdPlace: {
              tournamentId: match.tournamentId,
              round: match.round + 1,
              position: Math.floor(match.position / 2),
              isThirdPlace: false,
            },
          },
        })
      : null

    const thirdPlaceMatch = isSemiFinal
      ? await prisma.tournamentMatch.findUnique({
          where: {
            tournamentId_round_position_isThirdPlace: {
              tournamentId: match.tournamentId,
              round: totalRounds,
              position: 0,
              isThirdPlace: true,
            },
          },
        })
      : null

    if (winnerChanged && (nextMatch?.winnerId || thirdPlaceMatch?.winnerId)) {
      return { success: false, error: "다음 경기 결과가 이미 입력돼서 승자를 바꿀 수 없어요. 다음 경기부터 되돌려주세요." }
    }

    await prisma.$transaction([
      prisma.tournamentMatch.update({
        where: { id: matchId },
        data: { winnerId, score: score?.trim() || null },
      }),
      ...(nextMatch
        ? [prisma.tournamentMatch.update({ where: { id: nextMatch.id }, data: { [slot]: winnerId } })]
        : []),
      ...(thirdPlaceMatch
        ? [prisma.tournamentMatch.update({ where: { id: thirdPlaceMatch.id }, data: { [slot]: loserId } })]
        : []),
    ])

    // 결승 또는 3·4위전 결과가 들어왔으면 대회 종료 여부 확인
    if (isFinal || match.isThirdPlace) {
      const [finalMatch, thirdMatch] = await Promise.all([
        prisma.tournamentMatch.findUnique({
          where: {
            tournamentId_round_position_isThirdPlace: {
              tournamentId: match.tournamentId,
              round: totalRounds,
              position: 0,
              isThirdPlace: false,
            },
          },
        }),
        prisma.tournamentMatch.findUnique({
          where: {
            tournamentId_round_position_isThirdPlace: {
              tournamentId: match.tournamentId,
              round: totalRounds,
              position: 0,
              isThirdPlace: true,
            },
          },
        }),
      ])

      const finalDone = !!finalMatch?.winnerId
      const thirdDone = !thirdMatch || !!thirdMatch.winnerId

      if (finalMatch?.winnerId && finalDone && thirdDone) {
        const runnerUp = finalMatch.winnerId === finalMatch.player1Id ? finalMatch.player2Id : finalMatch.player1Id

        // 3·4위전이 없는 경우(참가자 3명): 부전승이 아닌 준결승의 패자가 3위
        let thirdPlaceId = thirdMatch?.winnerId ?? null
        if (!thirdMatch && totalRounds >= 2) {
          const realSemis = await prisma.tournamentMatch.findMany({
            where: {
              tournamentId: match.tournamentId,
              round: totalRounds - 1,
              isThirdPlace: false,
              isBye: false,
              winnerId: { not: null },
            },
          })
          if (realSemis.length === 1) {
            const semi = realSemis[0]
            thirdPlaceId = semi.winnerId === semi.player1Id ? semi.player2Id : semi.player1Id
          }
        }

        await finalizeTournament(match.tournamentId, finalMatch.winnerId, runnerUp, thirdPlaceId)
        return { success: true, completed: true }
      }
    }

    return { success: true, completed: false }
  } catch (error) {
    console.error("경기 결과 입력 에러:", error)
    return { success: false, error: "결과 입력에 실패했습니다." }
  }
}
