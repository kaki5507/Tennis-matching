// app/actions/court.ts
"use server"

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

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
export async function findOrCreateCourt(data: FindOrCreateCourtInput) {
  try {
    const existing = await prisma.court.findFirst({
      where: { address: data.address },
    })

    if (existing) {
      return { success: true, courtId: existing.id }
    }

    const created = await prisma.court.create({
      data: {
        name: data.name,
        address: data.address,
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
