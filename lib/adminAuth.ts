// lib/adminAuth.ts
// 관리자 전용 서버 액션의 "문지기".
// 클라이언트가 보낸 userId는 누구나 위조할 수 있으므로(유저 ID는 공개 프로필 주소에도 노출됨),
// Supabase 로그인 토큰(access token)을 서버에서 직접 검증해서 "진짜 로그인한 사람"을 확인한 뒤
// 그 사람이 관리자인지 DB에서 확인합니다.

import { verifyToken } from "@/lib/serverAuth"
import { prisma } from "@/lib/tournamentData"

export type AdminCheck = { ok: true; userId: string } | { ok: false; error: string }

// 관리자 여부는 30초만 서버 메모리에 기억 (권한 해제/정지는 최대 30초 안에 반영). 화면 한 장이 액션을 여러 개 부를 때 매번 DB를 안 가게 함
const adminCache = new Map<string, { ok: boolean; exp: number }>()

export async function requireAdmin(accessToken: string | null | undefined): Promise<AdminCheck> {
  // 토큰 검증: 서명 키로 서버 안에서 확인 + 60초 캐시 (lib/serverAuth.ts)
  const t0 = Date.now()
  const t = await verifyToken(accessToken)
  const tToken = Date.now() - t0
  if (!t.ok) return { ok: false, error: t.error }

  const hit = adminCache.get(t.id)
  if (hit && hit.exp > Date.now()) {
    return hit.ok ? { ok: true, userId: t.id } : { ok: false, error: "관리자만 접근할 수 있습니다." }
  }

  const user = await prisma.user.findUnique({
    where: { id: t.id },
    select: { role: true, deletedAt: true, isBanned: true },
  })
  console.log(`[perf] requireAdmin 토큰확인 ${tToken}ms · DB조회 ${Date.now() - t0 - tToken}ms`)
  const ok = !!user && user.role === "ADMIN" && !user.deletedAt && !user.isBanned
  if (adminCache.size > 200) adminCache.clear()
  adminCache.set(t.id, { ok, exp: Date.now() + 30_000 })
  return ok ? { ok: true, userId: t.id } : { ok: false, error: "관리자만 접근할 수 있습니다." }
}

// 빈 코트 "지금 갱신" 권한: 관리자 또는 코트 담당자(COURT_MANAGER). 통계/회원관리 등은 관리자만.
const managerCache = new Map<string, { role: "ADMIN" | "COURT_MANAGER" | null; exp: number }>()

export type CourtManagerCheck = { ok: true; userId: string; isAdmin: boolean } | { ok: false; error: string }

export async function requireCourtManager(accessToken: string | null | undefined): Promise<CourtManagerCheck> {
  const t = await verifyToken(accessToken)
  if (!t.ok) return { ok: false, error: t.error }
  let hit = managerCache.get(t.id)
  if (!hit || hit.exp <= Date.now()) {
    const user = await prisma.user.findUnique({
      where: { id: t.id },
      select: { role: true, deletedAt: true, isBanned: true },
    })
    const valid = !!user && !user.deletedAt && !user.isBanned
    const role = valid && (user!.role === "ADMIN" || user!.role === "COURT_MANAGER") ? user!.role : null
    if (managerCache.size > 200) managerCache.clear()
    hit = { role, exp: Date.now() + 30_000 }
    managerCache.set(t.id, hit)
  }
  if (!hit.role) return { ok: false, error: "권한이 없습니다." }
  return { ok: true, userId: t.id, isAdmin: hit.role === "ADMIN" }
}
