"use server"

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function createUserInDB(data: { id: string; email: string; nickname: string }) {
  try {
    await prisma.user.create({
      data: {
        id: data.id, // Supabase Auth에서 발급된 고유 ID를 그대로 사용
        email: data.email,
        nickname: data.nickname,
        
        // 필수값이지만 당장 폼에 없는 데이터는 임시값으로 채워줍니다.
        ciDi: `dummy_${Date.now()}`, // 임시 본인인증 값
        tennisLevel: "테린이", // 기본 실력
      }
    })
    return { success: true }
  } catch (error) {
    console.error("DB 생성 에러:", error)
    return { success: false, error: "프로필 생성에 실패했습니다." }
  }
}