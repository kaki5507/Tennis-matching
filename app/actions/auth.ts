"use server"

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function createUserInDB(data: {
  id: string
  email: string
  nickname: string
  ciDi: string
  termsAgreed: boolean // [NEW] 이용약관 동의 여부 (필수)
  privacyAgreed: boolean // [NEW] 개인정보처리방침 동의 여부 (필수)
  marketingAgreed?: boolean // [NEW] 마케팅/알림 수신 동의 (선택)
}) {
  try {
    // 필수 동의 없이는 가입 자체를 막습니다. (프론트에서 이미 막지만, 서버에서도 반드시 재검증)
    if (!data.termsAgreed || !data.privacyAgreed) {
      return { success: false, error: "이용약관과 개인정보처리방침에 동의해야 가입할 수 있습니다." }
    }

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

    const now = new Date()

    await prisma.user.create({
      data: {
        id: data.id, // Supabase Auth에서 발급된 고유 ID를 그대로 사용
        email: data.email,
        nickname: data.nickname,
        ciDi: data.ciDi,
        tennisLevel: "테린이", // 기본 실력 (프로필 설정 페이지에서 수정)
        // 동의 "여부"가 아니라 "동의한 시점"을 저장해야 나중에 분쟁 시 증빙이 됩니다.
        termsAgreedAt: now,
        privacyAgreedAt: now,
        marketingAgreedAt: data.marketingAgreed ? now : null,
      }
    })
    return { success: true }
  } catch (error) {
    console.error("DB 생성 에러:", error)
    return { success: false, error: "프로필 생성에 실패했습니다." }
  }
}