// app/actions/court.ts
"use server"

import { prisma } from "@/lib/tournamentData"
import { requireUser } from "@/lib/serverAuth"

interface FindOrCreateCourtInput {
  name: string
  address: string
  latitude: number
  longitude: number
}

/**
 * 카카오맵 검색으로 고른 장소를, 우리 DB의 courts 테이블에서 찾거나 새로 만듭니다.
 * 같은 테니스장이 여러 매칭 방에서 반복 사용되므로, 주소 기준으로 중복 생성을 막습니다.
 */
export async function findOrCreateCourt(accessToken: string | null, data: FindOrCreateCourtInput) {
  try {
    const auth = await requireUser(accessToken)
    if (!auth.ok) return { success: false, error: auth.error }

    const name = (data.name ?? "").trim()
    const address = (data.address ?? "").trim()
    if (!name || !address || name.length > 100 || address.length > 200) {
      return { success: false, error: "테니스장 정보가 올바르지 않습니다." }
    }
    if (!Number.isFinite(data.latitude) || !Number.isFinite(data.longitude) || Math.abs(data.latitude) > 90 || Math.abs(data.longitude) > 180) {
      return { success: false, error: "테니스장 위치 정보가 올바르지 않습니다." }
    }

    const existing = await prisma.court.findFirst({
      where: { address },
    })

    if (existing) {
      return { success: true, courtId: existing.id }
    }

    const created = await prisma.court.create({
      data: {
        name,
        address,
        latitude: data.latitude,
        longitude: data.longitude,
      },
    })

    return { success: true, courtId: created.id }
  } catch (error) {
    console.error("코트 생성/조회 에러:", error)
    return { success: false, error: "테니스장 정보를 저장하지 못했습니다." }
  }
}

/**
 * 내가 최근에 쓰거나 자주 쓴 테니스장 (내가 방장이거나 확정 참가한 방 기준, 최대 4곳).
 * 많이 간 곳 먼저, 같으면 최근에 간 곳 먼저.
 */
export async function getMyFrequentCourts(accessToken: string | null) {
  try {
    const auth = await requireUser(accessToken)
    if (!auth.ok) return []
    const rows = await prisma.match.findMany({
      where: {
        deletedAt: null,
        OR: [{ hostId: auth.userId }, { participants: { some: { userId: auth.userId, status: "ACCEPTED" } } }],
      },
      orderBy: { matchDate: "desc" },
      take: 60,
      select: { matchDate: true, court: { select: { id: true, name: true, address: true, latitude: true, longitude: true } } },
    })
    const byCourt = new Map<string, { count: number; last: number; court: (typeof rows)[number]["court"] }>()
    for (const r of rows) {
      const cur = byCourt.get(r.court.id)
      const t = r.matchDate.getTime()
      if (cur) {
        cur.count++
        cur.last = Math.max(cur.last, t)
      } else byCourt.set(r.court.id, { count: 1, last: t, court: r.court })
    }
    return [...byCourt.values()]
      .sort((a, b) => b.count - a.count || b.last - a.last)
      .slice(0, 4)
      .map((v) => ({
        name: v.court.name,
        address: v.court.address,
        latitude: Number(v.court.latitude),
        longitude: Number(v.court.longitude),
      }))
  } catch (error) {
    console.error("자주 쓰는 코트 조회 에러:", error)
    return []
  }
}
