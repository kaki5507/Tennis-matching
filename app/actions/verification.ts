// app/actions/verification.ts
// 가입 화면용 본인인증 사전 확인. 실제 가입 시에는 createUserInDB가 서버에서 다시 검증하므로
// 여기서는 CI/DI 같은 민감 값을 화면에 돌려주지 않습니다.
"use server"

import { prisma } from "@/lib/tournamentData"
import { fetchVerifiedIdentity, devBypassAllowed } from "@/lib/portone"

interface VerificationResult {
  success: boolean
  name?: string
  error?: string
}

/**
 * 포트원 본인인증이 끝난 뒤 발급된 identityVerificationId를 서버에서 재조회해
 * 진짜 인증이 완료됐는지, 가입 가능한 사람(차단/중복 아님)인지 미리 알려줍니다.
 */
export async function completeIdentityVerification(identityVerificationId: string): Promise<VerificationResult> {
  const verified = await fetchVerifiedIdentity(identityVerificationId)
  if (!verified.ok) return { success: false, error: verified.error }

  // 1. 블랙리스트(밴 이력) 체크 — 가장 먼저 막아야 함
  const banned = await prisma.bannedIdentity.findUnique({ where: { ciDi: verified.ci } })
  if (banned) return { success: false, error: "이용이 제한된 계정입니다. 재가입이 불가합니다." }

  // 2. 이미 활성 상태로 가입된 유저인지 체크 (탈퇴하지 않은 유저)
  const existing = await prisma.user.findFirst({ where: { ciDi: verified.ci, deletedAt: null } })
  if (existing) return { success: false, error: "이미 가입된 본인인증 정보입니다." }

  return { success: true, name: verified.name }
}

/**
 * ⚠️ 개발 환경 전용 — 포트원 PG 계약 전 가입 흐름을 테스트하기 위한 우회.
 * production이거나 PORTONE_API_SECRET이 설정돼 있으면 항상 거부됩니다.
 * (실제 우회 가입은 createUserInDB가 devBypass 플래그로 서버에서 다시 한 번 같은 조건을 검사합니다)
 */
export async function devBypassIdentityVerification(): Promise<VerificationResult> {
  if (!devBypassAllowed()) {
    return { success: false, error: "이 기능은 개발 환경에서만 사용할 수 있습니다." }
  }
  return { success: true, name: "테스트유저" }
}
