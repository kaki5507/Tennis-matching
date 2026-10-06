// app/actions/tournamentTeam.ts
// 복식 대회의 팀 신청 흐름:
//   신청자가 파트너를 지목(createTeam) → 파트너에게 초대 알림 → 파트너가 수락(respondToTeamInvite)하면 확정.
// 확정되는 순간 두 선수 모두 참가자(TournamentParticipant)로 등록됩니다.
"use server"

import { sendPushToUser } from "@/lib/push"
import { requireUser } from "@/lib/serverAuth"
import { checkTeam } from "@/lib/tournamentRules"
import { prisma, findTeamOf, getPlayer, toRule } from "@/lib/tournamentData"

/**
 * 파트너 후보를 닉네임으로 검색합니다.
 * 이미 이 대회에서 다른 팀에 속한 사람, 본인, 정지/탈퇴 계정은 제외합니다.
 * 닉네임은 참가자 명단에도 공개되는 정보라 검색 결과로 내려줘도 되지만,
 * 이메일 같은 개인정보는 절대 포함하지 않습니다.
 */
export async function searchPartnerCandidates(accessToken: string | null, tournamentId: string, query: string) {
  const auth = await requireUser(accessToken)
  if (!auth.ok) return { success: false, candidates: [] }
  const userId = auth.userId

  const q = (query ?? "").trim().slice(0, 50)
  if (q.length < 2) return { success: true, candidates: [] }

  try {
    const taken = await prisma.tournamentTeam.findMany({
      where: { tournamentId },
      select: { captainId: true, partnerId: true },
    })
    const takenIds = taken.flatMap((t) => [t.captainId, t.partnerId])

    const users = await prisma.user.findMany({
      where: {
        nickname: { contains: q, mode: "insensitive" },
        deletedAt: null,
        isBanned: false,
        id: { notIn: [userId, ...takenIds] },
      },
      select: { id: true, nickname: true, gender: true, ntrpScore: true, ntrpCount: true },
      take: 8,
      orderBy: { nickname: "asc" },
    })

    return {
      success: true,
      candidates: users.map((u) => ({
        id: u.id,
        nickname: u.nickname,
        gender: u.gender,
        ntrpScore: u.ntrpScore === null ? null : Number(u.ntrpScore),
        ntrpCount: u.ntrpCount,
      })),
    }
  } catch (error) {
    console.error("파트너 검색 에러:", error)
    return { success: false, candidates: [] }
  }
}

/** 신청자가 파트너를 지목해 팀을 만듭니다. 파트너가 수락하기 전까지는 '대기' 상태입니다. */
export async function createTeam(accessToken: string | null, tournamentId: string, partnerId: string) {
  try {
    const auth = await requireUser(accessToken)
    if (!auth.ok) return { success: false, error: auth.error }
    const userId = auth.userId

    if (userId === partnerId) return { success: false, error: "본인을 파트너로 지정할 수 없어요." }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { _count: { select: { teams: true, matches: true } } },
    })
    if (!tournament) return { success: false, error: "대회를 찾을 수 없습니다." }
    if (tournament.format !== "DOUBLES") return { success: false, error: "복식 대회가 아니에요." }
    if (tournament.status !== "RECRUITING") return { success: false, error: "지금은 신청할 수 없는 대회예요." }
    if (tournament._count.matches > 0) return { success: false, error: "대진표가 이미 나와서 신청할 수 없어요." }
    if (new Date() > tournament.registrationDeadline) return { success: false, error: "신청 마감일이 지났습니다." }
    // 대기 중인 팀도 자리를 차지하므로 전체 팀 수로 정원을 셉니다.
    if (tournament._count.teams >= tournament.maxParticipants) return { success: false, error: "정원이 마감되었습니다." }

    const [me, partner] = await Promise.all([getPlayer(userId), getPlayer(partnerId)])
    if (!me) return { success: false, error: "유저 정보를 찾을 수 없습니다." }
    if (!partner) return { success: false, error: "파트너 정보를 찾을 수 없습니다." }

    if (await findTeamOf(tournamentId, userId)) {
      return { success: false, error: "이미 이 대회에 팀으로 신청했거나 초대받은 상태예요." }
    }
    if (await findTeamOf(tournamentId, partnerId)) {
      return { success: false, error: "이 분은 이미 다른 팀에 속해 있어요." }
    }

    // 신청 시점에 두 사람 모두 자격을 검사해서, 수락 단계에서 뒤늦게 실패하는 일을 줄입니다.
    const eligibility = checkTeam(me, partner, toRule(tournament))
    if (!eligibility.ok) return { success: false, error: eligibility.reason }

    const team = await prisma.tournamentTeam.create({
      data: { tournamentId, captainId: userId, partnerId },
    })

    await sendPushToUser(partnerId, {
      title: `🎾 ${me.nickname ?? "회원"}님이 복식 팀을 제안했어요`,
      body: `"${tournament.title}" 대회에 함께 나가자는 초대예요. 수락하면 팀이 확정돼요.`,
      url: `/tournaments/${tournamentId}`,
    })

    return { success: true, teamId: team.id }
  } catch (error) {
    console.error("팀 신청 에러:", error)
    return { success: false, error: "팀 신청에 실패했습니다." }
  }
}

