// app/api/avatar/[id]/route.ts
// 프로필 사진을 이미지 주소로 내려줍니다. (사진 본문을 목록 HTML에 넣지 않고, 브라우저/CDN 캐시를 쓰기 위함)
// 사진이 없으면 404 → 화면은 닉네임 첫 글자 원으로 대체합니다.

import { NextRequest } from "next/server"
import { prisma } from "@/lib/tournamentData"
import { AVATAR_PREFIX } from "@/lib/avatarImage"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!UUID.test(id)) return new Response(null, { status: 404 })

  const u = await prisma.user.findFirst({ where: { id, deletedAt: null }, select: { profileUrl: true } })
  const url = u?.profileUrl
  if (!url || !url.startsWith(AVATAR_PREFIX)) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } })
  }
  const bytes = Buffer.from(url.slice(AVATAR_PREFIX.length), "base64")
  return new Response(new Uint8Array(bytes), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600" },
  })
}
