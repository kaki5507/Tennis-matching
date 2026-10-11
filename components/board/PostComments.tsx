"use client";

// 게시글 댓글. 읽기는 누구나, 쓰기는 로그인한 회원, 삭제는 본인 또는 관리자.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { addPostComment, deletePostComment, listPostComments } from "@/app/actions/board";
import { getAccessToken } from "@/lib/authToken";
import { useAuthUser } from "@/lib/useAuthUser";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { COMMENT_MAX } from "@/lib/board";

type C = Awaited<ReturnType<typeof listPostComments>>[number];

export default function PostComments({ postId }: { postId: string }) {
  const { userId } = useAuthUser();
  const isAdmin = useIsAdmin(userId);
  const [items, setItems] = useState<C[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setItems(await listPostComments(postId));
  }, [postId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    const r = await addPostComment(await getAccessToken(), postId, text);
    if (r.success) {
      setText("");
      await load();
    } else setError(r.error);
    setBusy(false);
  };

  const remove = async (id: string) => {
    if (!confirm("댓글을 삭제할까요?")) return;
    const r = await deletePostComment(await getAccessToken(), id);
    if (r.success) await load();
    else setError(r.error);
  };

  return (
    <section className="surface rounded-2xl p-4 sm:p-5 mt-4">
      <h2 className="text-base heading mb-3">💬 댓글 {items ? items.length : ""}</h2>
      {items === null ? (
        <p className="text-sm text-slate-400 py-4 text-center">불러오는 중...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">첫 댓글을 남겨보세요.</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((c) => (
            <li key={c.id} className="py-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm min-w-0">
                  <Link href={`/users/${c.userId}`} className="font-bold text-slate-800 hover:underline">{c.nickname}</Link>
                  {c.isAdmin && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full chip-on align-middle">운영진</span>}
                  <span className="ml-2 text-xs text-slate-400 whitespace-nowrap">
                    {new Date(c.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </p>
                {(isAdmin || userId === c.userId) && (
                  <button type="button" onClick={() => remove(c.id)} className="text-xs text-slate-400 hover:text-clay shrink-0">삭제</button>
                )}
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap break-words mt-1 leading-relaxed">{c.content}</p>
            </li>
          ))}
        </ul>
      )}

      {userId ? (
        <form onSubmit={submit} className="flex gap-2 mt-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={COMMENT_MAX}
            placeholder="댓글을 입력하세요"
            className="h-10 flex-1 min-w-0 rounded-xl border border-line px-3 text-sm bg-chalk"
          />
          <button type="submit" disabled={busy || !text.trim()} className="btn-clay h-10 px-4 rounded-xl text-sm font-bold shrink-0 disabled:opacity-60">등록</button>
        </form>
      ) : (
        <p className="text-xs text-slate-500 mt-3">
          댓글을 쓰려면 <Link href="/login" className="underline font-bold text-court">로그인</Link>이 필요해요.
        </p>
      )}
      {error && <p className="text-xs font-bold text-clay mt-2" role="alert">{error}</p>}
    </section>
  );
}
