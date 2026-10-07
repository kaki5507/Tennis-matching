// app/actions/nickname.ts
"use server"

import { isNicknameTaken } from "@/lib/nicknameDb"
import { verifyToken } from "@/lib/serverAuth"
import { normalizeNickname, nicknameFormatError, NICKNAME_TAKEN_MESSAGE } from "@/lib/nickname"

/** 화면의 "닉네임 중복 확인"용. 로그인 토큰이 있으면 본인 닉네임은 제외하고 검사합니다. */
export async function checkNickname(accessToken: string | null, raw: string) {
  try {
    const nickname = normalizeNickname(raw)
    const formatError = nicknameFormatError(nickname)
    if (formatError) return { available: false, message: formatError }

    let excludeUserId: string | undefined
    if (accessToken) {
      const t = await verifyToken(accessToken)
      if (t.ok) excludeUserId = t.id
    }
    const taken = await isNicknameTaken(nickname, excludeUserId)
    return taken
      ? { available: false, message: NICKNAME_TAKEN_MESSAGE }
      : { available: true, message: "사용할 수 있는 닉네임입니다." }
  } catch (error) {
    console.error("닉네임 확인 에러:", error)
    return { available: false, message: "닉네임 확인에 실패했습니다. 잠시 후 다시 시도해주세요." }
  }
}
