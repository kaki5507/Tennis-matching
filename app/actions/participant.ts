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

// app/actions/participant.ts 파일 맨 아래에 추가해 주세요!

// 💡 [NEW] 현재 로그인한 유저가 이 방에 참여 중인지(또는 방장인지) 확인하는 함수
export async function checkParticipation(matchId: string, userId: string) {
  try {
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return { success: false };
    
    const isHost = match.hostId === userId;
    const participant = await prisma.matchParticipant.findFirst({
      where: { matchId, userId }
    });
    
    return { 
      success: true, 
      isHost, 
      isParticipating: !!participant, 
      status: participant?.status 
    };
  } catch (error) {
    console.error("참여 상태 확인 에러:", error);
    return { success: false, isHost: false, isParticipating: false };
  }
}

// 💡 [NEW] 유저가 스스로 참여 신청을 취소(삭제)하는 함수
export async function cancelMatchApplication(matchId: string, userId: string) {
  try {
    // 신청 내역 찾기
    const participant = await prisma.matchParticipant.findFirst({
      where: { matchId, userId }
    });
    
    if (!participant) {
      return { success: false, error: "신청 내역이 없습니다." };
    }

    // 신청 내역을 DB에서 깔끔하게 삭제합니다.
    await prisma.matchParticipant.delete({
      where: { id: participant.id }
    });

    return { success: true };
  } catch (error) {
    console.error("취소 에러:", error);
    return { success: false, error: "취소 처리 중 오류가 발생했습니다." };
  }
}