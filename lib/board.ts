// lib/board.ts
// 게시판 공용 규칙 (서버/화면 양쪽에서 import 가능한 순수 코드)

export type BoardCategory = "NOTICE" | "FREE"

export const BOARD_TABS: { key: "notice" | "free"; category: BoardCategory; label: string; emoji: string; desc: string }[] = [
  { key: "notice", category: "NOTICE", label: "공지사항", emoji: "📢", desc: "운영진이 알려드리는 소식이에요." },
  { key: "free", category: "FREE", label: "자유게시판", emoji: "💬", desc: "테니스 이야기, 파트너 후기, 뭐든 자유롭게!" },
]

export const TITLE_MAX = 100
export const CONTENT_MAX = 5000
export const COMMENT_MAX = 1000

export function categoryOfKey(key: string | null | undefined): BoardCategory {
  return key === "free" ? "FREE" : "NOTICE"
}
export function keyOfCategory(c: BoardCategory): "notice" | "free" {
  return c === "FREE" ? "free" : "notice"
}
