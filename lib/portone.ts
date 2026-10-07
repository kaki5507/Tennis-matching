// lib/portone.ts
// 포트원(PortOne) 본인인증 결과를 서버에서 직접 재조회합니다. (서버 전용 — "use server" 아님)
// 화면이 보내온 값(CI/DI)은 절대 믿지 않고, 인증 ID로 포트원 서버에 물어본 결과만 사용합니다.

const PORTONE_API_BASE = "https://api.portone.io"

export type VerifiedIdentity =
  | { ok: true; ci: string; name?: string; phone?: string }
  | { ok: false; error: string }

export async function fetchVerifiedIdentity(identityVerificationId: string): Promise<VerifiedIdentity> {
  const apiSecret = process.env.PORTONE_API_SECRET
  if (!apiSecret) {
    console.error("PORTONE_API_SECRET이 설정되지 않았습니다.")
    return { ok: false, error: "본인인증 서비스가 아직 설정되지 않았습니다. 관리자에게 문의해주세요." }
  }
  if (!identityVerificationId || identityVerificationId.length > 200) {
    return { ok: false, error: "본인인증 정보가 올바르지 않습니다." }
  }

  try {
    const res = await fetch(`${PORTONE_API_BASE}/identity-verifications/${encodeURIComponent(identityVerificationId)}`, {
      headers: { Authorization: `PortOne ${apiSecret}` },
      cache: "no-store",
    })
    if (!res.ok) {
      console.error("포트원 본인인증 조회 실패:", res.status, await res.text())
      return { ok: false, error: "본인인증 확인에 실패했습니다. 다시 시도해주세요." }
    }
    const data = await res.json()
    if (data.status !== "VERIFIED") return { ok: false, error: "본인인증이 완료되지 않았습니다." }

    const ci: string | undefined = data.verifiedCustomer?.ci
    if (!ci) return { ok: false, error: "본인인증 정보를 확인할 수 없습니다." }
    return { ok: true, ci, name: data.verifiedCustomer?.name, phone: data.verifiedCustomer?.phoneNumber }
  } catch (error) {
    console.error("본인인증 검증 에러:", error)
    return { ok: false, error: "본인인증 처리 중 오류가 발생했습니다." }
  }
}

/** 포트원 본인인증이 실제로 동작 가능한 상태인지: 서버 비밀키 + 상점 ID + 채널 키가 모두 있어야 함 */
export function portoneFullyConfigured(): boolean {
  return !!(
    process.env.PORTONE_API_SECRET &&
    process.env.NEXT_PUBLIC_PORTONE_STORE_ID &&
    process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY
  )
}

/**
 * 본인인증 없이 가입(임시 가입) 허용 여부.
 *  - 포트원 설정 3종(비밀키/상점ID/채널키)이 모두 있으면 실연동 중이므로 거부
 *  - 하나라도 비어 있으면 본인인증 자체가 불가능하므로 임시 가입을 허용 (테스트/오픈 초기용)
 *  - 설정이 없어도 ALLOW_UNVERIFIED_SIGNUP=false 로 명시하면 거부 (긴급 차단 스위치)
 * PG 계약 후 3종을 모두 넣으면 자동으로 닫힙니다.
 */
export function unverifiedSignupAllowed(): boolean {
  if (portoneFullyConfigured()) return false
  return process.env.ALLOW_UNVERIFIED_SIGNUP !== "false"
}

/** 임시 가입자의 식별값 접두어. 이 접두어가 붙은 사용자는 본인인증을 받지 않은 계정입니다. */
export const UNVERIFIED_CI_PREFIX = "unverified_"

/**
 * 임시 가입자용 식별값: 이메일로부터 항상 같은 값을 만듭니다.
 * (같은 이메일로 중복 가입 불가, 정지된 이메일은 재가입 차단. 이메일을 바꾸면 피할 수 있다는 한계는 있음)
 */
export async function unverifiedIdentityFor(email: string): Promise<string> {
  const data = new TextEncoder().encode(email.trim().toLowerCase())
  const digest = await crypto.subtle.digest("SHA-256", data)
  const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("")
  return `${UNVERIFIED_CI_PREFIX}${hex}`
}

/** 본인인증을 거친 계정인지 (임시 가입/개발용 값이 아니면 true) */
export function isIdentityVerified(ciDi: string): boolean {
  return !ciDi.startsWith(UNVERIFIED_CI_PREFIX) && !ciDi.startsWith("dev_bypass_")
}
