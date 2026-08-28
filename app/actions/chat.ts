// app/actions/chat.ts
"use server"

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// 1. 채팅 메시지 불러오기 (과거 순부터 정렬)
export async function getMatchChats(matchId: string) {
  try {
    const chats = await prisma.matchChat.findMany({
      where: { matchId },
      include: {
        user: { select: { id: true, nickname: true } } // 보낸 사람 닉네임 가져오기
      },
      orderBy: { createdAt: "asc" }
    });
    return { success: true, chats };
  } catch (error) {
    console.error("채팅 로드 에러:", error);
    return { success: false, chats: [] };
  }
}

// 2. 새로운 채팅 메시지 보내기
export async function sendMatchChat(matchId: string, userId: string, message: string) {
  try {
    if (!message.trim()) return { success: false, error: "메시지를 입력해주세요." };

    await prisma.matchChat.create({
      data: {
        matchId,
        userId,
        message: message.trim()
      }
    });

    return { success: true };
  } catch (error) {
    console.error("채팅 전송 에러:", error);
    return { success: false, error: "메시지 전송에 실패했습니다." };
  }
}