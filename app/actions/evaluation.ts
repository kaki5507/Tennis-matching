// app/actions/evaluation.ts
"use server"

import { prisma } from "@/lib/tournamentData"
import { requireUser } from "@/lib/serverAuth"
import { checkLevelIntegrity } from "@/lib/levelIntegrity"

interface EvaluationInput {
  evaluateeId: string;
  mannerRating: number;
  ntrpRating: number;
  isNoShow?: boolean;
  winLoss?: "WIN" | "LOSS" | "DRAW"; // [NEW] 이 사람이 이 경기에서 이겼는지 여부 (평가자 관점에서 기록)
}

/**
 * 이 경기에서 평가를 남길 수 있는 사람인지(방장 또는 수락된 참가자)와,
 * 평가할 수 있는 대상(수락된 참가자 중 본인 제외)을 한 번에 구합니다.
 * 경기가 완료(COMPLETED)된 뒤에만 평가할 수 있습니다.
 */
async function resolveEvaluationScope(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { hostId: true, status: true, host: { select: { id: true, nickname: true } } },
  })
  if (!match) return { ok: false as const, error: "경기를 찾을 수 없습니다." }
  if (match.status !== "COMPLETED") return { ok: false as const, error: "경기가 완료된 뒤에 평가할 수 있어요." }

  const accepted = await prisma.matchParticipant.findMany({
    where: { matchId, status: "ACCEPTED" },
    select: { userId: true, user: { select: { id: true, nickname: true } } },
  })
  const isMember = match.hostId === userId || accepted.some((p) => p.userId === userId)
  if (!isMember) return { ok: false as const, error: "이 경기에 참여한 사람만 평가할 수 있어요." }

  // 서로 평가: 방장은 참가자를, 참가자는 방장과 다른 참가자를 평가합니다. (본인 제외)
  const everyone = [match.host, ...accepted.map((p) => p.user)]
  const uniq = new Map(everyone.map((u) => [u.id, u]))
  return { ok: true as const, evaluatees: [...uniq.values()].filter((u) => u.id !== userId) }
}

export async function getEvaluatees(accessToken: string | null, matchId: string) {
  try {
    const auth = await requireUser(accessToken)
    if (!auth.ok) return { success: false, evaluatees: [], doneIds: [] as string[] }

    const scope = await resolveEvaluationScope(matchId, auth.userId)
    if (!scope.ok) return { success: false, evaluatees: [], doneIds: [] as string[] }

    const done = await prisma.evaluation.findMany({
      where: { matchId, evaluatorId: auth.userId },
      select: { evaluateeId: true },
    })
    return { success: true, evaluatees: scope.evaluatees, doneIds: done.map((d) => d.evaluateeId) }
  } catch (error) {
    console.error("평가 대상자 조회 에러:", error)
    return { success: false, evaluatees: [], doneIds: [] as string[] }
  }
}

// 💡 [NEW] 매너 별점을 온도(증감치)로 변환하는 마법의 계산기
function calculateMannerDelta(rating: number, isNoShow: boolean) {
  if (isNoShow) return -2.0; // 노쇼는 -2.0도로 치명적 타격
  
  switch (rating) {
    case 5: return 0.2;
    case 4: return 0.1;
    case 3: return 0.0;
    case 2: return -0.2;
    case 1: return -0.5;
    default: return 0.0;
  }
}

