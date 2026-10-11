// app/actions/board.ts
// 공지사항 / 자유게시판. 읽기는 누구나(로그인 없이), 쓰기는 로그인한 본인 명의로만.
//  - 공지사항: 관리자만 작성/수정/고정
//  - 자유게시판: 로그인한 회원 누구나 작성, 본인 글만 수정/삭제 (관리자는 모든 글 삭제 가능)
// 글 내용은 항상 "글자"로만 화면에 그려지므로(HTML 해석 안 함) 스크립트가 들어와도 실행되지 않습니다.

"use server"

import { prisma } from "@/lib/tournamentData"
import { requireUser } from "@/lib/serverAuth"
import { requireAdmin } from "@/lib/adminAuth"
import { logAdminAction } from "@/lib/auditLog"
import { COMMENT_MAX, CONTENT_MAX, TITLE_MAX, type BoardCategory } from "@/lib/board"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PAGE_SIZE = 20

export interface PostRow {
  id: string
  category: BoardCategory
  title: string
  pinned: boolean
  viewCount: number
  commentCount: number
  authorId: string
  authorNickname: string
  authorIsAdmin: boolean
  createdAt: string
}

export async function listPosts(category: BoardCategory, page = 1, q = "") {
  try {
    const keyword = (q ?? "").trim().slice(0, 50)
    const where = {
      category,
      deletedAt: null,
      ...(keyword ? { OR: [{ title: { contains: keyword, mode: "insensitive" as const } }, { content: { contains: keyword, mode: "insensitive" as const } }] } : {}),
    }
    const p = Math.max(1, Math.floor(page) || 1)
    const [total, rows] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.findMany({
        where,
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
        skip: (p - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true, category: true, title: true, pinned: true, viewCount: true, createdAt: true,
          author: { select: { id: true, nickname: true, role: true } },
          _count: { select: { comments: true } },
        },
      }),
    ])
    const posts: PostRow[] = rows.map((r) => ({
      id: r.id,
      category: r.category,
      title: r.title,
      pinned: r.pinned,
      viewCount: r.viewCount,
      commentCount: r._count.comments,
      authorId: r.author.id,
      authorNickname: r.author.nickname || "익명",
      authorIsAdmin: r.author.role === "ADMIN",
      createdAt: r.createdAt.toISOString(),
    }))
    return { success: true as const, posts, total, pageSize: PAGE_SIZE }
  } catch (e) {
    console.error("[listPosts] 실패:", e)
    return { success: false as const, posts: [] as PostRow[], total: 0, pageSize: PAGE_SIZE }
  }
}

export async function getPost(id: string, countView = true) {
  if (!UUID_RE.test(id)) return null
  try {
    const post = await prisma.post.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true, category: true, title: true, content: true, pinned: true, viewCount: true, createdAt: true, updatedAt: true,
        author: { select: { id: true, nickname: true, role: true } },
      },
    })
    if (!post) return null
    if (countView) prisma.post.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {})
    return {
      id: post.id,
      category: post.category as BoardCategory,
      title: post.title,
      content: post.content,
      pinned: post.pinned,
      viewCount: post.viewCount + (countView ? 1 : 0),
      createdAt: post.createdAt.toISOString(),
      edited: post.updatedAt.getTime() - post.createdAt.getTime() > 60_000,
      authorId: post.author.id,
      authorNickname: post.author.nickname || "익명",
      authorIsAdmin: post.author.role === "ADMIN",
    }
  } catch (e) {
    console.error("[getPost] 실패:", e)
    return null
  }
}

function validate(title: string, content: string) {
  const t = (title ?? "").trim()
  const c = (content ?? "").trim()
  if (!t) return { error: "제목을 입력해주세요." as string }
  if (t.length > TITLE_MAX) return { error: `제목은 ${TITLE_MAX}자 이내로 작성해주세요.` }
  if (!c) return { error: "내용을 입력해주세요." }
  if (c.length > CONTENT_MAX) return { error: `내용은 ${CONTENT_MAX.toLocaleString()}자 이내로 작성해주세요.` }
  return { title: t, content: c }
}

export async function createPost(accessToken: string | null, input: { category: BoardCategory; title: string; content: string; pinned?: boolean }) {
  const v = validate(input.title, input.content)
  if ("error" in v) return { success: false as const, error: v.error }
  if (input.category !== "NOTICE" && input.category !== "FREE") return { success: false as const, error: "잘못된 게시판입니다." }

  let authorId: string
  let pinned = false
  if (input.category === "NOTICE") {
    const admin = await requireAdmin(accessToken)
    if (!admin.ok) return { success: false as const, error: "공지사항은 관리자만 쓸 수 있습니다." }
    authorId = admin.userId
    pinned = !!input.pinned
  } else {
    const auth = await requireUser(accessToken)
    if (!auth.ok) return { success: false as const, error: auth.error }
    authorId = auth.userId
    // 도배 방지: 같은 사람이 30초 안에 연속으로 올릴 수 없음
    const last = await prisma.post.findFirst({ where: { authorId, category: "FREE" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } })
    if (last && Date.now() - last.createdAt.getTime() < 30_000) {
      return { success: false as const, error: "글은 30초에 한 번만 올릴 수 있어요. 잠시 후 다시 시도해주세요." }
    }
  }

  const post = await prisma.post.create({ data: { category: input.category, title: v.title, content: v.content, pinned, authorId }, select: { id: true } })
  if (input.category === "NOTICE") {
    await logAdminAction({ adminId: authorId, action: "BOARD_NOTICE_CREATE", targetType: "post", targetId: post.id, targetLabel: v.title })
  }
  return { success: true as const, id: post.id }
}

