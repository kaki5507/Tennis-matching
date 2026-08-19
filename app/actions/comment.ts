// app/actions/comment.ts
"use server"

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// 1. 특정 방의 댓글 목록을 모두 가져오는 함수
export async function getComments(matchId: string) {
  try {
    const comments = await prisma.matchComment.findMany({
      where: { matchId },
      // 댓글 쓴 사람의 닉네임과 이메일도 같이 가져옵니다 (조인)
      include: {
        user: {
          select: {
            nickname: true,
            email: true,
          }
        }
      },
      orderBy: { createdAt: 'asc' } // 옛날 댓글부터 순서대로
    });
    return { success: true, comments };
  } catch (error) {
    console.error("댓글 불러오기 에러:", error);
    return { success: false, comments: [] };
  }
}

// 2. 새로운 댓글을 DB에 저장하는 함수
export async function addComment(matchId: string, userId: string, content: string) {
  if (!content.trim()) return { success: false, error: "내용을 입력해주세요." };

  try {
    await prisma.matchComment.create({
      data: {
        matchId,
        userId,
        content
      }
    });
    return { success: true };
  } catch (error) {
    console.error("댓글 작성 에러:", error);
    return { success: false, error: "댓글 작성에 실패했습니다." };
  }
}