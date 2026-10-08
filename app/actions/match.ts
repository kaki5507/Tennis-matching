// app/actions/match.ts
"use server"
import { MatchStatus } from "@prisma/client"
import { prisma } from "@/lib/tournamentData"
import { requireUser } from "@/lib/serverAuth"
import { sendPushToUser, sendPushToUsers } from "@/lib/push"


// 💡 폼에서 넘어오는 데이터들의 '타입 설계도'를 만들어 줍니다.
interface CreateMatchInput {
  courtId: string; // [변경] 더 이상 자동으로 첫 코트를 쓰지 않고, 검색해서 선택한 코트를 받습니다.
  matchDate: string;
  startTime: string;
  targetLevel: string;
  gameType: string;
  genderRequirement: string;
  ageRequirement: string;
  costPerPerson: string | number; // 문자로 올 수도 있고 숫자로 올 수도 있음
  description: string;
  minMannerScore?: string | number | null; // [NEW] 참여 최소 매너온도, 빈 값이면 제한없음
}

export async function createMatchRoom(accessToken: string | null, data: CreateMatchInput) {
  try {
    const auth = await requireUser(accessToken)
    if (!auth.ok) return { success: false, error: auth.error }

    // 입력값 검증 (화면 검증은 우회될 수 있으므로 서버에서도 확인)
    const cost = typeof data.costPerPerson === "string" ? parseInt(data.costPerPerson) || 0 : data.costPerPerson
    if (!Number.isFinite(cost) || cost < 0 || cost > 1_000_000) {
      return { success: false, error: "참가비는 0원 ~ 100만원 사이로 입력해주세요." }
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.matchDate ?? "") || Number.isNaN(new Date(data.matchDate).getTime())) {
      return { success: false, error: "경기 날짜가 올바르지 않습니다." }
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.startTime ?? "")) {
      return { success: false, error: "시작 시간이 올바르지 않습니다." }
    }
    // 과거 시각/너무 먼 미래 거부 (한국 시간 기준. 날짜·시간 모두 한국 시간으로 입력된 값)
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString() // 'YYYY-MM-DDTHH:mm:ss.sssZ' (KST 벽시계)
    if (`${data.matchDate}T${data.startTime}` < kstNow.slice(0, 16)) {
      return { success: false, error: "이미 지난 날짜·시간에는 방을 만들 수 없습니다." }
    }
    const limit = new Date(Date.now() + (9 * 60 + 366 * 24 * 60) * 60 * 1000).toISOString().slice(0, 10)
    if (data.matchDate > limit) {
      return { success: false, error: "경기 날짜는 오늘로부터 1년 이내로 입력해주세요." }
    }
    if ((data.description ?? "").length > 2000) {
      return { success: false, error: "상세 설명은 2000자 이내로 작성해주세요." }
    }
    for (const v of [data.targetLevel, data.gameType, data.genderRequirement, data.ageRequirement]) {
      if (!v || v.length > 50) return { success: false, error: "모집 조건 값이 올바르지 않습니다." }
    }

    let minManner: number | null = null
    if (data.minMannerScore !== undefined && data.minMannerScore !== null && data.minMannerScore !== "") {
      minManner = typeof data.minMannerScore === "string" ? parseFloat(data.minMannerScore) : data.minMannerScore
      if (!Number.isFinite(minManner) || minManner < 0 || minManner > 99) {
        return { success: false, error: "최소 매너온도 값이 올바르지 않습니다." }
      }
    }

    // 1. 코트 존재 여부 확인 (프론트에서 findOrCreateCourt로 미리 만들어서 넘겨주지만, 방어적으로 한 번 더 확인)
    const court = await prisma.court.findUnique({ where: { id: data.courtId } });
    if (!court) {
      return { success: false, error: "선택한 테니스장 정보를 찾을 수 없습니다. 다시 검색해주세요." };
    }

    // 2. 사용자가 입력한 데이터로 매칭 방(Match) 생성
    const newMatch = await prisma.match.create({
      data: {
        hostId: auth.userId,
        courtId: court.id,   
        
        matchDate: new Date(data.matchDate),
        startTime: new Date(`1970-01-01T${data.startTime}:00`),
        
        targetLevel: data.targetLevel,
        gameType: data.gameType,
        genderRequirement: data.genderRequirement,
        ageRequirement: data.ageRequirement,
        costPerPerson: cost,
        description: data.description,
        minMannerScore: minManner,
      }
    });

    return { success: true, matchId: newMatch.id };
  } catch (error) {
    console.error("매칭 방 생성 에러:", error);
    return { success: false, error: "방 생성에 실패했습니다." };
  }
}

