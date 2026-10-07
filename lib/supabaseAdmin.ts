// lib/supabaseAdmin.ts
// 서버 전용 Supabase 관리자 클라이언트 (SUPABASE_SERVICE_ROLE_KEY).
// ⚠️ 이 키는 모든 권한을 가집니다. 절대 NEXT_PUBLIC_ 로 시작하는 이름으로 두거나 화면(클라이언트)에서 import 하지 마세요.
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let cached: SupabaseClient | null | undefined

export function getSupabaseAdmin(): SupabaseClient | null {
  if (cached !== undefined) return cached
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  cached = url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null
  return cached
}

/** 이메일로 Auth 사용자를 찾습니다. (사용자 수가 적은 테스트 단계용: 최대 5,000명까지 훑음) */
export async function findAuthUserByEmail(admin: SupabaseClient, email: string) {
  const target = email.trim().toLowerCase()
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === target)
    if (hit) return hit
    if (data.users.length < 1000) break
  }
  return null
}
