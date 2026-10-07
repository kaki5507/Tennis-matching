// app/actions/profile.ts
"use server"

import { Position } from "@prisma/client"
import { prisma } from "@/lib/tournamentData"
import { requireUser } from "@/lib/serverAuth"
import { normalizeNickname, nicknameFormatError, NICKNAME_TAKEN_MESSAGE } from "@/lib/nickname"
import { isNicknameTaken } from "@/lib/nicknameDb"

// 프로필 데이터 타입 설계도 (이메일은 로그인 계정 정보라 여기서 바꿀 수 없습니다)
interface ProfileData {
  email?: string
  nickname: string
  gender: string
  tennisLevel: string
  preferredPos: Position
}

/** 내 프로필 수정 (로그인한 본인만) */
export async function updateProfile(accessToken: string | null, data: ProfileData) {
  try {
    const auth = await requireUser(accessToken)
    if (!auth.ok) return { success: false, error: auth.error }

    const nickname = normalizeNickname(data.nickname)
    const nickError = nicknameFormatError(nickname)
    if (nickError) return { success: false, error: nickError }
    if (await isNicknameTaken(nickname, auth.userId)) {
      return { success: false, error: NICKNAME_TAKEN_MESSAGE }
    }
    if (data.gender !== "MALE" && data.gender !== "FEMALE") {
      return { success: false, error: "성별 값이 올바르지 않습니다." }
    }
    const tennisLevel = (data.tennisLevel ?? "").trim()
    if (!tennisLevel || tennisLevel.length > 30) {
      return { success: false, error: "구력 값이 올바르지 않습니다." }
    }
    if (!Object.values(Position).includes(data.preferredPos)) {
      return { success: false, error: "선호 위치 값이 올바르지 않습니다." }
    }

    // 프로필 "수정"만 허용합니다. 유저 생성은 회원가입(createUserInDB)에서만 이뤄져야
    // 본인인증(CI/DI)과 약관 동의를 반드시 거칩니다.
    await prisma.user.update({
      where: { id: auth.userId },
      data: { nickname, gender: data.gender, tennisLevel, preferredPos: data.preferredPos },
    })

    return { success: true }
  } catch (error) {
    if ((error as { code?: string })?.code === "P2002") {
      return { success: false, error: NICKNAME_TAKEN_MESSAGE }
    }
    console.error("프로필 업데이트 에러:", error)
    return { success: false, error: "프로필 저장에 실패했습니다." }
  }
}

/**
 * 내 프로필 조회 (로그인한 본인만).
 * 본인인증 해시(CI/DI) 등 내부 값은 화면에 내려보내지 않습니다.
 * 다른 사람의 공개 정보는 getUserRecord(전적 조회)를 사용하세요.
 */
export async function getProfile(accessToken: string | null) {
  try {
    const auth = await requireUser(accessToken, { allowBanned: true })
    if (!auth.ok) return { success: false, user: null }

    const u = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        email: true,
        nickname: true,
        gender: true,
        tennisLevel: true,
        preferredPos: true,
        mannerScore: true,
        ntrpScore: true,
        ntrpCount: true,
        levelMismatchCount: true,
        marketingAgreedAt: true,
      },
    })
    if (!u) return { success: false, user: null }

    return {
      success: true,
      user: {
        ...u,
        mannerScore: Number(u.mannerScore),
        ntrpScore: u.ntrpScore === null ? null : Number(u.ntrpScore),
      },
    }
  } catch (error) {
    console.error("get 프로필 조회 에러:", error)
    return { success: false, user: null }
  }
}
