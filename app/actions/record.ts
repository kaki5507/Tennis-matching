// app/actions/record.ts
"use server"

import { PrismaClient, WinLoss } from "@prisma/client"

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

    return {
      success: true,
      user,
      record: { totalMatches, wins, losses, draws, winRate },
      recentMatches: recentMatches.slice(0, 10),
    }
  } catch (error) {
    console.error("유저 전적 조회 에러:", error)
    return { success: false, error: "전적 조회에 실패했습니다." }
  }
}
