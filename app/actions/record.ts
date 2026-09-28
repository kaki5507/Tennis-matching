// app/actions/record.ts
"use server"

import { PrismaClient, WinLoss } from "@prisma/client"
import { roundName } from "@/lib/bracket"
import { teamLabel } from "@/lib/tournamentRules"

const prisma = new PrismaClient()

interface MatchResultSummary {
  matchId: string
  matchDate: Date
  courtName: string
  result: WinLoss | null // 그 경기에서 다수결로 확정된 결과 (평가가 하나도 없으면 null)
}

/**
 * 한 경기(matchId)에 대해 여러 평가자가 매긴 winLoss 값을 다수결로 확정합니다.
 * (한 사람에 대해 4명이 평가했는데 의견이 갈릴 수 있어서, 가장 많이 나온 값을 채택)
 * 동점이면 WIN > LOSS > DRAW 순으로 우선한다 (긍정적 판정 우선 — 임의 규칙, 필요시 조정 가능)
 */
function majorityVote(results: WinLoss[]): WinLoss | null {
  if (results.length === 0) return null

  const counts: Record<WinLoss, number> = { WIN: 0, LOSS: 0, DRAW: 0 }
  results.forEach((r) => { counts[r]++ })

  const max = Math.max(counts.WIN, counts.LOSS, counts.DRAW)
  if (counts.WIN === max) return "WIN"
  if (counts.LOSS === max) return "LOSS"
  return "DRAW"
}

/**
 * 특정 유저의 전적(참여 횟수, 승/패/무, 승률)과 최근 경기 목록을 조회합니다.
 * 마이페이지뿐 아니라, 다른 유저의 프로필을 누른 제3자도 볼 수 있는 공개 정보입니다.
 */
export async function getUserRecord(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nickname: true,
        gender: true,
        tennisLevel: true,
        preferredPos: true,
        mannerScore: true,
        ntrpScore: true,
        ntrpCount: true,
        createdAt: true,
      },
    })

    if (!user) {
      return { success: false, error: "존재하지 않는 유저입니다." }
    }

    // 1. 완료된(COMPLETED) 경기 중, 이 유저가 정식 참여자(ACCEPTED)였던 경기 전체
    const completedParticipations = await prisma.matchParticipant.findMany({
      where: {
        userId,
        status: "ACCEPTED",
        match: { status: "COMPLETED" },
      },
      select: {
        matchId: true,
        match: {
          select: { matchDate: true, court: { select: { name: true } } },
        },
      },
      orderBy: { match: { matchDate: "desc" } },
    })

    const totalMatches = completedParticipations.length

    // 2. 이 유저가 "평가받은" 모든 승패 기록을, 경기(matchId)별로 그룹핑
    const evaluations = await prisma.evaluation.findMany({
      where: { evaluateeId: userId, winLoss: { not: null } },
      select: { matchId: true, winLoss: true },
    })

    const resultsByMatch = new Map<string, WinLoss[]>()
    evaluations.forEach((e) => {
      if (!e.winLoss) return
      const list = resultsByMatch.get(e.matchId) ?? []
      list.push(e.winLoss)
      resultsByMatch.set(e.matchId, list)
    })

    let wins = 0
    let losses = 0
    let draws = 0

    const recentMatches: MatchResultSummary[] = completedParticipations.map((p) => {
      const verdict = majorityVote(resultsByMatch.get(p.matchId) ?? [])
      if (verdict === "WIN") wins++
      else if (verdict === "LOSS") losses++
      else if (verdict === "DRAW") draws++

      return {
        matchId: p.matchId,
        matchDate: p.match.matchDate,
        courtName: p.match.court.name,
        result: verdict,
      }
    })

    const decidedMatches = wins + losses // 무승부는 승률 계산에서 제외 (통상적인 승률 정의)
    const winRate = decidedMatches > 0 ? Math.round((wins / decidedMatches) * 1000) / 10 : null

    const tournament = await getTournamentRecord(userId)

    return {
      success: true,
      // Decimal 객체는 클라이언트로 그대로 넘기면 안 되므로 숫자로 변환해서 내려줍니다.
      user: {
        ...user,
        mannerScore: Number(user.mannerScore),
        ntrpScore: user.ntrpScore === null ? null : Number(user.ntrpScore),
      },
      record: { totalMatches, wins, losses, draws, winRate },
      recentMatches: recentMatches.slice(0, 10),
      tournamentHonors: tournament.honors,
      tournamentMatches: tournament.matches,
      tournamentRecord: tournament.summary,
    }
  } catch (error) {
    console.error("유저 전적 조회 에러:", error)
    return { success: false, error: "전적 조회에 실패했습니다." }
  }
}