/** 본인 글이거나 관리자인지 확인 (관리자는 공지 수정/고정도 가능) */
async function canManage(accessToken: string | null, postId: string) {
  const auth = await requireUser(accessToken)
  if (!auth.ok) return { ok: false as const, error: auth.error }
  if (!UUID_RE.test(postId)) return { ok: false as const, error: "잘못된 글입니다." }
  const post = await prisma.post.findFirst({ where: { id: postId, deletedAt: null }, select: { id: true, authorId: true, category: true, title: true } })
  if (!post) return { ok: false as const, error: "이미 삭제되었거나 없는 글입니다." }
  const isAuthor = post.authorId === auth.userId
  const admin = (await requireAdmin(accessToken)).ok
  return { ok: true as const, userId: auth.userId, post, isAuthor, isAdmin: admin }
}

export async function updatePost(accessToken: string | null, id: string, input: { title: string; content: string; pinned?: boolean }) {
  const v = validate(input.title, input.content)
  if ("error" in v) return { success: false as const, error: v.error }
  const c = await canManage(accessToken, id)
  if (!c.ok) return { success: false as const, error: c.error }
  // 공지는 관리자만, 자유글은 본인만 수정 (관리자가 남의 자유글을 고치지는 않음)
  if (c.post.category === "NOTICE" ? !c.isAdmin : !c.isAuthor) return { success: false as const, error: "수정 권한이 없습니다." }
  await prisma.post.update({
    where: { id },
    data: { title: v.title, content: v.content, ...(c.post.category === "NOTICE" && input.pinned !== undefined ? { pinned: !!input.pinned } : {}) },
  })
  return { success: true as const }
}

export async function setPostPinned(accessToken: string | null, id: string, pinned: boolean) {
  const admin = await requireAdmin(accessToken)
  if (!admin.ok) return { success: false as const, error: admin.error }
  if (!UUID_RE.test(id)) return { success: false as const, error: "잘못된 글입니다." }
  await prisma.post.updateMany({ where: { id, deletedAt: null }, data: { pinned } })
  return { success: true as const }
}

export async function deletePost(accessToken: string | null, id: string) {
  const c = await canManage(accessToken, id)
  if (!c.ok) return { success: false as const, error: c.error }
  if (!c.isAuthor && !c.isAdmin) return { success: false as const, error: "삭제 권한이 없습니다." }
  await prisma.post.update({ where: { id }, data: { deletedAt: new Date(), pinned: false } })
  if (c.isAdmin && !c.isAuthor) {
    await logAdminAction({ adminId: c.userId, action: "BOARD_POST_DELETE", targetType: "post", targetId: id, targetLabel: c.post.title })
  }
  return { success: true as const }
}

// ---- 댓글 ----
export async function listPostComments(postId: string) {
  if (!UUID_RE.test(postId)) return []
  const rows = await prisma.postComment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
    take: 300,
    select: { id: true, content: true, createdAt: true, user: { select: { id: true, nickname: true, role: true } } },
  })
  return rows.map((r) => ({
    id: r.id,
    content: r.content,
    createdAt: r.createdAt.toISOString(),
    userId: r.user.id,
    nickname: r.user.nickname || "익명",
    isAdmin: r.user.role === "ADMIN",
  }))
}

export async function addPostComment(accessToken: string | null, postId: string, content: string) {
  const auth = await requireUser(accessToken)
  if (!auth.ok) return { success: false as const, error: auth.error }
  const text = (content ?? "").trim()
  if (!text) return { success: false as const, error: "내용을 입력해주세요." }
  if (text.length > COMMENT_MAX) return { success: false as const, error: `댓글은 ${COMMENT_MAX}자 이내로 작성해주세요.` }
  if (!UUID_RE.test(postId)) return { success: false as const, error: "잘못된 글입니다." }
  const post = await prisma.post.findFirst({ where: { id: postId, deletedAt: null }, select: { id: true } })
  if (!post) return { success: false as const, error: "삭제되었거나 없는 글입니다." }
  const last = await prisma.postComment.findFirst({ where: { userId: auth.userId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } })
  if (last && Date.now() - last.createdAt.getTime() < 5_000) return { success: false as const, error: "댓글은 5초 간격으로 쓸 수 있어요." }
  await prisma.postComment.create({ data: { postId, userId: auth.userId, content: text } })
  return { success: true as const }
}

export async function deletePostComment(accessToken: string | null, commentId: string) {
  const auth = await requireUser(accessToken)
  if (!auth.ok) return { success: false as const, error: auth.error }
  if (!UUID_RE.test(commentId)) return { success: false as const, error: "잘못된 댓글입니다." }
  const c = await prisma.postComment.findUnique({ where: { id: commentId }, select: { userId: true } })
  if (!c) return { success: true as const }
  if (c.userId !== auth.userId && !(await requireAdmin(accessToken)).ok) return { success: false as const, error: "삭제 권한이 없습니다." }
  await prisma.postComment.delete({ where: { id: commentId } })
  return { success: true as const }
}

/** 메인 화면용: 가장 최근(고정 우선) 공지 한 개 */
export async function getLatestNotice() {
  try {
    const p = await prisma.post.findFirst({
      where: { category: "NOTICE", deletedAt: null },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      select: { id: true, title: true, createdAt: true },
    })
    return p ? { id: p.id, title: p.title, createdAt: p.createdAt.toISOString() } : null
  } catch {
    return null
  }
}
