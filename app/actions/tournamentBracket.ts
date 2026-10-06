// app/actions/tournamentBracket.ts
// 대진표 생성/초기화, 경기 결과 입력, 대회 종료 처리.
// 단식은 참가 단위(entrant)가 "유저 ID", 복식은 "팀 ID"입니다. 대진표 자체는 ID만 다루므로
// 어느 쪽이든 같은 로직으로 동작하고, 이름 표시와 알림 대상만 형식에 따라 달라집니다.
"use server"

import { requireAdmin } from "@/lib/adminAuth"
import { logAdminAction, tournamentTitle } from "@/lib/auditLog"
import { sendPushToUsers } from "@/lib/push"
import { buildBracket } from "@/lib/bracket"
import { prisma, getSeededEntrants, getPlayerIdsOfEntrant } from "@/lib/tournamentData"
import { teamLabel } from "@/lib/tournamentRules"

/** 관리자: 대진표 없이 현장에서 진행한 대회의 결과(1~3위)를 직접 기록 */
export async function recordTournamentResult(
  accessToken: string | null,
  tournamentId: string,
  result: { championId: string; runnerUpId?: string; thirdPlaceId?: string }
) {
  const auth = await requireAdmin(accessToken)
  if (!auth.ok) return { success: false, error: auth.error }
  const adminId = auth.userId

  try {
    await finalizeTournament(tournamentId, result.championId, result.runnerUpId || null, result.thirdPlaceId || null)
    await logAdminAction({
      adminId,
      action: "TOURNAMENT_RESULT",
      targetType: "tournament",
      targetId: tournamentId,
      targetLabel: await tournamentTitle(tournamentId),
      detail: "1~3위 직접 기록",
    })
    return { success: true }
  } catch (error) {
    console.error("대회 결과 기록 에러:", error)
    return { success: false, error: "결과 기록에 실패했습니다." }
  }
}

/**
 * 1~3위를 확정하고 대회를 종료 처리한 뒤 알림을 보냅니다.
 * 수동 결과 입력과 대진표 자동 종료가 같이 쓰는 내부 함수입니다. (export하지 않음)
 * championId 등은 단식이면 유저 ID, 복식이면 팀 ID 입니다.
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

  // 우승자 이름: 단식은 닉네임, 복식은 "닉A · 닉B"
  let championName = "알 수 없음"
  if (tournament.format === "DOUBLES") {
    const team = await prisma.tournamentTeam.findUnique({
      where: { id: championId },
      include: { captain: { select: { nickname: true } }, partner: { select: { nickname: true } } },
    })
    if (team) championName = teamLabel(team.captain.nickname, team.partner.nickname)
  } else {
    const user = await prisma.user.findUnique({ where: { id: championId }, select: { nickname: true } })
    championName = user?.nickname ?? championName
  }

  await sendPushToUsers(
    tournament.participants.map((p) => p.userId),
    {
      title: `🎉 "${tournament.title}" 대회 결과가 나왔어요`,
      body: `우승: ${championName}님 — 지금 확인해보세요!`,
      url: `/tournaments/${tournamentId}`,
    }
  )

  // 우승자(복식이면 두 명 모두)에게는 축하 메시지 한 번 더
  const winners = await getPlayerIdsOfEntrant(championId, tournament.format)
  await sendPushToUsers(winners, {
    title: "🏆 우승을 축하드려요!",
    body: `"${tournament.title}" 대회에서 우승하셨습니다!`,
    url: `/tournaments/${tournamentId}`,
  })
}

/**
 * 관리자: 참가 단위를 시드 순으로 세워 대진표를 자동 생성합니다.
 * - 단식: 참가 신청한 유저 / 복식: 파트너가 수락한 확정 팀 (평균 NTRP 높은 순)
 * - 복식에서 아직 파트너가 수락하지 않은 팀은 대진표에 넣지 않고 정리(삭제)하며 알립니다.
 * 생성과 동시에 대회는 '진행중'이 되고 신청이 닫히며, 참가자 전원에게 알림이 갑니다.
 */
