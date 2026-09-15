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