/**
 * [NEW] 대회 경력(우승/준우승/3위)과 대회 경기 기록(라운드, 상대, 승패, 스코어)을 모읍니다.
 * 부전승은 실제로 치른 경기가 아니라서 기록에서 뺍니다.
 *
 * 단식은 대진표/결과에 "유저 ID"가, 복식은 "팀 ID"가 들어 있습니다. 그래서 이 유저를
 * 나타내는 ID(본인 ID + 속한 팀 ID들)를 먼저 모은 뒤 그 ID들로 조회합니다.
 */
async function getTournamentRecord(userId: string) {
  const myTeams = await prisma.tournamentTeam.findMany({
    where: { status: "CONFIRMED", OR: [{ captainId: userId }, { partnerId: userId }] },
    include: {
      captain: { select: { id: true, nickname: true } },
      partner: { select: { id: true, nickname: true } },
    },
  })
  const teamById = new Map(myTeams.map((tm) => [tm.id, tm]))
  const myIds = [userId, ...myTeams.map((tm) => tm.id)]

  const honorTournaments = await prisma.tournament.findMany({
    where: {
      status: "COMPLETED",
      OR: [{ championId: { in: myIds } }, { runnerUpId: { in: myIds } }, { thirdPlaceId: { in: myIds } }],
    },
    select: { id: true, title: true, format: true, startDate: true, championId: true, runnerUpId: true, thirdPlaceId: true },
    orderBy: { startDate: "desc" },
  })

  const partnerNameOf = (teamId: string | null) => {
    const team = teamId ? teamById.get(teamId) : undefined
    if (!team) return null
    return (team.captainId === userId ? team.partner.nickname : team.captain.nickname) ?? "익명"
  }

  const partnerIdOf = (teamId: string | null) => {
    const team = teamId ? teamById.get(teamId) : undefined
    if (!team) return null
    return team.captainId === userId ? team.partnerId : team.captainId
  }

  const honors = honorTournaments.map((t) => {
    const place = (myIds.includes(t.championId ?? "") ? 1 : myIds.includes(t.runnerUpId ?? "") ? 2 : 3) as 1 | 2 | 3
    const teamId = place === 1 ? t.championId : place === 2 ? t.runnerUpId : t.thirdPlaceId
    return {
      tournamentId: t.id,
      title: t.title,
      date: t.startDate,
      place,
      format: t.format,
      partnerName: t.format === "DOUBLES" ? partnerNameOf(teamId) : null,
    }
  })

  const played = await prisma.tournamentMatch.findMany({
    where: {
      isBye: false,
      winnerId: { not: null },
      OR: [{ player1Id: { in: myIds } }, { player2Id: { in: myIds } }],
    },
    include: { tournament: { select: { id: true, title: true, format: true, startDate: true } } },
    orderBy: [{ tournament: { startDate: "desc" } }, { round: "desc" }],
    take: 50,
  })

  // 라운드 이름(결승/4강...)을 붙이려면 대회별 전체 라운드 수가 필요
  const tournamentIds = [...new Set(played.map((m) => m.tournamentId))]
  const roundTotals = tournamentIds.length
    ? await prisma.tournamentMatch.groupBy({
        by: ["tournamentId"],
        where: { tournamentId: { in: tournamentIds }, isThirdPlace: false },
        _max: { round: true },
      })
    : []
  const totalRoundsMap = new Map(roundTotals.map((r) => [r.tournamentId, r._max.round ?? 1]))

  // 상대 이름: 단식은 유저 닉네임, 복식은 상대 팀의 "닉A · 닉B"
  const isMine = (id: string | null) => !!id && myIds.includes(id)
  const opponentEntrantId = (m: (typeof played)[number]) => (isMine(m.player1Id) ? m.player2Id : m.player1Id)

  const singlesOpponentIds = [
    ...new Set(
      played.filter((m) => m.tournament.format === "SINGLES").map(opponentEntrantId).filter((id): id is string => !!id)
    ),
  ]
  const doublesOpponentIds = [
    ...new Set(
      played.filter((m) => m.tournament.format === "DOUBLES").map(opponentEntrantId).filter((id): id is string => !!id)
    ),
  ]

  const [singlesOpponents, doublesOpponents] = await Promise.all([
    singlesOpponentIds.length
      ? prisma.user.findMany({ where: { id: { in: singlesOpponentIds } }, select: { id: true, nickname: true } })
      : [],
    doublesOpponentIds.length
      ? prisma.tournamentTeam.findMany({
          where: { id: { in: doublesOpponentIds } },
          include: { captain: { select: { nickname: true } }, partner: { select: { nickname: true } } },
        })
      : [],
  ])
  const opponentName = new Map<string, string>([
    ...singlesOpponents.map((o) => [o.id, o.nickname ?? "익명"] as [string, string]),
    ...doublesOpponents.map((tm) => [tm.id, teamLabel(tm.captain.nickname, tm.partner.nickname)] as [string, string]),
  ])

  const matches = played.map((m) => {
    const opponentId = opponentEntrantId(m)
    const myEntrantId = isMine(m.player1Id) ? m.player1Id : m.player2Id
    return {
      matchId: m.id,
      tournamentId: m.tournamentId,
      tournamentTitle: m.tournament.title,
      date: m.tournament.startDate,
      roundLabel: m.isThirdPlace ? "3·4위전" : roundName(m.round, totalRoundsMap.get(m.tournamentId) ?? m.round),
      opponentId,
      opponentName: opponentId ? opponentName.get(opponentId) ?? "알 수 없음" : "알 수 없음",
      format: m.tournament.format,
      // 복식이면 함께 뛴 파트너 (단식은 null)
      partnerName: m.tournament.format === "DOUBLES" ? partnerNameOf(myEntrantId) : null,
      partnerId: m.tournament.format === "DOUBLES" ? partnerIdOf(myEntrantId) : null,
      won: m.winnerId === myEntrantId,
      score: m.score,
    }
  })

  const wins = (list: typeof matches) => list.filter((m) => m.won).length
  const singles = matches.filter((m) => m.format === "SINGLES")
  const doubles = matches.filter((m) => m.format === "DOUBLES")
  const matchWins = wins(matches)

  // 베스트 파트너: 복식 경기를 가장 많이 함께 뛴 사람 (같으면 이긴 경기가 많은 쪽)
  const partnerStats = new Map<string, { id: string; name: string; games: number; wins: number }>()
  doubles.forEach((m) => {
    if (!m.partnerId) return
    const cur = partnerStats.get(m.partnerId) ?? { id: m.partnerId, name: m.partnerName ?? "익명", games: 0, wins: 0 }
    cur.games += 1
    if (m.won) cur.wins += 1
    partnerStats.set(m.partnerId, cur)
  })
  const bestPartner =
    [...partnerStats.values()].sort((a, b) => b.games - a.games || b.wins - a.wins)[0] ?? null

  // 지금까지 참가한 대회 수 (아직 진행 중이거나 입상하지 못한 대회도 포함)
  const participated = await prisma.tournamentParticipant.count({ where: { userId } })

  return {
    honors,
    matches,
    summary: {
      titles: honors.filter((h) => h.place === 1).length,
      runnerUps: honors.filter((h) => h.place === 2).length,
      thirdPlaces: honors.filter((h) => h.place === 3).length,
      participated,
      matchWins,
      matchLosses: matches.length - matchWins,
      singles: { wins: wins(singles), losses: singles.length - wins(singles) },
      doubles: { wins: wins(doubles), losses: doubles.length - wins(doubles) },
      bestPartner,
    },
  }
}
