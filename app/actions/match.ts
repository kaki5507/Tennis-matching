// app/actions/match.ts
"use server"
import { PrismaClient, MatchStatus } from "@prisma/client"
import { sendPushToUser, sendPushToUsers } from "@/app/actions/notification"

const prisma = new PrismaClient()

// 💡 폼에서 넘어오는 데이터들의 '타입 설계도'를 만들어 줍니다.
interface CreateMatchInput {
  hostId: string;
  courtId: string; // [변경] 더 이상 자동으로 첫 코트를 쓰지 않고, 검색해서 선택한 코트를 받습니다.
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
    // 1. 코트 존재 여부 확인 (프론트에서 findOrCreateCourt로 미리 만들어서 넘겨주지만, 방어적으로 한 번 더 확인)
    const court = await prisma.court.findUnique({ where: { id: data.courtId } });
    if (!court) {
      return { success: false, error: "선택한 테니스장 정보를 찾을 수 없습니다. 다시 검색해주세요." };
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
    const participant = await prisma.matchParticipant.update({
      where: { id: participantId },
      data: { status },
    });

    // 신청자에게 결과 알림 (알림 수신 동의한 유저에게만 실제 푸시가 나가고,
    // 동의 여부와 무관하게 인앱 알림함엔 항상 남습니다)
    const title = status === 'ACCEPTED' ? '매칭이 수락됐어요! 🎾' : '매칭 신청 결과 안내';
    const body =
      status === 'ACCEPTED'
        ? '신청하신 매칭에 참여가 확정됐습니다. 상세 페이지에서 확인해보세요.'
        : '아쉽게도 이번 매칭엔 참여가 어렵게 됐어요. 다른 매칭을 찾아보세요.';

    await sendPushToUser(participant.userId, {
      title,
      body,
      url: `/matches/${participant.matchId}`,
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

    // 수락된 참여자 전원에게 "이제 서로 평가해주세요" 알림 발송
    const acceptedParticipants = await prisma.matchParticipant.findMany({
      where: { matchId, status: 'ACCEPTED' },
      select: { userId: true },
    });

    await sendPushToUsers(
      acceptedParticipants.map((p) => p.userId),
      {
        title: '경기가 종료됐어요! 평가를 남겨주세요 📝',
        body: '함께 경기한 분들에 대한 블라인드 평가를 남기면 매너 온도에 반영돼요.',
        url: `/matches/${matchId}`,
      }
    );

    return { success: true };
  } catch (error) {
    console.error("경기 완료 처리 에러:", error);
    return { success: false, error: "경기 상태 업데이트에 실패했습니다." };
  }
}