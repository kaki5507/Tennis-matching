// app/actions/adminMaintenance.ts
// 서비스 점검 모드 조회/변경 (관리자 전용, 로그인 토큰을 서버에서 검증).

"use server"

import { revalidateTag } from "next/cache"
import { prisma } from "@/lib/tournamentData"
import { requireAdmin } from "@/lib/adminAuth"
import { logAdminAction } from "@/lib/auditLog"
import { MAINTENANCE_TAG, type MaintenanceState } from "@/lib/maintenance"

export interface MaintenanceAdminView extends MaintenanceState {
  updatedAt: string | null
  updatedByNickname: string | null
}

/** 캐시를 거치지 않고 DB의 실제 값을 반환(관리자 화면용). */
export async function getMaintenanceAdmin(accessToken: string | null) {
  const auth = await requireAdmin(accessToken)
  if (!auth.ok) return { success: false as const, error: auth.error }
  const row = await prisma.maintenanceSetting.findUnique({ where: { id: 1 } })
  let nick: string | null = null
  if (row?.updatedBy) {
    const u = await prisma.user.findUnique({ where: { id: row.updatedBy }, select: { nickname: true } })
    nick = u?.nickname ?? null
  }
  const data: MaintenanceAdminView = {
    enabled: row?.enabled ?? false,
    message: row?.message ?? null,
    endsAt: row?.endsAt ? row.endsAt.toISOString() : null,
    updatedAt: row?.updatedAt ? row.updatedAt.toISOString() : null,
    updatedByNickname: nick,
  }
  return { success: true as const, data }
}

export async function setMaintenance(
  accessToken: string | null,
  input: { enabled: boolean; message?: string | null; endsAt?: string | null }
) {
  const auth = await requireAdmin(accessToken)
  if (!auth.ok) return { success: false as const, error: auth.error }

  const message = (input.message ?? "").trim().slice(0, 300) || null
  let endsAt: Date | null = null
  if (input.endsAt) {
    const d = new Date(input.endsAt)
    if (Number.isNaN(d.getTime())) return { success: false as const, error: "종료 예정 시각 형식이 올바르지 않습니다." }
    if (input.enabled && d.getTime() <= Date.now()) {
      return { success: false as const, error: "종료 예정 시각은 현재보다 미래여야 합니다." }
    }
    endsAt = d
  }

  const prev = await prisma.maintenanceSetting.findUnique({ where: { id: 1 } })
  const wasOn = prev?.enabled ?? false

  await prisma.maintenanceSetting.upsert({
    where: { id: 1 },
    create: { id: 1, enabled: input.enabled, message, endsAt, updatedBy: auth.userId },
    update: { enabled: input.enabled, message, endsAt, updatedBy: auth.userId, updatedAt: new Date() },
  })
  revalidateTag(MAINTENANCE_TAG, { expire: 0 })

  const action = input.enabled !== wasOn ? (input.enabled ? "MAINTENANCE_ON" : "MAINTENANCE_OFF") : "MAINTENANCE_UPDATE"
  await logAdminAction({
    adminId: auth.userId,
    action,
    detail: [message ? `문구: ${message}` : null, endsAt ? `종료예정: ${endsAt.toISOString()}` : null].filter(Boolean).join(" / ") || null,
  })
  return { success: true as const }
}
