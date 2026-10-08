// app/api/cron/check-court-availability/route.ts
//
// 외부 크론(cron-job.org)이 매시 정각에 호출합니다. (한국 시간 오전 9시 ~ 밤 11시, 하루 15번)
// 실제 수집 로직은 lib/courtCrawl.ts. 관리자가 크롤링 스위치를 꺼 두면 건너뜁니다.

import { NextRequest, NextResponse } from "next/server"
import { runCourtCrawl } from "@/lib/courtCrawl"

export const maxDuration = 60

export async function GET(request: NextRequest) {
  // Vercel/외부 크론 요청인지 검증 (CRON_SECRET 미설정이면 모든 호출 거부)
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ?force=1 : 시간대 제한만 무시 (끄기 스위치는 항상 존중)
  const force = request.nextUrl.searchParams.get("force") === "1"
  const out = await runCourtCrawl({ trigger: "cron", respectSwitch: true, respectHours: !force })
  return NextResponse.json({ success: true, checkedAt: new Date().toISOString(), ...out })
}
