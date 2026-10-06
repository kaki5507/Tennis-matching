import { NextResponse } from "next/server"
import { getMaintenanceState } from "@/lib/maintenance"

// 화면에 열려 있는 탭이 주기적으로 점검 상태를 확인하는 용도 (공개 정보만 반환)
export async function GET() {
  const s = await getMaintenanceState()
  return NextResponse.json(s, { headers: { "Cache-Control": "no-store" } })
}
