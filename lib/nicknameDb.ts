// lib/nicknameDb.ts
// 서버 내부 전용 (서버 액션이 아니므로 화면에서 직접 호출할 수 없습니다)
import { prisma } from "@/lib/tournamentData"

/**
 * 닉네임 사용 가능 여부 (대소문자 구분 없이 비교, 탈퇴 회원 제외).
 * excludeUserId: 내 프로필 수정 시 "내 현재 닉네임"은 중복으로 보지 않기 위한 값.
 * 화면에서는 app/actions/nickname.ts 의 checkNickname 을 사용하세요.
 */
export async function isNicknameTaken(nickname: string, excludeUserId?: string): Promise<boolean> {
  const found = await prisma.user.findFirst({
    where: {
      nickname: { equals: nickname, mode: "insensitive" },
      deletedAt: null,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  })
  return !!found
}

