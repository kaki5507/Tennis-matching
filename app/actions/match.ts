// app/actions/match.ts
"use server"
import { PrismaClient, MatchStatus } from "@prisma/client"

const prisma = new PrismaClient()

// 💡 폼에서 넘어오는 데이터들의 '타입 설계도'를 만들어 줍니다.
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

export async function joinMatchRoom(matchId: string, userId: string) {
  try {
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match || match.status !== "OPEN") {
      return { success: false, error: "모집이 마감되었거나 존재하지 않는 방입니다." };
    }

    if (match.hostId === userId) {
      return { success: false, error: "방장 본인은 이미 참여 중입니다." };
    }

    const existing = await prisma.matchParticipant.findFirst({
      where: { matchId: matchId, userId: userId }
    });
    
    if (existing) {
      return { success: false, error: "이미 참여 신청한 방입니다." };
    }

    // 🌟 [NEW] 레벨 제한 검사 로직 (방의 targetLevel이 "ANY"나 "누구나"가 아닐 때만 검사)
    if (match.targetLevel !== "ANY" && match.targetLevel !== "누구나") {
      
      const user = await prisma.user.findUnique({ where: { id: userId } });
      
      // 방의 targetLevel이 "1.5-2.5" 같은 형태라고 가정하고 숫자를 추출
      const levels = match.targetLevel.match(/[\d\.]+/g); 
      
      if (levels && levels.length >= 2 && user) {
        const minLevel = parseFloat(levels[0]); // 예: 1.5
        const maxLevel = parseFloat(levels[1]); // 예: 2.5
        
        // 내 점수 가져오기 (평가 3회 미만이라 점수가 없으면 가입 불가로 막거나, 기본 2.0으로 쳐줌)
        // 여기서는 평가 3회 이상인 '진짜 점수'만 인정하는 빡빡한 룰을 적용해 봅니다.
        if (user.ntrpCount < 3 || !user.ntrpScore) {
           return { success: false, error: "레벨 제한이 있는 방은 NTRP 검증(평가 3회 이상)이 완료된 후 참여할 수 있습니다." };
        }

        // 비교할 때도 남들에게 보여지는 '0.5 단위 반올림 점수'를 기준으로 비교합니다.
        const myDisplayScore = Math.round(Number(user.ntrpScore) * 2) / 2;

        if (myDisplayScore < minLevel || myDisplayScore > maxLevel) {
          return { 
            success: false, 
            error: `이 방은 NTRP ${minLevel.toFixed(1)} ~ ${maxLevel.toFixed(1)} 레벨만 참여 가능합니다.\n(현재 내 레벨: ${myDisplayScore.toFixed(1)})` 
          };
        }
      }
    }

    await prisma.matchParticipant.create({
      data: { matchId, userId }
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
      data: { status: MatchStatus.FULL } 
    });
    return { success: true };
  } catch (error) {
    console.error("매칭 마감 에러:", error);
    return { success: false, error: "마감 처리에 실패했습니다." };
  }
}

// 🌟 3. [NEW] 경기 완료 처리 함수 (동료 평가 시작용)
export async function completeMatchAction(matchId: string, hostId: string) {
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { hostId: true }
    });

    if (!match || match.hostId !== hostId) {
      return { success: false, error: "권한이 없습니다. (방장만 가능)" };
    }

    await prisma.match.update({
      where: { id: matchId },
      data: { status: MatchStatus.COMPLETED } // Prisma의 MatchStatus Enum 사용
    });

    return { success: true };
  } catch (error) {
    console.error("경기 완료 처리 에러:", error);
    return { success: false, error: "경기 상태 업데이트에 실패했습니다." };
  }
}