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

/** 개발용 본인인증 우회 허용 여부: 운영(production)이거나 포트원 키가 있으면 항상 거부 */
export function devBypassAllowed(): boolean {
  return process.env.NODE_ENV !== "production" && !process.env.PORTONE_API_SECRET
}
