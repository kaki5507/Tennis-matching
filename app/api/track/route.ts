// app/api/track/route.ts
// 페이지 방문을 가볍게 기록하는 엔드포인트. 관리자 통계(메뉴 방문 빈도,
// 모바일/PC 비율)를 위한 것으로, 실패해도 사용자 경험엔 전혀 영향 없습니다.

import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { supabase } from "@/lib/supabase"

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { path, device } = await request.json()
    if (!path || !device) {
      return NextResponse.json({ success: false }, { status: 400 })
    }

    // 로그인된 유저면 userId도 같이 기록 (통계에서 로그인 유저 행동 분석 가능)
    const { data } = await supabase.auth.getUser()

    await prisma.pageView.create({
      data: {
        path: String(path).slice(0, 500),
        device: device === "mobile" ? "mobile" : "desktop",
        userId: data.user?.id ?? null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    // 통계 기록 실패는 조용히 무시 (사용자에게 영향 주면 안 됨)
    console.error("페이지뷰 기록 에러:", error)
    return NextResponse.json({ success: false }, { status: 200 })
  }
}