/** 파트너가 초대를 수락/거절합니다. 수락하면 팀 확정 + 두 선수 모두 참가자로 등록됩니다. */
export async function respondToTeamInvite(accessToken: string | null, teamId: string, accept: boolean) {
  try {
    const auth = await requireUser(accessToken)
    if (!auth.ok) return { success: false, error: auth.error }
    const userId = auth.userId

    const team = await prisma.tournamentTeam.findUnique({
      where: { id: teamId },
      include: {
        tournament: { include: { _count: { select: { matches: true } } } },
        captain: { select: { nickname: true } },
        partner: { select: { nickname: true } },
      },
    })
    if (!team) return { success: false, error: "초대를 찾을 수 없어요. 이미 취소됐을 수 있어요." }
    if (team.partnerId !== userId) return { success: false, error: "초대받은 본인만 응답할 수 있어요." }
    if (team.status !== "PENDING") return { success: false, error: "이미 처리된 초대예요." }

    const { tournament } = team

    if (!accept) {
      await prisma.tournamentTeam.delete({ where: { id: teamId } })
      await sendPushToUser(team.captainId, {
        title: "팀 제안이 거절됐어요",
        body: `${team.partner.nickname ?? "파트너"}님이 "${tournament.title}" 팀 제안을 거절했어요. 다른 파트너를 찾아보세요.`,
        url: `/tournaments/${tournament.id}`,
      })
      return { success: true, accepted: false }
    }

    if (tournament.status !== "RECRUITING" || tournament._count.matches > 0) {
      return { success: false, error: "신청이 마감된 대회예요." }
    }
    if (new Date() > tournament.registrationDeadline) {
      return { success: false, error: "신청 마감일이 지났습니다." }
    }

    // 수락하는 시점에 다시 한 번 자격 확인 (그 사이 매너 온도/실력이 바뀌었을 수 있어요)
    const [captain, partner] = await Promise.all([getPlayer(team.captainId), getPlayer(team.partnerId)])
    if (!captain || !partner) return { success: false, error: "선수 정보를 찾을 수 없습니다." }
    const eligibility = checkTeam(captain, partner, toRule(tournament))
    if (!eligibility.ok) return { success: false, error: eligibility.reason }

    await prisma.$transaction([
      prisma.tournamentTeam.update({ where: { id: teamId }, data: { status: "CONFIRMED" } }),
      prisma.tournamentParticipant.createMany({
        data: [
          { tournamentId: tournament.id, userId: team.captainId },
          { tournamentId: tournament.id, userId: team.partnerId },
        ],
        skipDuplicates: true,
      }),
    ])

    await sendPushToUser(team.captainId, {
      title: "🎉 팀이 확정됐어요!",
      body: `${team.partner.nickname ?? "파트너"}님이 "${tournament.title}" 팀 제안을 수락했어요.`,
      url: `/tournaments/${tournament.id}`,
    })

    return { success: true, accepted: true }
  } catch (error) {
    console.error("팀 초대 응답 에러:", error)
    return { success: false, error: "처리에 실패했습니다." }
  }
}
