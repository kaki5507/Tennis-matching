// app/actions/evaluation.ts
"use server"

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

interface EvaluationInput {
  evaluateeId: string;
  mannerRating: number;
  ntrpRating: number;
  isNoShow?: boolean;
}

export async function getEvaluatees(matchId: string, currentUserId: string) {
  try {
    const participants = await prisma.matchParticipant.findMany({
      where: {
        matchId,
        status: "ACCEPTED",
        userId: { not: currentUserId }
      },
      include: {
        user: {
          select: { id: true, nickname: true, email: true }
        }
      }
    });
    
    return { success: true, evaluatees: participants.map(p => p.user) };
  } catch (error) {
    console.error("평가 대상자 조회 에러:", error);
    return { success: false, evaluatees: [] };
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
  matchId: string, 
  evaluatorId: string, 
  evaluations: EvaluationInput[]
) {
  try {
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
          ntrpRating: evalData.ntrpRating,
          isNoShow: evalData.isNoShow || false,
        },
        create: {
          matchId,
          evaluatorId,
          evaluateeId: evalData.evaluateeId,
          mannerRating: evalData.mannerRating,
          ntrpRating: evalData.ntrpRating,
          isNoShow: evalData.isNoShow || false,
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
    }

    return { success: true };
  } catch (error) {
    console.error("평가 저장 및 계산 에러:", error);
    return { success: false, error: "평가 처리 중 문제가 발생했습니다." };
  }
}