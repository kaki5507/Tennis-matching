// app/actions/adminCourtCrawl.ts
// 빈 코트 크롤링 on/off 와 "지금 갱신" (관리자 전용, 로그인 토큰을 서버에서 검증).

"use server"

import { prisma } from "@/lib/tournamentData"
import { requireAdmin, requireCourtManager } from "@/lib/adminAuth"
import { logAdminAction } from "@/lib/auditLog"
import { getCrawlSetting, runCourtCrawl } from "@/lib/courtCrawl"

export interface CrawlAdminView {
  enabled: boolean
  lastRunAt: string | null
  lastRunSummary: string | null
  canToggle: boolean
}

export async function getCrawlAdmin(accessToken: string | null) {
  const auth = await requireCourtManager(accessToken)
  if (!auth.ok) return { success: false as const, error: auth.error }
  const s = await getCrawlSetting()
  const data: CrawlAdminView = { enabled: s.enabled, lastRunAt: s.lastRunAt?.toISOString() ?? null, lastRunSummary: s.lastRunSummary, canToggle: auth.isAdmin }
  return { success: true as const, data }
}

export async function setCrawlEnabled(accessToken: string | null, enabled: boolean) {
  const auth = await requireAdmin(accessToken)
  if (!auth.ok) return { success: false as const, error: auth.error }
  await prisma.courtCrawlSetting.upsert({
    where: { id: 1 },
    create: { id: 1, enabled, updatedBy: auth.userId },
    update: { enabled, updatedBy: auth.userId, updatedAt: new Date() },
  })
  await logAdminAction({ adminId: auth.userId, action: enabled ? "COURT_CRAWL_ON" : "COURT_CRAWL_OFF" })
  return { success: true as const }
}

/** 스위치/시간대와 상관없이 지금 한 번 수집 (스위치가 꺼져 있어도 관리자는 수동 실행 가능) */
export async function runCrawlNow(accessToken: string | null) {
  const auth = await requireCourtManager(accessToken)
  if (!auth.ok) return { success: false as const, error: auth.error }
  const out = await runCourtCrawl({ trigger: "admin", respectSwitch: false, respectHours: false })
  await logAdminAction({ adminId: auth.userId, action: "COURT_CRAWL_RUN", detail: `성공 ${out.ok} / 실패 ${out.failed} / 새 슬롯 ${out.newSlots}` })
  return { success: true as const, ok: out.ok, failed: out.failed, newSlots: out.newSlots }
}
