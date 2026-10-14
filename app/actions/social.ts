// app/actions/social.ts
// 간편로그인(구글/카카오) 뒤처리.
//  - 이미 가입한 사람이면 그대로 입장
//  - 처음이면 닉네임/약관 동의를 받아 프로필 생성
//  - 같은 이메일로 이미 이메일 가입한 계정이 있으면 "합치지 않고" 막음 (계정 탈취 방지)
// 서버 액션은 누구나 직접 호출할 수 있으므로 로그인 토큰을 서버에서 검증하고, 제공업체 정보는 관리자 키로 직접 조회합니다.
"use server"

import type { User as AuthUser } from "@supabase/supabase-js"
import { prisma } from "@/lib/tournamentData"
import { verifyToken } from "@/lib/serverAuth"
import { supabase } from "@/lib/supabase"
import { getSupabaseAdmin } from "@/lib/supabaseAdmin"
import { getMaintenanceState, MAINTENANCE_BLOCK_MESSAGE } from "@/lib/maintenance"
import { normalizeNickname, nicknameFormatError, NICKNAME_TAKEN_MESSAGE } from "@/lib/nickname"
import { isNicknameTaken } from "@/lib/nicknameDb"
import { unverifiedIdentityFor } from "@/lib/portone"

const SOCIAL = new Set(["google", "kakao"])

export type SocialStatus =
  | { status: "EXISTS" }
  | { status: "NEEDS_PROFILE"; email: string; suggestedNickname: string }
  | { status: "BLOCKED_EMAIL" }
  | { status: "ERROR"; error: string }

type Ctx =
  | { ok: true; id: string; email: string; auth: AuthUser | null }
  | { ok: false; error: string }

async function loadCtx(accessToken: string | null): Promise<Ctx> {
  const t = await verifyToken(accessToken)
  if (!t.ok) return { ok: false, error: t.error }
  if (!t.email) return { ok: false, error: "이메일 정보를 받아오지 못했어요. 제공업체에서 이메일 제공에 동의했는지 확인해 주세요." }
  // 로그인 토큰으로 직접 조회 → 어떤 제공업체(이메일/구글/카카오)로 가입·로그인했는지 알 수 있음.
  // (관리자 키가 없어도 동작하도록 일반 키로 조회. 관리자 키는 아래 "방금 만든 소셜 계정 정리"에만 선택적으로 사용)
  const { data, error } = await supabase.auth.getUser(accessToken ?? undefined)
  if (error || !data.user) return { ok: false, error: "로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요." }
  const auth: AuthUser = data.user
  return { ok: true, id: t.id, email: t.email, auth }
}

/** 가장 최근에 로그인에 쓴 방식 (email / google / kakao ...) */
function latestProvider(auth: AuthUser | null): string | null {
  const ids = auth?.identities ?? []
  if (ids.length === 0) return null
  return [...ids].sort((a, b) => Date.parse(b.last_sign_in_at ?? "0") - Date.parse(a.last_sign_in_at ?? "0"))[0].provider
}
const hasEmailIdentity = (auth: AuthUser | null) => (auth?.identities ?? []).some((i) => i.provider === "email")

