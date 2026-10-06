// app/actions/chat.ts
"use server"

import { prisma } from "@/lib/tournamentData"
import { requireUser } from "@/lib/serverAuth"

/** 방장이거나 수락된(ACCEPTED) 참가자만 그 방 채팅에 접근할 수 있습니다. */
async function canAccessChat(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId }, select: { hostId: true } })
  if (!match) return false
  if (match.hostId === userId) return true
  const p = await prisma.matchParticipant.findFirst({ where: { matchId, userId, status: "ACCEPTED" }, select: { id: true } })
  return !!p
}

// 1. 채팅 메시지 불러오기 (과거 순부터 정렬)
export async function getMatchChats(accessToken: string | null, matchId: string) {
  try {
    const auth = await requireUser(accessToken, { allowBanned: true })
    if (!auth.ok || !(await canAccessChat(matchId, auth.userId))) return { success: false, chats: [] }

    const chats = await prisma.matchChat.findMany({
      where: { matchId },
      include: {
        user: { select: { id: true, nickname: true } } // 보낸 사람 닉네임 가져오기
      },
      orderBy: { createdAt: "asc" },
      take: 500,
    });
    return { success: true, chats };
  } catch (error) {
    console.error("채팅 로드 에러:", error);
    return { success: false, chats: [] };
  }
}

// 2. 새로운 채팅 메시지 보내기
export async function sendMatchChat(accessToken: string | null, matchId: string, message: string) {
  try {
    const auth = await requireUser(accessToken)
    if (!auth.ok) return { success: false, error: auth.error };
    if (!(await canAccessChat(matchId, auth.userId))) return { success: false, error: "이 방의 참가자만 채팅할 수 있어요." };

    const text = (message ?? "").trim()
    if (!text) return { success: false, error: "메시지를 입력해주세요." };
    if (text.length > 1000) return { success: false, error: "메시지는 1000자 이내로 작성해주세요." };

    await prisma.matchChat.create({
      data: { matchId, userId: auth.userId, message: text }
    });

    return { success: true };
  } catch (error) {
    console.error("채팅 전송 에러:", error);
    return { success: false, error: "메시지 전송에 실패했습니다." };
  }
}
