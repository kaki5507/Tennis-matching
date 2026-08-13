// app/actions/user.ts
"use server"

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function getMyMatches(userId: string) {
  try {
    // 1. 내가 방장(Host)인 방 목록 가져오기
    const hostedMatches = await prisma.match.findMany({
      where: { hostId: userId },
      include: { court: true }, // 코트장 정보 포함
      orderBy: { matchDate: 'desc' }
    });

    // 2. 내가 참여 신청한(Participant) 방 목록 가져오기
    // (만약 Prisma에 MatchParticipant를 위 안내대로 추가하셨다면 정상 작동합니다)
    const participatedRecords = await prisma.matchParticipant.findMany({
      where: { userId: userId },
      include: { 
        match: {
          include: { court: true } // 매칭 방 안의 코트장 정보까지 싹 포함
        } 
      },
      orderBy: { createdAt: 'desc' }
    });

    // 참여 기록에서 '방 정보(match)'만 따로 깔끔하게 뽑아내기
    const joinedMatches = participatedRecords.map(record => record.match);

    return { success: true, hostedMatches, joinedMatches };
  } catch (error) {
    console.error("마이페이지 데이터 조회 에러:", error);
    return { success: false, hostedMatches: [], joinedMatches: [] };
  }
}