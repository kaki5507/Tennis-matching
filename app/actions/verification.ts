// app/actions/verification.ts
"use server"

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// 포트원 V2 REST API 베이스 URL
const PORTONE_API_BASE = "https://api.portone.io"

interface VerificationResult {
  success: boolean
  ciDi?: string // CI/DI를 우리 서비스에서 쓸 고유 식별값 (실제로는 CI 하나만 써도 충분)
  name?: string
  phone?: string
  error?: string
}

/**
 * 프론트엔드(PortOne Browser SDK)에서 본인인증이 끝난 뒤 발급된
 * identityVerificationId를 받아, 포트원 서버에 진짜 인증 결과인지 재조회합니다.
 * (프론트에서 끝났다고 보내온 값을 그대로 믿으면 위변조 위험이 있어 반드시 서버 재검증이 필요합니다)
 */
export async function completeIdentityVerification(
  identityVerificationId: string
): Promise<VerificationResult> {
  const apiSecret = process.env.PORTONE_API_SECRET

  if (!apiSecret) {
    // 포트원 계정/키가 아직 세팅되지 않은 개발 초기 상태를 위한 안전장치.
    // 실서비스 배포 전에는 반드시 .env에 PORTONE_API_SECRET을 채워야 합니다.
    console.error(
      "PORTONE_API_SECRET이 설정되지 않았습니다. .env.example을 참고해 환경변수를 채워주세요."
    )
    return {
      success: false,
      error: "본인인증 서비스가 아직 설정되지 않았습니다. 관리자에게 문의해주세요.",
    }
  }
  try {
    const res = await fetch(
      `${PORTONE_API_BASE}/identity-verifications/${encodeURIComponent(
        identityVerificationId
      )}`,
      {
        headers: {
          Authorization: `PortOne ${apiSecret}`,
        },
        cache: "no-store",
      }
    )

    if (!res.ok) {
      console.error("포트원 본인인증 조회 실패:", res.status, await res.text())
      return { success: false, error: "본인인증 확인에 실패했습니다. 다시 시도해주세요." }
    }

    const data = await res.json()

    // 포트원 응답 구조: data.status === "VERIFIED" 일 때만 신뢰
    if (data.status !== "VERIFIED") {
      return { success: false, error: "본인인증이 완료되지 않았습니다." }
    }

    const verifiedInfo = data.verifiedCustomer
    const ci: string | undefined = verifiedInfo?.ci
    const name: string | undefined = verifiedInfo?.name
    const phone: string | undefined = verifiedInfo?.phoneNumber

    if (!ci) {
      return { success: false, error: "본인인증 정보를 확인할 수 없습니다." }
    }

    // 1. 블랙리스트(밴 이력) 체크 — 가장 먼저 막아야 함
    const banned = await prisma.bannedIdentity.findUnique({ where: { ciDi: ci } })
    if (banned) {
      return {
        success: false,
        error: "이용이 제한된 계정입니다. 재가입이 불가합니다.",
      }
    }

    // 2. 이미 활성 상태로 가입된 유저인지 체크 (탈퇴하지 않은 유저)
    const existing = await prisma.user.findFirst({
      where: { ciDi: ci, deletedAt: null },
    })
    if (existing) {
      return { success: false, error: "이미 가입된 본인인증 정보입니다." }
    }

    return { success: true, ciDi: ci, name, phone }
  } catch (error) {
    console.error("본인인증 검증 에러:", error)
    return { success: false, error: "본인인증 처리 중 오류가 발생했습니다." }
  }
}

/**
 * ⚠️ 개발 환경 전용 — 포트원 PG 계약이 완료되기 전, 회원가입 플로우 전체를
 * 테스트할 수 있도록 본인인증을 건너뛰는 함수입니다.
 *
 * 이중 안전장치:
 * 1) NODE_ENV가 production이면 무조건 차단
 * 2) PORTONE_API_SECRET이 이미 설정되어 있다면(=실연동 준비 완료) 이것도 차단
 *    (실연동 키가 있는데 우회를 쓰는 건 의미가 없고, 실수로 우회가 남아있는
 *     상태로 오픈하는 사고를 막기 위함)
 *
 * PG 계약이 끝나면 이 함수는 더 이상 호출되지 않게 되고(프론트에서 버튼이
 * 사라짐), 그대로 코드에 남겨둬도 안전하지만 정리하고 싶다면 지워도 됩니다.
 */
export async function devBypassIdentityVerification(): Promise<VerificationResult> {
  if (process.env.NODE_ENV === "production") {
    return { success: false, error: "이 기능은 개발 환경에서만 사용할 수 있습니다." }
  }
  if (process.env.PORTONE_API_SECRET) {
    return { success: false, error: "실연동 키가 설정되어 있어 우회 기능을 사용할 수 없습니다." }
  }

  // 랜덤 CI/DI를 만들어서, 매번 새로운 "가짜 사람"으로 가입 테스트가 가능하게 함
  const fakeCiDi = `dev_bypass_${crypto.randomUUID()}`

  return {
    success: true,
    ciDi: fakeCiDi,
    name: "테스트유저",
  }
}
