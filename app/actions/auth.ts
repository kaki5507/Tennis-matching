"use server"

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function createUserInDB(data: {
  id: string
  email: string
  nickname: string
  ciDi: string // [변경] 본인인증을 통해 검증된 실제 CI/DI. 더 이상 더미값을 쓰지 않습니다.
}) {
  try {
    // 방어적 재검증: 가입 요청 사이에 다른 유저가 먼저 가입했거나,
    // 그 사이 밴 처리가 된 경우를 대비해 DB 저장 직전에 한 번 더 확인합니다.
    const banned = await prisma.bannedIdentity.findUnique({ where: { ciDi: data.ciDi } })
    if (banned) {
      return { success: false, error: "이용이 제한된 계정입니다. 재가입이 불가합니다." }
    }

    const existing = await prisma.user.findFirst({
      where: { ciDi: data.ciDi, deletedAt: null },
    })
    if (existing) {
      return { success: false, error: "이미 가입된 본인인증 정보입니다." }
    }

    await prisma.user.create({
      data: {
        id: data.id, // Supabase Auth에서 발급된 고유 ID를 그대로 사용
        email: data.email,
        nickname: data.nickname,
        ciDi: data.ciDi,
        tennisLevel: "테린이", // 기본 실력 (프로필 설정 페이지에서 수정)
      }
    })
    return { success: true }
  } catch (error) {
    console.error("DB 생성 에러:", error)
    return { success: false, error: "프로필 생성에 실패했습니다." }
  }
}