export async function submitEvaluations(
  accessToken: string | null,
  matchId: string,
  evaluations: EvaluationInput[]
) {
  try {
    const auth = await requireUser(accessToken)
    if (!auth.ok) return { success: false, error: auth.error }
    const evaluatorId = auth.userId

    // 평가는 매너/실력/적발 로직의 근거 데이터라, 누가 누구를 평가할 수 있는지와 값의 범위를 엄격하게 검사합니다.
    const scope = await resolveEvaluationScope(matchId, evaluatorId)
    if (!scope.ok) return { success: false, error: scope.error }
    const allowedIds = new Set(scope.evaluatees.map((u) => u.id))

    if (!Array.isArray(evaluations) || evaluations.length === 0 || evaluations.length > 20) {
      return { success: false, error: "평가 내용이 올바르지 않습니다." }
    }
    const seen = new Set<string>()
    for (const e of evaluations) {
      if (!allowedIds.has(e.evaluateeId) || seen.has(e.evaluateeId)) {
        return { success: false, error: "평가할 수 없는 대상이 포함되어 있습니다." }
      }
      seen.add(e.evaluateeId)
      if (!Number.isInteger(e.mannerRating) || e.mannerRating < 1 || e.mannerRating > 5) {
        return { success: false, error: "매너 점수는 1~5점이어야 합니다." }
      }
      if (typeof e.ntrpRating !== "number" || !Number.isFinite(e.ntrpRating) || e.ntrpRating < 1 || e.ntrpRating > 7) {
        return { success: false, error: "실력(NTRP) 점수는 1.0~7.0 사이여야 합니다." }
      }
      if (e.winLoss !== undefined && !["WIN", "LOSS", "DRAW"].includes(e.winLoss)) {
        return { success: false, error: "승패 값이 올바르지 않습니다." }
      }
    }

    for (const evalData of evaluations) {
      
      // 1. 평가 기록 DB에 저장 (이미 평가했으면 덮어쓰기)
      await prisma.evaluation.upsert({
        where: {
          matchId_evaluatorId_evaluateeId: {
            matchId,
            evaluatorId,
            evaluateeId: evalData.evaluateeId,
          }
        },
        update: {
          mannerRating: evalData.mannerRating,
          ntrpRating: Math.round(evalData.ntrpRating * 10) / 10,
          isNoShow: evalData.isNoShow === true,
          winLoss: evalData.winLoss,
        },
        create: {
          matchId,
          evaluatorId,
          evaluateeId: evalData.evaluateeId,
          mannerRating: evalData.mannerRating,
          ntrpRating: Math.round(evalData.ntrpRating * 10) / 10,
          isNoShow: evalData.isNoShow === true,
          winLoss: evalData.winLoss,
        }
      });

      // 2. 이 사람이 지금까지 받은 '모든' 평가 데이터를 다 불러옵니다.
      const allEvals = await prisma.evaluation.findMany({
        where: { evaluateeId: evalData.evaluateeId },
        select: { ntrpRating: true, mannerRating: true, isNoShow: true }
      });

      // 🌟 3-A. 진짜 실력(NTRP) 평균 계산
      const ntrpCount = allEvals.length;
      const ntrpSum = allEvals.reduce((sum, current) => sum + Number(current.ntrpRating), 0);
      const averageNtrp = Math.round((ntrpSum / ntrpCount) * 10) / 10;

      // 🌟 3-B. 매너 온도(mannerScore) 계산
      const BASE_MANNER_SCORE = 36.5; // 시작 온도
      let totalMannerDelta = 0;
      
      allEvals.forEach((e) => {
        totalMannerDelta += calculateMannerDelta(e.mannerRating, e.isNoShow);
      });
      
      let finalMannerScore = BASE_MANNER_SCORE + totalMannerDelta;
      
      // 최고 온도 99.9도, 최저 온도 0도로 제한을 둡니다.
      if (finalMannerScore > 99.9) finalMannerScore = 99.9;
      if (finalMannerScore < 0) finalMannerScore = 0;
      
      // 소수점 첫째 자리까지만 예쁘게 다듬기 (예: 36.7)
      finalMannerScore = Math.round(finalMannerScore * 10) / 10;

      // 4. 유저(User) 프로필에 NTRP와 매너 온도 둘 다 업데이트!
      await prisma.user.update({
        where: { id: evalData.evaluateeId },
        data: {
          ntrpScore: averageNtrp,
          ntrpCount: ntrpCount,
          mannerScore: finalMannerScore, // 👈 [추가] 계산된 매너 온도를 반영합니다!
        }
      });

      // 5. [NEW] 허위 구력 자동 적발 검사 (신고구력 vs 실제 평가 비교)
      await checkLevelIntegrity(evalData.evaluateeId, averageNtrp, ntrpCount);
    }

    return { success: true };
  } catch (error) {
    console.error("평가 저장 및 계산 에러:", error);
    return { success: false, error: "평가 처리 중 문제가 발생했습니다." };
  }
}