export async function checkSocialLogin(accessToken: string | null): Promise<SocialStatus> {
  try {
    const ctx = await loadCtx(accessToken)
    if (!ctx.ok) return { status: "ERROR", error: ctx.error }

    const viaSocial = SOCIAL.has(latestProvider(ctx.auth) ?? "")
    // 이메일 가입 계정에 구글/카카오가 자동으로 붙은 경우 → 합치지 않고 막음
    if (viaSocial && hasEmailIdentity(ctx.auth)) return { status: "BLOCKED_EMAIL" }

    const profile = await prisma.user.findUnique({ where: { id: ctx.id }, select: { id: true } })
    if (profile) return { status: "EXISTS" }

    // 프로필은 없는데 같은 이메일로 이미 가입한 다른 계정이 있음 → 막고, 방금 생긴 소셜 계정은 정리
    const sameEmail = await prisma.user.findFirst({
      where: { email: { equals: ctx.email, mode: "insensitive" }, deletedAt: null },
      select: { id: true },
    })
    if (sameEmail && sameEmail.id !== ctx.id) {
      if (viaSocial) await getSupabaseAdmin()?.auth.admin.deleteUser(ctx.id).catch(() => {})
      return { status: "BLOCKED_EMAIL" }
    }

    const meta = (ctx.auth?.user_metadata ?? {}) as Record<string, unknown>
    const raw = String(meta.nickname ?? meta.name ?? meta.full_name ?? ctx.email.split("@")[0] ?? "")
    return { status: "NEEDS_PROFILE", email: ctx.email, suggestedNickname: normalizeNickname(raw).slice(0, 20) }
  } catch (e) {
    console.error("[social] 로그인 확인 실패:", e)
    return { status: "ERROR", error: "로그인 확인 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요." }
  }
}

/** 간편로그인 첫 가입: 닉네임과 약관 동의를 받아 프로필을 만듭니다. */
export async function createSocialProfile(
  accessToken: string | null,
  input: { nickname: string; termsAgreed: boolean; privacyAgreed: boolean; marketingAgreed?: boolean },
) {
  try {
    const ctx = await loadCtx(accessToken)
    if (!ctx.ok) return { success: false as const, error: ctx.error }
    // 제공업체를 확인할 수 없으면 열지 않음 (이메일 가입 계정이 이 경로로 본인인증을 건너뛰는 것을 막기 위함)
    if (!ctx.auth) return { success: false as const, error: "로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요." }
    if (!SOCIAL.has(latestProvider(ctx.auth) ?? "") || hasEmailIdentity(ctx.auth)) {
      return { success: false as const, error: "간편로그인으로 로그인한 계정만 사용할 수 있어요." }
    }

    if ((await getMaintenanceState()).enabled) return { success: false as const, error: MAINTENANCE_BLOCK_MESSAGE }
    if (!input.termsAgreed || !input.privacyAgreed) {
      return { success: false as const, error: "이용약관과 개인정보처리방침에 동의해야 가입할 수 있습니다." }
    }
    const nickname = normalizeNickname(input.nickname)
    const nickError = nicknameFormatError(nickname)
    if (nickError) return { success: false as const, error: nickError }

    // 이메일 기반 식별값 → 같은 이메일 중복 가입과 정지 회원의 재가입을 막음 (이메일 가입과 같은 규칙)
    const ciDi = await unverifiedIdentityFor(ctx.email)
    if (await prisma.bannedIdentity.findUnique({ where: { ciDi } })) {
      return { success: false as const, error: "이용이 제한된 계정입니다. 재가입이 불가합니다." }
    }
    if (await prisma.user.findFirst({ where: { OR: [{ ciDi }, { email: { equals: ctx.email, mode: "insensitive" } }], deletedAt: null, NOT: { id: ctx.id } } })) {
      return { success: false as const, error: "이미 가입된 이메일이에요. 이메일로 로그인해 주세요." }
    }
    if (await isNicknameTaken(nickname)) return { success: false as const, error: NICKNAME_TAKEN_MESSAGE }

    const now = new Date()
    await prisma.user.create({
      data: {
        id: ctx.id,
        email: ctx.email,
        nickname,
        ciDi,
        tennisLevel: "NTRP 1.0",
        termsAgreedAt: now,
        privacyAgreedAt: now,
        marketingAgreedAt: input.marketingAgreed ? now : null,
        role: "USER",
      },
    })
    return { success: true as const }
  } catch (e) {
    if (typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002") {
      return { success: false as const, error: NICKNAME_TAKEN_MESSAGE }
    }
    console.error("[social] 프로필 생성 실패:", e)
    return { success: false as const, error: "프로필 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." }
  }
}
