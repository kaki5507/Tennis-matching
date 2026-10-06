// lib/adminAuth.ts
// 관리자 전용 서버 액션의 "문지기".
// 클라이언트가 보낸 userId는 누구나 위조할 수 있으므로(유저 ID는 공개 프로필 주소에도 노출됨),
// Supabase 로그인 토큰(access token)을 서버에서 직접 검증해서 "진짜 로그인한 사람"을 확인한 뒤
// 그 사람이 관리자인지 DB에서 확인합니다.

import { supabase } from "@/lib/supabase"
import { prisma } from "@/lib/tournamentData"

export type AdminCheck = { ok: true; userId: string } | { ok: false; error: string }

export async function requireAdmin(accessToken: string | null | undefined): Promise<AdminCheck> {
  if (!accessToken) return { ok: false, error: "로그인이 필요합니다." }

  const { data, error } = await supabase.auth.getUser(accessToken)
  if (error || !data.user) return { ok: false, error: "로그인 정보를 확인할 수 없습니다." }

  const user = await prisma.user.findUnique({
    where: { id: data.user.id },
    select: { role: true, deletedAt: true, isBanned: true },
  })
  if (!user || user.role !== "ADMIN" || user.deletedAt || user.isBanned) {
    return { ok: false, error: "관리자만 접근할 수 있습니다." }
  }
  return { ok: true, userId: data.user.id }
}