export async function generateBracket(accessToken: string | null, tournamentId: string) {
  const auth = await requireAdmin(accessToken)
  if (!auth.ok) return { success: false, error: auth.error }
  const adminId = auth.userId

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { _count: { select: { matches: true } } },
    })
    if (!tournament) return { success: false, error: "대회를 찾을 수 없습니다." }
    if (tournament.status === "COMPLETED") return { success: false, error: "이미 종료된 대회입니다." }
    if (tournament._count.matches > 0) return { success: false, error: "이미 대진표가 있습니다. 초기화 후 다시 만들어주세요." }

    const seeded = await getSeededEntrants(tournamentId, tournament.format)
    const unit = tournament.format === "DOUBLES" ? "팀" : "명"
    if (seeded.length < 2) {
      return { success: false, error: `참가 ${unit}이 2${unit} 이상이어야 대진표를 만들 수 있습니다.` }
    }

    const rows = buildBracket(seeded)

    // 복식: 수락 대기 중인 팀은 대진표에 못 들어가므로 정리하고 알립니다.
    const stale =
      tournament.format === "DOUBLES"
        ? await prisma.tournamentTeam.findMany({ where: { tournamentId, status: "PENDING" } })
        : []

    await prisma.$transaction([
      prisma.tournamentMatch.createMany({ data: rows.map((row) => ({ ...row, tournamentId })) }),
      prisma.tournament.update({ where: { id: tournamentId }, data: { status: "ONGOING" } }),
      ...(stale.length > 0
        ? [prisma.tournamentTeam.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } })]
        : []),
    ])

    if (stale.length > 0) {
      await sendPushToUsers(
        stale.flatMap((s) => [s.captainId, s.partnerId]),
        {
          title: "팀 신청이 정리됐어요",
          body: `"${tournament.title}" 대진표가 만들어지면서, 파트너 수락이 끝나지 않은 팀 신청은 취소됐어요.`,
          url: `/tournaments/${tournamentId}`,
        }
      )
    }

    const players = await prisma.tournamentParticipant.findMany({ where: { tournamentId }, select: { userId: true } })
    await sendPushToUsers(
      players.map((p) => p.userId),
      {
        title: `📋 "${tournament.title}" 대진표가 나왔어요`,
        body: tournament.format === "DOUBLES" ? "우리 팀의 첫 상대를 확인해보세요!" : "내 첫 상대를 확인해보세요!",
        url: `/tournaments/${tournamentId}`,
      }
    )

    await logAdminAction({
      adminId,
      action: "BRACKET_GENERATE",
      targetType: "tournament",
      targetId: tournamentId,
      targetLabel: tournament.title,
      detail: `경기 ${rows.length}개 생성`,
    })

    return { success: true, matchCount: rows.length }
  } catch (error) {
    console.error("대진표 생성 에러:", error)
    return { success: false, error: "대진표 생성에 실패했습니다." }
  }
}

/** 관리자: 대진표 초기화. 부전승 말고 실제 경기 결과가 하나라도 입력됐으면 막습니다. */
export async function resetBracket(accessToken: string | null, tournamentId: string) {
  const auth = await requireAdmin(accessToken)
  if (!auth.ok) return { success: false, error: auth.error }
  const adminId = auth.userId

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
    await logAdminAction({
      adminId,
      action: "BRACKET_RESET",
      targetType: "tournament",
      targetId: tournamentId,
      targetLabel: await tournamentTitle(tournamentId),
    })
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
export async function setMatchWinner(accessToken: string | null, matchId: string, winnerId: string, score?: string) {
  const auth = await requireAdmin(accessToken)
  if (!auth.ok) return { success: false, error: auth.error }
  const adminId = auth.userId

  try {
    const match = await prisma.tournamentMatch.findUnique({
      where: { id: matchId },
      include: { tournament: { select: { status: true, title: true } } },
    })
    if (!match) return { success: false, error: "경기를 찾을 수 없습니다." }

    const logMatchResult = () =>
      logAdminAction({
        adminId,
        action: "MATCH_RESULT",
        targetType: "match",
        targetId: matchId,
        targetLabel: match.tournament.title,
        detail: `${match.isThirdPlace ? "3·4위전" : `${match.round}라운드 ${match.position}번 경기`} / 스코어 ${score?.trim() || "-"}`,
      })
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
        await logMatchResult()
        return { success: true, completed: true }
      }
    }

    await logMatchResult()
    return { success: true, completed: false }
  } catch (error) {
    console.error("경기 결과 입력 에러:", error)
    return { success: false, error: "결과 입력에 실패했습니다." }
  }
}
