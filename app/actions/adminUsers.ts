// app/actions/adminUsers.ts
// 관리자 전용: 회원 검색 / 상세 조회 / 정지·해제.
// 모든 함수는 로그인 토큰을 서버에서 검증(requireAdmin)한 뒤에만 동작합니다.
// 본인인증 해시(ci_di)는 화면에 절대 내려보내지 않습니다.

"use server"

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/tournamentData"
import { requireAdmin } from "@/lib/adminAuth"

const PAGE_SIZE = 20
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type UserFilter = "all" | "active" | "banned" | "deleted" | "admin" | "mismatch"

export interface AdminUserRow {
  id: string
  nickname: string
  email: string
  gender: string | null
  tennisLevel: string
  mannerScore: number
  ntrpScore: number | null
  ntrpCount: number
  levelMismatchCount: number
  isBanned: boolean
  role: "USER" | "ADMIN"
  createdAt: string
  deletedAt: string | null
}

const userSelect = {
  id: true,
  nickname: true,
  email: true,
  gender: true,
  tennisLevel: true,
  mannerScore: true,
  ntrpScore: true,
  ntrpCount: true,
  levelMismatchCount: true,
  isBanned: true,
  role: true,
  createdAt: true,
  deletedAt: true,
} satisfies Prisma.UserSelect

function toRow(u: Prisma.UserGetPayload<{ select: typeof userSelect }>): AdminUserRow {
  return {
    id: u.id,
    nickname: u.nickname,
    email: u.email,
    gender: u.gender,
    tennisLevel: u.tennisLevel,
    mannerScore: Number(u.mannerScore),
    ntrpScore: u.ntrpScore === null ? null : Number(u.ntrpScore),
    ntrpCount: u.ntrpCount,
    levelMismatchCount: u.levelMismatchCount,
    isBanned: u.isBanned,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    deletedAt: u.deletedAt ? u.deletedAt.toISOString() : null,
  }
}

/** 닉네임 / 이메일 / 회원 ID(UUID)로 검색 + 상태 필터 + 페이지네이션 */
export async function searchUsers(
  accessToken: string | null,
  params: { q?: string; filter?: UserFilter; page?: number }
) {
  const auth = await requireAdmin(accessToken)
  if (!auth.ok) return { success: false as const, error: auth.error }

  const q = (params.q ?? "").trim().slice(0, 100)
  const filter = params.filter ?? "all"
  const page = Math.max(1, Math.floor(params.page ?? 1))

  const where: Prisma.UserWhereInput = {}
  if (q) {
    const or: Prisma.UserWhereInput[] = [
      { nickname: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ]
    if (UUID_RE.test(q)) or.push({ id: q.toLowerCase() })
    where.OR = or
  }
  if (filter === "active") where.deletedAt = null
  if (filter === "banned") where.isBanned = true
  if (filter === "deleted") where.deletedAt = { not: null }
  if (filter === "admin") where.role = "ADMIN"
  if (filter === "mismatch") where.levelMismatchCount = { gt: 0 }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: userSelect,
    }),
  ])

  return {
    success: true as const,
    users: users.map(toRow),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  }
}

/** 한 회원의 상세: 활동 수치, 최근 참여 경기, 마지막 접속 */
export async function getUserDetail(accessToken: string | null, userId: string) {
  const auth = await requireAdmin(accessToken)
  if (!auth.ok) return { success: false as const, error: auth.error }
  if (!UUID_RE.test(userId)) return { success: false as const, error: "잘못된 회원 ID입니다." }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: userSelect })
  if (!user) return { success: false as const, error: "회원을 찾을 수 없습니다." }

  const [hosted, joined, evalsReceived, evalsGiven, lastSeen, recent] = await Promise.all([
    prisma.match.count({ where: { hostId: userId, deletedAt: null } }),
    prisma.matchParticipant.count({ where: { userId, status: "ACCEPTED" } }),
    prisma.evaluation.count({ where: { evaluateeId: userId } }),
    prisma.evaluation.count({ where: { evaluatorId: userId } }),
    prisma.pageView.aggregate({ where: { userId }, _max: { createdAt: true } }),
    prisma.matchParticipant.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        status: true,
        match: { select: { id: true, matchDate: true, gameType: true, court: { select: { name: true } } } },
      },
    }),
  ])

  return {
    success: true as const,
    user: toRow(user),
    stats: { hosted, joined, evalsReceived, evalsGiven },
    lastSeenAt: lastSeen._max.createdAt ? lastSeen._max.createdAt.toISOString() : null,
    recentParticipations: recent.map((r) => ({
      matchId: r.match.id,
      status: r.status,
      gameType: r.match.gameType,
      courtName: r.match.court.name,
      matchDate: r.match.matchDate.toISOString(),
    })),
  }
}

/** 회원 정지/해제. 본인과 다른 관리자는 정지할 수 없습니다. */
export async function setUserBan(accessToken: string | null, userId: string, ban: boolean, reason?: string) {
  const auth = await requireAdmin(accessToken)
  if (!auth.ok) return { success: false as const, error: auth.error }
  if (!UUID_RE.test(userId)) return { success: false as const, error: "잘못된 회원 ID입니다." }
  if (userId === auth.userId) return { success: false as const, error: "본인 계정은 정지할 수 없습니다." }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, ciDi: true } })
  if (!target) return { success: false as const, error: "회원을 찾을 수 없습니다." }
  if (target.role === "ADMIN") return { success: false as const, error: "다른 관리자는 정지할 수 없습니다." }

  try {
    if (ban) {
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { isBanned: true } }),
        // 탈퇴 후 재가입 차단용 블랙리스트에도 사유와 함께 기록
        prisma.bannedIdentity.upsert({
          where: { ciDi: target.ciDi },
          create: { ciDi: target.ciDi, reason: (reason ?? "").slice(0, 200) || "관리자 정지" },
          update: { reason: (reason ?? "").slice(0, 200) || "관리자 정지" },
        }),
      ])
    } else {
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { isBanned: false } }),
        prisma.bannedIdentity.deleteMany({ where: { ciDi: target.ciDi } }),
      ])
    }
    return { success: true as const }
  } catch (e) {
    console.error("[setUserBan] 실패:", e)
    return { success: false as const, error: "처리 중 오류가 발생했습니다." }
  }
}
