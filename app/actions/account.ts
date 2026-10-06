// app/actions/account.ts
"use server"

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

/**
 * 회원 탈퇴 처리.
 *
 * - 소프트 딜리트(deletedAt)로 처리합니다 (기록/히스토리 보존 목적).
 * - 밴(isBanned)된 유저라면, CI/DI를 블랙리스트 테이블에 영구 기록해
 *   이메일/닉네임을 바꿔 재가입해도 본인인증 단계에서 다시 걸리도록 합니다.
 * - 밴되지 않은 일반 유저는 CI/DI를 "회수"해서 나중에 이 사람이
 *   다시 정상적으로 가입할 수 있도록 unique 제약을 풀어줍니다.
 */
export async function withdrawUser(userId: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return { success: false, error: "존재하지 않는 유저입니다." }
    }
    if (user.deletedAt) {
      return { success: false, error: "이미 탈퇴 처리된 계정입니다." }
    }

    await prisma.$transaction(async (tx) => {
      if (user.isBanned) {
        // 블랙리스트에 영구 등록 (이미 등록돼 있으면 건너뜀)
        await tx.bannedIdentity.upsert({
          where: { ciDi: user.ciDi },
          update: {},
          create: {
            ciDi: user.ciDi,
            reason: "비매너/허위구력 등으로 정지된 계정의 탈퇴",
          },
        })
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          deletedAt: new Date(),
          // ciDi의 unique 제약 때문에, 탈퇴 후 재가입 시도 시 값이 겹치지 않도록
          // 원래 값을 보존하되 접두어를 붙여 "무효화"합니다.
          // (밴 유저는 원본 값이 블랙리스트 테이블에 이미 남아있으므로 안전합니다)
          ciDi: `withdrawn_${Date.now()}_${user.ciDi}`,
        },
      })
    })

    return { success: true }
  } catch (error) {
    console.error("회원 탈퇴 처리 에러:", error)
    return { success: false, error: "탈퇴 처리 중 오류가 발생했습니다." }
  }
}
