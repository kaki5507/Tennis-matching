"use server"

import { getMaintenanceState, MAINTENANCE_BLOCK_MESSAGE } from "@/lib/maintenance"
import { timingSafeEqual } from "crypto"
import { prisma } from "@/lib/tournamentData"
import { verifyToken } from "@/lib/serverAuth"
import { normalizeNickname, nicknameFormatError, NICKNAME_TAKEN_MESSAGE } from "@/lib/nickname"
import { isNicknameTaken } from "@/lib/nicknameDb"
import { fetchVerifiedIdentity, unverifiedSignupAllowed, unverifiedIdentityFor } from "@/lib/portone"

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

/**
 * 회원가입 마지막 단계: 우리 DB(users)에 프로필 생성.
 *
 * 본인인증 값(CI/DI)은 화면이 보낸 값을 절대 믿지 않습니다.
 *  - 운영: 화면은 포트원 "인증 ID"만 보내고, 서버가 포트원에 직접 물어봐서 CI를 얻습니다.
 *  - 개발: PORTONE_API_SECRET이 없고 production이 아닐 때만 서버가 임의 CI를 만들어 우회를 허용합니다.
 * accessToken이 있으면(이메일 인증 없이 바로 로그인되는 설정) 가입 계정의 id/email과 일치하는지도 확인합니다.
 */
export async function createUserInDB(data: {
  id: string
  email: string
  nickname: string
  identityVerificationId?: string
  devBypass?: boolean
  termsAgreed: boolean
  privacyAgreed: boolean
  marketingAgreed?: boolean
  adminCode?: string // 관리자 초대코드 (맞아야만 실제로 ADMIN 권한 부여됨)
  accessToken?: string | null
}) {
  try {
    // 점검 중에는 신규 가입도 막음 (관리자 초대코드를 입력한 경우만 통과 — 코드 자체는 아래에서 검증)
    if (!data.adminCode && (await getMaintenanceState()).enabled) {
      return { success: false, error: MAINTENANCE_BLOCK_MESSAGE }
    }
    if (!data.termsAgreed || !data.privacyAgreed) {
      return { success: false, error: "이용약관과 개인정보처리방침에 동의해야 가입할 수 있습니다." }
    }

    const nickname = normalizeNickname(data.nickname)
    const nickError = nicknameFormatError(nickname)
    if (nickError) return { success: false, error: nickError }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email ?? "") || data.email.length > 200) {
      return { success: false, error: "이메일 형식이 올바르지 않습니다." }
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id ?? "")) {
      return { success: false, error: "잘못된 요청입니다." }
    }

    // 로그인 토큰이 같이 왔다면 그 계정과 일치해야 함
    if (data.accessToken) {
      const t = await verifyToken(data.accessToken)
      if (!t.ok || t.id !== data.id || (t.email && t.email.toLowerCase() !== data.email.toLowerCase())) {
        return { success: false, error: "가입 계정 정보가 일치하지 않습니다." }
      }
    }

    // CI/DI 결정 (서버에서만)
    let ciDi: string
    if (data.devBypass) {
      // 임시 가입: 서버가 허용 중일 때만. 이메일 기반 고정 식별값을 써서 중복 가입/정지 회원 재가입을 막습니다.
      if (!unverifiedSignupAllowed()) {
        return { success: false, error: "본인인증을 완료해주세요." }
      }
      ciDi = await unverifiedIdentityFor(data.email)
    } else {
      const verified = await fetchVerifiedIdentity(data.identityVerificationId ?? "")
      if (!verified.ok) return { success: false, error: verified.error }
      ciDi = verified.ci
    }

    const banned = await prisma.bannedIdentity.findUnique({ where: { ciDi } })
    if (banned) {
      return { success: false, error: "이용이 제한된 계정입니다. 재가입이 불가합니다." }
    }

    const existing = await prisma.user.findFirst({ where: { ciDi, deletedAt: null } })
    if (existing) {
      return {
        success: false,
        error: data.devBypass
          ? "이미 가입된 이메일이에요. 로그인해 주세요. (비밀번호를 잊었다면 로그인 화면에서 재설정할 수 있어요)"
          : "이미 가입된 본인인증 정보입니다.",
      }
    }

    if (await isNicknameTaken(nickname)) {
      return { success: false, error: NICKNAME_TAKEN_MESSAGE }
    }

    // 관리자 초대코드 검증 — 틀렸으면 그냥 조용히 일반회원으로 가입시킵니다.
    // (틀린 코드라고 에러를 띄우면 코드가 존재한다는 사실 자체가 단서가 되므로 실패를 드러내지 않음)
    const adminSecret = process.env.ADMIN_SIGNUP_CODE
    const isAdmin = !!(data.adminCode && adminSecret && safeEqual(data.adminCode, adminSecret))

    const now = new Date()

    await prisma.user.create({
      data: {
        id: data.id,
        email: data.email,
        nickname,
        ciDi,
        tennisLevel: "NTRP 1.0",
        termsAgreedAt: now,
        privacyAgreedAt: now,
        marketingAgreedAt: data.marketingAgreed ? now : null,
        role: isAdmin ? "ADMIN" : "USER",
      },
    })
    return { success: true }
  } catch (error) {
    // 동시에 같은 닉네임으로 가입한 경우 DB의 유니크 인덱스가 막아줍니다.
    if (isUniqueViolation(error) && (await isNicknameTaken(normalizeNickname(data.nickname)).catch(() => false))) {
      return { success: false, error: NICKNAME_TAKEN_MESSAGE }
    }
    console.error("DB 생성 에러:", error)
    return { success: false, error: "프로필 생성에 실패했습니다." }
  }
}

/** Prisma 유니크 제약 위반(P2002) 여부 */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002"
}
