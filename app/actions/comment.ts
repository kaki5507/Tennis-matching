// app/actions/comment.ts
"use server"

import { prisma } from "@/lib/tournamentData"
import { requireUser } from "@/lib/serverAuth"

// 1. 특정 방의 댓글 목록을 모두 가져오는 함수 (방 상세는 공개 페이지라 로그인 없이 조회 가능, 이메일은 내려주지 않음)
export async function getComments(matchId: string) {
  try {
    const comments = await prisma.matchComment.findMany({
      where: { matchId },
      include: { user: { select: { nickname: true } } },
      orderBy: { createdAt: 'asc' }, // 옛날 댓글부터 순서대로
      take: 500,
    });
    return { success: true, comments };
  } catch (error) {
    console.error("댓글 불러오기 에러:", error);
    return { success: false, comments: [] };
  }
}

// 2. 새로운 댓글을 DB에 저장하는 함수 (로그인한 본인 명의로만)
export async function addComment(accessToken: string | null, matchId: string, content: string) {
  const auth = await requireUser(accessToken)
  if (!auth.ok) return { success: false, error: auth.error };

  const text = (content ?? "").trim()
  if (!text) return { success: false, error: "내용을 입력해주세요." };
  if (text.length > 1000) return { success: false, error: "댓글은 1000자 이내로 작성해주세요." };

  try {
    const match = await prisma.match.findUnique({ where: { id: matchId }, select: { id: true } })
    if (!match) return { success: false, error: "존재하지 않는 방입니다." };

    await prisma.matchComment.create({
      data: { matchId, userId: auth.userId, content: text }
    });
    return { success: true };
  } catch (error) {
    console.error("댓글 작성 에러:", error);
    return { success: false, error: "댓글 작성에 실패했습니다." };
  }
}
