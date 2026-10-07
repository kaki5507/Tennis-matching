// app/actions/testSignup.ts
// [테스트 단계 전용] 이메일 인증 없이 가입/로그인되게 해 주는 서버 액션들.
// 켜지는 조건: unverifiedSignupAllowed() (포트원 설정이 완료되기 전) + SUPABASE_SERVICE_ROLE_KEY 가 있을 때만.
// 포트원 3종을 모두 넣으면 자동으로 닫힙니다.
"use server"

import { prisma } from "@/lib/tournamentData"
import { unverifiedSignupAllowed } from "@/lib/portone"
import { getSupabaseAdmin, findAuthUserByEmail } from "@/lib/supabaseAdmin"
import { createUserInDB } from "@/app/actions/auth"

type Result = { success: boolean; error?: string; code?: "DISABLED" }

const DISABLED: Result = { success: false, code: "DISABLED", error: "이메일 인증 건너뛰기가 꺼져 있습니다." }

/** 화면이 버튼/분기를 보여줄지 판단하는 용도 */
export async function getEmailBypassMode(): Promise<{ emailBypass: boolean }> {
  return { emailBypass: unverifiedSignupAllowed() && !!getSupabaseAdmin() }
}

/** 이메일 인증을 이미 끝낸 것으로 처리하고 가입합니다. (가입 후 화면에서 바로 로그인) */
export async function signUpWithoutEmailVerification(data: {
  email: string
  password: string
  nickname: string
  termsAgreed: boolean
  privacyAgreed: boolean
  marketingAgreed?: boolean
  adminCode?: string
}): Promise<Result> {
  const admin = getSupabaseAdmin()
  if (!unverifiedSignupAllowed() || !admin) return DISABLED

  try {
    const email = (data.email ?? "").trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
      return { success: false, error: "이메일 형식이 올바르지 않습니다." }
    }
    if (typeof data.password !== "string" || data.password.length < 6 || data.password.length > 72) {
      return { success: false, error: "비밀번호는 6자 이상으로 입력해주세요." }
    }

    // 1) 이미 있는 이메일 정리
    const existing = await findAuthUserByEmail(admin, email)
    if (existing) {
      const profile = await prisma.user.findUnique({ where: { id: existing.id }, select: { id: true, deletedAt: true } })
      if (profile && !profile.deletedAt) {
        // 이미 가입 완료된 계정 → 인증만 안 돼 있었다면 풀어 줌
        if (!existing.email_confirmed_at) await admin.auth.admin.updateUserById(existing.id, { email_confirm: true })
        return { success: false, error: "이미 가입된 이메일이에요. 로그인해 주세요. (비밀번호를 잊었다면 로그인 화면에서 재설정)" }
      }
      // 프로필이 없는 반쪽짜리 계정(이전에 가입이 중간에 끊김) → 지우고 새로 만듦
      await admin.auth.admin.deleteUser(existing.id)
    }

    // 2) 이메일 인증 완료 상태로 Auth 계정 생성
    const created = await admin.auth.admin.createUser({ email, password: data.password, email_confirm: true })
    if (created.error || !created.data.user) {
      return { success: false, error: created.error?.message ?? "계정 생성에 실패했습니다." }
    }
    const userId = created.data.user.id

    // 3) 우리 DB 프로필 생성 (닉네임 중복/약관 검사 등은 여기서). 실패하면 Auth 계정도 되돌려서 반쪽 가입을 남기지 않음
    const profile = await createUserInDB({
      id: userId,
      email,
      nickname: data.nickname,
      devBypass: true,
      termsAgreed: data.termsAgreed,
      privacyAgreed: data.privacyAgreed,
      marketingAgreed: data.marketingAgreed,
      adminCode: data.adminCode,
      accessToken: null,
    })
    if (!profile.success) {
      await admin.auth.admin.deleteUser(userId).catch(() => {})
      return { success: false, error: profile.error }
    }
    return { success: true }
  } catch (error) {
    console.error("테스트 가입 에러:", error)
    return { success: false, error: "가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." }
  }
}

/** 이미 만들어졌지만 이메일 인증이 안 된 계정을 인증 완료 처리합니다. (로그인 화면의 건너뛰기 버튼) */
export async function confirmEmailForTest(emailRaw: string): Promise<Result> {
  const admin = getSupabaseAdmin()
  if (!unverifiedSignupAllowed() || !admin) return DISABLED
  try {
    const user = await findAuthUserByEmail(admin, emailRaw ?? "")
    if (!user) return { success: false, error: "가입된 이메일을 찾을 수 없어요." }
    if (!user.email_confirmed_at) {
      const { error } = await admin.auth.admin.updateUserById(user.id, { email_confirm: true })
      if (error) return { success: false, error: error.message }
    }
    return { success: true }
  } catch (error) {
    console.error("이메일 인증 처리 에러:", error)
    return { success: false, error: "처리 중 오류가 발생했습니다." }
  }
}
