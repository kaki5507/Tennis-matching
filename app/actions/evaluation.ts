// app/actions/evaluation.ts
"use server"

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// 화면에서 넘어올 평가 데이터의 설계도
interface EvaluationInput {
  evaluateeId: string; // 평가 받을 사람 (상대방)
  mannerRating: number; // 매너 점수 (1~5점)
  ntrpRating: number;   // 내가 평가한 상대방의 NTRP (1.0 ~ 5.0)
  isNoShow?: boolean;   // 노쇼 여부 (선택)
}

/**
 * 1. 평가 대상자 불러오기
 * 경기에 '수락(ACCEPTED)'된 인원 중 나를 제외한 사람들의 목록을 가져옵니다.
 */
export async function getEvaluatees(matchId: string, currentUserId: string) {
  try {
    const participants = await prisma.matchParticipant.findMany({
      where: {
        matchId,
        status: "ACCEPTED", // 실제로 경기에 참여한 사람만
        userId: { not: currentUserId } // 나는 제외
      },
      include: {
        user: {
          select: { id: true, nickname: true, email: true }
        }
      }
    });
    
    // 유저 정보만 예쁘게 뽑아서 전달
    return { success: true, evaluatees: participants.map(p => p.user) };
  } catch (error) {
    console.error("평가 대상자 조회 에러:", error);
    return { success: false, evaluatees: [] };
  }
}

/**
 * 2. 평가 저장 및 평균 NTRP 계산하기 (핵심 로직 🌟)
 */
export async function submitEvaluations(
  matchId: string, 
  evaluatorId: string, 
  evaluations: EvaluationInput[]
) {
  try {
    // 여러 명의 평가 데이터를 하나씩 반복하면서 처리합니다.
    for (const evalData of evaluations) {
      
      // ① 먼저 평가 데이터를 DB(Evaluation 테이블)에 저장합니다.
      // (upsert를 써서 이미 평가했는데 또 누르면 덮어씌우도록 방어합니다)
      await prisma.evaluation.upsert({
        where: {
          matchId_evaluatorId_evaluateeId: { // 스키마에 정의한 @@unique 제약조건
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

      // ② 해당 유저(상대방)가 지금까지 받은 모든 NTRP 평가를 싹 다 가져옵니다.
      const allEvals = await prisma.evaluation.findMany({
        where: { evaluateeId: evalData.evaluateeId },
        select: { ntrpRating: true }
      });

      // ③ 평균 NTRP 계산 로직
      const ntrpCount = allEvals.length; // 평가받은 총 횟수
      // 모든 점수를 더합니다. (Prisma의 Decimal 타입은 계산 시 Number로 변환해 주는 것이 안전합니다)
      const ntrpSum = allEvals.reduce((sum, current) => sum + Number(current.ntrpRating), 0);
      
      // 소수점 첫째 자리까지만 나오도록 반올림하여 평균을 구합니다. (예: 2.333 -> 2.3)
      const averageNtrp = Math.round((ntrpSum / ntrpCount) * 10) / 10;

      // ④ 계산된 평균값과 횟수를 유저(User) 프로필에 쏙 업데이트해 줍니다!
      await prisma.user.update({
        where: { id: evalData.evaluateeId },
        data: {
          ntrpScore: averageNtrp, // 진짜 실력 평균값
          ntrpCount: ntrpCount,   // 평가받은 횟수
        }
      });
    }

    return { success: true };
  } catch (error) {
    console.error("평가 저장 및 계산 에러:", error);
    return { success: false, error: "평가 처리 중 문제가 발생했습니다." };
  }
}