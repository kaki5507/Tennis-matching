// lib/maintenance.ts
// 점검 모드 상태 읽기. 로그인 없이 모든 방문자 화면에서 읽히므로 짧게 캐시하고,
// DB가 안 될 때는 "점검 아님"으로 처리(fail-open)해서 DB 장애가 사이트 전체 차단으로 번지지 않게 합니다.

import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/tournamentData"

export const MAINTENANCE_TAG = "maintenance"

export interface MaintenanceState {
  enabled: boolean
  message: string | null
  endsAt: string | null // ISO
}

const OFF: MaintenanceState = { enabled: false, message: null, endsAt: null }

const readCached = unstable_cache(
  async (): Promise<MaintenanceState> => {
    const row = await prisma.maintenanceSetting.findUnique({ where: { id: 1 } })
    if (!row) return OFF
    return { enabled: row.enabled, message: row.message, endsAt: row.endsAt ? row.endsAt.toISOString() : null }
  },
  ["maintenance-state"],
  { revalidate: 30, tags: [MAINTENANCE_TAG] }
)

/** 종료 예정 시각이 지났으면 자동으로 꺼진 것으로 봅니다. */
export function isEffectivelyOn(s: MaintenanceState, now = Date.now()): boolean {
  if (!s.enabled) return false
  if (s.endsAt && new Date(s.endsAt).getTime() <= now) return false
  return true
}

export async function getMaintenanceState(): Promise<MaintenanceState> {
  try {
    const s = await readCached()
    return { ...s, enabled: isEffectivelyOn(s) }
  } catch (e) {
    console.error("[maintenance] 상태 조회 실패(점검 아님으로 처리):", e)
    return OFF
  }
}
