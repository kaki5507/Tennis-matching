// lib/board.ts
// 게시판 공용 규칙 (서버/화면 양쪽에서 import 가능한 순수 코드)

export type BoardCategory = "NOTICE" | "FREE" | "SUGGEST"
export type BoardKey = "notice" | "free" | "suggest"

export const BOARD_TABS: { key: BoardKey; category: BoardCategory; label: string; emoji: string; desc: string }[] = [
  { key: "notice", category: "NOTICE", label: "공지사항", emoji: "📢", desc: "운영진이 알려드리는 소식이에요." },
  { key: "free", category: "FREE", label: "자유게시판", emoji: "💬", desc: "테니스 이야기, 파트너 후기, 뭐든 자유롭게!" },
  { key: "suggest", category: "SUGGEST", label: "건의함", emoji: "💡", desc: "있었으면 하는 기능이나 불편한 점을 남겨주세요. 개발에 참고할게요!" },
]

export const TITLE_MAX = 100
export const CONTENT_MAX = 5000
export const COMMENT_MAX = 1000

export function categoryOfKey(key: string | null | undefined): BoardCategory {
  return BOARD_TABS.find((t) => t.key === key)?.category ?? "NOTICE"
}
export function keyOfCategory(c: BoardCategory): BoardKey {
  return BOARD_TABS.find((t) => t.category === c)?.key ?? "notice"
}
export function labelOfCategory(c: BoardCategory): string {
  return BOARD_TABS.find((t) => t.category === c)?.label ?? "게시판"
}
