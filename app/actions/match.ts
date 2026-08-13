"use server"
import { PrismaClient, MatchStatus } from "@prisma/client"

const prisma = new PrismaClient()

// 💡 [NEW] 폼에서 넘어오는 데이터들의 '타입 설계도'를 만들어 줍니다.
interface CreateMatchInput {
  hostId: string;
  matchDate: string;
  startTime: string;
  targetLevel: string;
  gameType: string;
  genderRequirement: string;
  ageRequirement: string;
  costPerPerson: string | number; // 문자로 올 수도 있고 숫자로 올 수도 있음
  description: string;
}

export async function createMatchRoom(data: CreateMatchInput) {
  try {
    // 1. 임시 코트장 확인 및 생성 (외래키 연결 에러 방지용)
    let court = await prisma.court.findFirst();
    if (!court) {
      court = await prisma.court.create({
        data: {
          name: "올림픽공원 메인 테니스장",
          address: "서울시 송파구 올림픽로 424",
          latitude: 37.518,
          longitude: 127.123,
          hasParking: true,
          hasShower: true
        }
      });
    }

    // 2. 사용자가 입력한 데이터로 매칭 방(Match) 생성
    const newMatch = await prisma.match.create({
      data: {
        hostId: data.hostId, 
        courtId: court.id,   
        
        matchDate: new Date(data.matchDate),
        startTime: new Date(`1970-01-01T${data.startTime}:00`),
        
        targetLevel: data.targetLevel,
        gameType: data.gameType,
        genderRequirement: data.genderRequirement,
        ageRequirement: data.ageRequirement,
        costPerPerson: typeof data.costPerPerson === 'string' ? parseInt(data.costPerPerson) || 0 : data.costPerPerson, 
        description: data.description
      }
    });

    return { success: true, matchId: newMatch.id };
  } catch (error) {
    console.error("매칭 방 생성 에러:", error);
    return { success: false, error: "방 생성에 실패했습니다." };
  }
}

// app/actions/match.ts 파일의 맨 아래에 추가합니다.

export async function joinMatchRoom(matchId: string, userId: string) {
  try {
    // 1. 방이 존재하는지, 모집 중인지 확인
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match || match.status !== "OPEN") {
      return { success: false, error: "모집이 마감되었거나 존재하지 않는 방입니다." };
    }

    // 2. 방장은 신청할 필요 없음 (방지)
    if (match.hostId === userId) {
      return { success: false, error: "방장 본인은 이미 참여 중입니다." };
    }

    // 3. 이미 신청한 사람인지 중복 확인
    // (⚠️ 주의: schema.prisma에 MatchParticipant 테이블이 있어야 합니다.)
    const existing = await prisma.matchParticipant.findFirst({
      where: { matchId: matchId, userId: userId }
    });
    
    if (existing) {
      return { success: false, error: "이미 참여 신청한 방입니다." };
    }

    // 4. 참여자 목록에 등록
    await prisma.matchParticipant.create({
      data: {
        matchId: matchId,
        userId: userId
      }
    });

    return { success: true };
  } catch (error) {
    console.error("참여 신청 에러:", error);
    return { success: false, error: "참여 신청 중 오류가 발생했습니다." };
  }
}

// 🟢 1. 신청자 수락/거절 상태 변경 함수
export async function updateParticipantStatus(participantId: string, status: 'ACCEPTED' | 'REJECTED') {
  try {
    await prisma.matchParticipant.update({
      where: { id: participantId },
      data: { status }
    });
    return { success: true };
  } catch (error) {
    console.error("참여자 상태 업데이트 에러:", error);
    return { success: false, error: "상태 변경에 실패했습니다." };
  }
}

// 🔴 2. 모집 마감 처리 함수
export async function closeMatch(matchId: string, userId: string) {
  try {
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match || match.hostId !== userId) {
      return { success: false, error: "방장만 마감할 수 있습니다." };
    }

    await prisma.match.update({
      where: { id: matchId },
      // 👇 CLOSED 대신 스키마에 정의된 FULL(또는 COMPLETED)을 사용합니다!
      data: { status: MatchStatus.FULL } 
    });
    return { success: true };
  } catch (error) {
    console.error("매칭 마감 에러:", error);
    return { success: false, error: "마감 처리에 실패했습니다." };
  }
}