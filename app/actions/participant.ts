// app/actions/participant.ts
"use server"

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// 💡 특정 매칭 방의 모든 참여 신청자 목록을 가져오는 함수
export async function getMatchApplications(matchId: string) {
  try {
    const participants = await prisma.matchParticipant.findMany({
      where: { matchId: matchId },
      include: {
        user: {
          select: { 
            nickname: true, 
            email: true, 
            tennisLevel: true, 
            mannerScore: true, 
            ntrpScore: true // 진짜 실력도 같이 불러옵니다
          }
        }
      },
      orderBy: { createdAt: 'asc' } // 먼저 신청한 사람 순서대로
    });
    
    return { success: true, participants };
  } catch (error) {
    console.error("신청자 목록 불러오기 에러:", error);
    return { success: false, participants: [] };
  }
}