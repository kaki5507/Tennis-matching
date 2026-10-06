// app/actions/adminAudit.ts
// 관리자 작업 기록 조회 (읽기 전용 — 수정/삭제 기능은 의도적으로 없음).

"use server"

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/tournamentData"
import { requireAdmin } from "@/lib/adminAuth"
import { AUDIT_ACTIONS } from "@/lib/auditActions"

const PAGE_SIZE = 30

export interface AuditRow {
  id: string
  adminId: string
  adminNickname: string
  action: string
  targetType: string | null
  targetId: string | null
  targetLabel: string | null
  detail: string | null
  createdAt: string
}

export async function getAuditLogs(
  accessToken: string | null,
  params: { action?: string; q?: string; page?: number }
) {
  const auth = await requireAdmin(accessToken)
  if (!auth.ok) return { success: false as const, error: auth.error }

  const q = (params.q ?? "").trim().slice(0, 100)
  const page = Math.max(1, Math.floor(params.page ?? 1))

  const where: Prisma.AdminAuditLogWhereInput = {}
  if (params.action && params.action in AUDIT_ACTIONS) where.action = params.action
  if (q) {
    where.OR = [
      { adminNickname: { contains: q, mode: "insensitive" } },
      { targetLabel: { contains: q, mode: "insensitive" } },
      { detail: { contains: q, mode: "insensitive" } },
      { targetId: q },
      { adminId: q.toLowerCase().match(/^[0-9a-f-]{36}$/) ? q.toLowerCase() : "00000000-0000-0000-0000-000000000000" },
    ]
  }

  const [total, logs] = await Promise.all([
    prisma.adminAuditLog.count({ where }),
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])

  return {
    success: true as const,
    logs: logs.map((l): AuditRow => ({ ...l, createdAt: l.createdAt.toISOString() })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  }
}