export async function joinMatchRoom(accessToken: string | null, matchId: string) {
  try {
    const auth = await requireUser(accessToken)
    if (!auth.ok) return { success: false, error: auth.error }
    const userId = auth.userId

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

    // 🌟 [NEW] 매너 온도 최소기준 검사 (레벨 검사와 별개로, 방장이 설정한 경우에만)
    if (match.minMannerScore !== null) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const myMannerScore = user ? Number(user.mannerScore) : 36.5;

      if (myMannerScore < Number(match.minMannerScore)) {
        return {
          success: false,
          error: `이 방은 매너 온도 ${Number(match.minMannerScore).toFixed(1)}도 이상만 참여 가능합니다.\n(현재 내 매너 온도: ${myMannerScore.toFixed(1)}도)`,
        };
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
export async function updateParticipantStatus(accessToken: string | null, participantId: string, status: 'ACCEPTED' | 'REJECTED') {
  try {
    const auth = await requireUser(accessToken)
    if (!auth.ok) return { success: false, error: auth.error }
    if (status !== 'ACCEPTED' && status !== 'REJECTED') return { success: false, error: "잘못된 요청입니다." }

    // 방장만 수락/거절할 수 있습니다.
    const target = await prisma.matchParticipant.findUnique({
      where: { id: participantId },
      include: { match: { select: { hostId: true, status: true } } },
    })
    if (!target) return { success: false, error: "신청 내역을 찾을 수 없습니다." }
    if (target.match.hostId !== auth.userId) return { success: false, error: "방장만 수락/거절할 수 있습니다." }
    if (target.match.status === "COMPLETED" || target.match.status === "CANCELED") {
      return { success: false, error: "이미 끝났거나 취소된 방입니다." }
    }
    if (target.status === status) return { success: true } // 변화 없음: 알림 중복 발송 방지

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
export async function closeMatch(accessToken: string | null, matchId: string) {
  try {
    const auth = await requireUser(accessToken)
    if (!auth.ok) return { success: false, error: auth.error }

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match || match.hostId !== auth.userId) {
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
export async function completeMatchAction(accessToken: string | null, matchId: string) {
  try {
    const auth = await requireUser(accessToken)
    if (!auth.ok) return { success: false, error: auth.error }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { hostId: true, status: true }
    });

    if (!match || match.hostId !== auth.userId) {
      return { success: false, error: "권한이 없습니다. (방장만 가능)" };
    }
    if (match.status === "COMPLETED") return { success: false, error: "이미 완료 처리된 경기입니다." };
    if (match.status === "CANCELED") return { success: false, error: "취소된 경기입니다." };

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

interface UpdateMatchInput {
  matchDate: string
  startTime: string
  costPerPerson: string | number
  description: string
}

/** 방장이 모집 중인 방의 날짜·시간·참가비·설명을 고칩니다. 신청자/참가자에게 변경 알림을 보냅니다. */
export async function updateMatchRoom(accessToken: string | null, matchId: string, data: UpdateMatchInput) {
  try {
    const auth = await requireUser(accessToken)
    if (!auth.ok) return { success: false, error: auth.error }

    const match = await prisma.match.findUnique({ where: { id: matchId }, select: { hostId: true, status: true, deletedAt: true } })
    if (!match || match.deletedAt || match.hostId !== auth.userId) return { success: false, error: "권한이 없습니다. (방장만 가능)" }
    if (match.status !== "OPEN") return { success: false, error: "모집 중인 방만 수정할 수 있어요." }

    const cost = typeof data.costPerPerson === "string" ? parseInt(data.costPerPerson) || 0 : data.costPerPerson
    if (!Number.isFinite(cost) || cost < 0 || cost > 1_000_000) return { success: false, error: "참가비는 0원 ~ 100만원 사이로 입력해주세요." }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.matchDate ?? "") || Number.isNaN(new Date(data.matchDate).getTime())) return { success: false, error: "경기 날짜가 올바르지 않습니다." }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.startTime ?? "")) return { success: false, error: "시작 시간이 올바르지 않습니다." }
    const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString()
    if (`${data.matchDate}T${data.startTime}` < kstNow.slice(0, 16)) return { success: false, error: "이미 지난 날짜·시간으로는 바꿀 수 없어요." }
    if ((data.description ?? "").length > 2000) return { success: false, error: "상세 설명은 2000자 이내로 작성해주세요." }

    await prisma.match.update({
      where: { id: matchId },
      data: {
        matchDate: new Date(data.matchDate),
        startTime: new Date(`1970-01-01T${data.startTime}:00`),
        costPerPerson: cost,
        description: data.description,
      },
    })

    const people = await prisma.matchParticipant.findMany({
      where: { matchId, status: { in: ["ACCEPTED", "PENDING"] } },
      select: { userId: true },
    })
    await sendPushToUsers(
      people.map((p) => p.userId),
      { title: "방 정보가 수정됐어요", body: `${data.matchDate} ${data.startTime} · 참가비 ${cost.toLocaleString()}원. 내용을 확인해 주세요.`, url: `/matches/${matchId}` }
    )
    return { success: true }
  } catch (error) {
    console.error("방 수정 에러:", error)
    return { success: false, error: "방 정보를 수정하지 못했습니다." }
  }
}
