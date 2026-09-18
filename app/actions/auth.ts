"use server"

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function createUserInDB(data: {
  id: string
  email: string
  nickname: string
  ciDi: string
  termsAgreed: boolean
  privacyAgreed: boolean
  marketingAgreed?: boolean
  adminCode?: string // [NEW] 관리자 초대코드 (맞아야만 실제로 ADMIN 권한 부여됨)
}) {
  try {
    if (!data.termsAgreed || !data.privacyAgreed) {
      return { success: false, error: "이용약관과 개인정보처리방침에 동의해야 가입할 수 있습니다." }
    }

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

    // [NEW] 관리자 초대코드 검증 — 틀렸으면 그냥 조용히 일반회원으로 가입시킵니다.
    // (틀린 코드라고 에러를 띄우면, 공격자가 코드가 존재한다는 사실 자체를
    //  알아낼 실마리가 되므로, 일부러 실패를 드러내지 않습니다)
    const adminSecret = process.env.ADMIN_SIGNUP_CODE
    const isAdmin = !!(data.adminCode && adminSecret && data.adminCode === adminSecret)

    const now = new Date()

    await prisma.user.create({
      data: {
        id: data.id,
        email: data.email,
        nickname: data.nickname,
        ciDi: data.ciDi,
        tennisLevel: "테린이",
        termsAgreedAt: now,
        privacyAgreedAt: now,
        marketingAgreedAt: data.marketingAgreed ? now : null,
        role: isAdmin ? "ADMIN" : "USER",
      }
    })
    return { success: true }
  } catch (error) {
    console.error("DB 생성 에러:", error)
    return { success: false, error: "프로필 생성에 실패했습니다." }
  }
}