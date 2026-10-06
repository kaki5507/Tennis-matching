// lib/authToken.ts (클라이언트용)
// 관리자 서버 액션에 넘길 로그인 토큰을 가져옵니다. 서버가 이 토큰을 직접 검증하므로
// 화면에서 userId를 조작해도 관리자 권한을 얻을 수 없습니다.
import { supabase } from "@/lib/supabase"

export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}
