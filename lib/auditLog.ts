// lib/auditLog.ts
// 관리자 작업 기록 남기기. 기록 실패가 본 작업을 막아선 안 되므로 에러는 삼키고 서버 로그에만 남깁니다.
// (서버에서만 호출할 것 — 서버 액션 안에서 사용)

import { prisma } from "@/lib/tournamentData"
import type { AuditAction } from "@/lib/auditActions"

export interface AuditInput {
  adminId: string
  action: AuditAction
  targetType?: "user" | "tournament" | "match"
  targetId?: string
  targetLabel?: string | null
  detail?: string | null
}

export async function logAdminAction(input: AuditInput): Promise<void> {
  try {
    const admin = await prisma.user.findUnique({ where: { id: input.adminId }, select: { nickname: true } })
    await prisma.adminAuditLog.create({
      data: {
        adminId: input.adminId,
        adminNickname: admin?.nickname ?? "알 수 없음",
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        targetLabel: input.targetLabel ? input.targetLabel.slice(0, 200) : null,
        detail: input.detail ? input.detail.slice(0, 500) : null,
      },
    })
  } catch (e) {
    console.error("[audit] 작업 기록 실패:", e)
  }
}

/** 대회 제목 조회 (기록용 라벨). 실패하면 null */
export async function tournamentTitle(id: string): Promise<string | null> {
  try {
    const t = await prisma.tournament.findUnique({ where: { id }, select: { title: true } })
    return t?.title ?? null
  } catch {
    return null
  }
}
