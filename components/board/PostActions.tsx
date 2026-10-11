"use client";

// 글 상세의 수정 / 삭제 / 고정 버튼. 본인 글이거나 관리자일 때만 보입니다 (실제 권한 검사는 서버가 다시 합니다).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deletePost, setPostPinned } from "@/app/actions/board";
import { getAccessToken } from "@/lib/authToken";
import { useAuthUser } from "@/lib/useAuthUser";
import { useIsAdmin } from "@/lib/useIsAdmin";
import type { BoardCategory } from "@/lib/board";

export default function PostActions({ id, authorId, category, pinned }: { id: string; authorId: string; category: BoardCategory; pinned: boolean }) {
  const router = useRouter();
  const { userId } = useAuthUser();
  const isAdmin = useIsAdmin(userId);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const isAuthor = !!userId && userId === authorId;
  const canEdit = category === "NOTICE" ? isAdmin : isAuthor;
  const canDelete = isAuthor || isAdmin;
  if (!canEdit && !canDelete) return null;

  const remove = async () => {
    if (!confirm("이 글을 삭제할까요? 되돌릴 수 없어요.")) return;
    setBusy(true);
    const r = await deletePost(await getAccessToken(), id);
    if (r.success) {
      router.push(`/board?c=${category === "FREE" ? "free" : "notice"}`);
      router.refresh();
    } else {
      setMsg(r.error);
      setBusy(false);
    }
  };

  const togglePin = async () => {
    setBusy(true);
    const r = await setPostPinned(await getAccessToken(), id, !pinned);
    setBusy(false);
    if (r.success) router.refresh();
    else setMsg(r.error);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canEdit && (
        <Link href={`/board/${id}/edit`} className="btn-outline-court h-9 px-4 rounded-lg border text-sm font-bold inline-flex items-center">수정</Link>
      )}
      {isAdmin && category === "NOTICE" && (
        <button type="button" onClick={togglePin} disabled={busy} className="btn-outline-court h-9 px-4 rounded-lg border text-sm font-bold disabled:opacity-60">
          {pinned ? "📌 고정 해제" : "📌 고정"}
        </button>
      )}
      {canDelete && (
        <button type="button" onClick={remove} disabled={busy} className="btn-clay h-9 px-4 rounded-lg text-sm font-bold disabled:opacity-60">삭제</button>
      )}
      {msg && <span className="text-xs font-bold text-clay">{msg}</span>}
    </div>
  );
}
