"use client";

// components/board/PostForm.tsx
// 글쓰기 / 글 수정 폼 (공지사항은 관리자만, 자유게시판은 로그인한 회원).

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPost, updatePost } from "@/app/actions/board";
import { getAccessToken } from "@/lib/authToken";
import { useAuthUser } from "@/lib/useAuthUser";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { CONTENT_MAX, TITLE_MAX, type BoardCategory } from "@/lib/board";

export default function PostForm({
  category,
  edit,
}: {
  category: BoardCategory;
  edit?: { id: string; title: string; content: string; pinned: boolean };
}) {
  const router = useRouter();
  const { userId, ready } = useAuthUser();
  const isAdmin = useIsAdmin(userId);
  const [title, setTitle] = useState(edit?.title ?? "");
  const [content, setContent] = useState(edit?.content ?? "");
  const [pinned, setPinned] = useState(edit?.pinned ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNotice = category === "NOTICE";
  const backHref = `/board?c=${isNotice ? "notice" : "free"}`;

  if (!ready) return <div className="surface rounded-2xl p-8 text-center text-sm text-slate-400">확인 중...</div>;
  if (!userId) {
    return (
      <div className="surface rounded-2xl p-8 text-center">
        <p className="text-sm text-slate-600 mb-4">글을 쓰려면 로그인이 필요해요.</p>
        <Link href="/login" className="btn-clay inline-block px-6 py-2.5 rounded-full text-sm font-bold">로그인</Link>
      </div>
    );
  }
  if (isNotice && !isAdmin) {
    return (
      <div className="surface rounded-2xl p-8 text-center">
        <p className="text-sm text-slate-600 mb-4">공지사항은 관리자만 쓸 수 있어요.</p>
        <Link href={backHref} className="btn-outline-court inline-block px-5 py-2 rounded-full text-sm font-bold border">목록으로</Link>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const token = await getAccessToken();
    const r = edit
      ? await updatePost(token, edit.id, { title, content, pinned })
      : await createPost(token, { category, title, content, pinned });
    if (!r.success) {
      setError(r.error);
      setBusy(false);
      return;
    }
    router.push(`/board/${"id" in r ? r.id : edit?.id}`);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="surface rounded-2xl p-5 space-y-4">
      <div>
        <label htmlFor="post-title" className="block text-sm font-bold text-slate-700 mb-1.5">제목</label>
        <input
          id="post-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TITLE_MAX}
          placeholder={isNotice ? "공지 제목" : "제목을 입력하세요"}
          className="h-11 w-full rounded-xl border border-line px-3 text-sm bg-chalk"
        />
      </div>
      <div>
        <label htmlFor="post-content" className="block text-sm font-bold text-slate-700 mb-1.5">내용</label>
        <textarea
          id="post-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={CONTENT_MAX}
          rows={12}
          placeholder={isNotice ? "회원들에게 알릴 내용을 적어주세요." : "테니스 이야기를 자유롭게 나눠보세요. 서로 존중해 주세요 🎾"}
          className="w-full rounded-xl border border-line px-3 py-2.5 text-sm bg-chalk leading-relaxed"
        />
        <p className="text-right text-[11px] text-slate-400 mt-1">{content.length.toLocaleString()} / {CONTENT_MAX.toLocaleString()}</p>
      </div>
      {isNotice && (
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="w-4 h-4" />
          📌 목록 맨 위에 고정하기
        </label>
      )}
      {error && <p className="text-sm font-bold text-clay" role="alert">{error}</p>}
      <div className="flex gap-3">
        <Link href={edit ? `/board/${edit.id}` : backHref} className="btn-outline-court flex-1 h-11 rounded-xl border text-sm font-bold inline-flex items-center justify-center">취소</Link>
        <button type="submit" disabled={busy} className="btn-clay flex-1 h-11 rounded-xl text-sm font-bold disabled:opacity-60">
          {busy ? "저장 중..." : edit ? "수정하기" : "등록하기"}
        </button>
      </div>
    </form>
  );
}
