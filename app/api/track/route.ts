// app/api/track/route.ts
// 페이지 방문을 가볍게 기록하는 엔드포인트. 관리자 통계(방문자 수, 메뉴 방문 빈도,
// 모바일/PC 비율)를 위한 것으로, 실패해도 사용자 경험엔 전혀 영향 없습니다.

import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { prisma } from "@/lib/tournamentData"

const BOT_RE = /bot|crawl|spider|slurp|headless|preview|monitor|uptime|curl|wget/i
const VISITOR_ID_RE = /^[0-9a-f-]{36}$/i

export async function POST(request: NextRequest) {
  try {
    // 크롤러/모니터링 봇은 방문자 수를 부풀리므로 제외
    if (BOT_RE.test(request.headers.get("user-agent") ?? "")) {
      return NextResponse.json({ success: true, skipped: true })
    }

    const { path, device, visitorId } = await request.json()
    if (!path || !device || typeof path !== "string" || !path.startsWith("/")) {
      return NextResponse.json({ success: false }, { status: 400 })
    }
    if (path.startsWith("/admin") || path.startsWith("/api")) {
      return NextResponse.json({ success: true, skipped: true })
    }

    // 로그인 유저라면 토큰을 검증해서 userId를 기록 (위조 방지)
    let userId: string | null = null
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    if (token) {
      const { data } = await supabase.auth.getUser(token)
      userId = data.user?.id ?? null
    }

    await prisma.pageView.create({
      data: {
        path: path.slice(0, 500),
        device: device === "mobile" ? "mobile" : "desktop",
        userId,
        visitorId: typeof visitorId === "string" && VISITOR_ID_RE.test(visitorId) ? visitorId : null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    // 통계 기록 실패는 조용히 무시 (사용자에게 영향 주면 안 됨)
    console.error("페이지뷰 기록 에러:", error)
    return NextResponse.json({ success: false }, { status: 200 })
  }
}
