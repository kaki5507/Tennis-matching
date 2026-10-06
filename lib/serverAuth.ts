// lib/serverAuth.ts
// 일반 사용자 서버 액션의 "문지기".
// 서버 액션은 누구나 직접 호출할 수 있고, 유저 ID는 공개 정보라 화면이 보낸 userId를 믿으면
// 남의 계정으로 행동할 수 있습니다. 그래서 Supabase 로그인 토큰을 서버에서 직접 검증해
// "진짜 로그인한 본인"의 ID만 사용합니다. (관리자용은 lib/adminAuth.ts)

import { supabase } from "@/lib/supabase"
import { prisma } from "@/lib/tournamentData"

export type UserCheck = { ok: true; userId: string } | { ok: false; error: string }

/** 토큰만 검증 (아직 우리 DB에 프로필이 없어도 됨) */
export async function verifyToken(
  accessToken: string | null | undefined
): Promise<{ ok: true; id: string; email: string | null } | { ok: false; error: string }> {
  if (!accessToken) return { ok: false, error: "로그인이 필요합니다." }
  const { data, error } = await supabase.auth.getUser(accessToken)
  if (error || !data.user) return { ok: false, error: "로그인 정보를 확인할 수 없습니다. 다시 로그인해주세요." }
  return { ok: true, id: data.user.id, email: data.user.email ?? null }
}

/**
 * 로그인한 본인 확인 + 계정 상태 확인.
 * 탈퇴한 계정은 항상 거부, 정지된 계정은 allowBanned가 아니면 거부합니다.
 */
export async function requireUser(
  accessToken: string | null | undefined,
  opts: { allowBanned?: boolean } = {}
): Promise<UserCheck> {
  const t = await verifyToken(accessToken)
  if (!t.ok) return t

  const user = await prisma.user.findUnique({
    where: { id: t.id },
    select: { deletedAt: true, isBanned: true },
  })
  if (!user) return { ok: false, error: "가입이 완료되지 않은 계정입니다." }
  if (user.deletedAt) return { ok: false, error: "탈퇴한 계정입니다." }
  if (user.isBanned && !opts.allowBanned) return { ok: false, error: "이용이 제한된 계정입니다." }
  return { ok: true, userId: t.id }
}
