// app/board/[id]/page.tsx — 글 상세 (누구나 읽기)
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost } from "@/app/actions/board";
import PostActions from "@/components/board/PostActions";
import PostComments from "@/components/board/PostComments";
import { keyOfCategory, labelOfCategory } from "@/lib/board";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) notFound();
  const key = keyOfCategory(post.category);

  return (
    <div className="min-h-screen page-bg py-6 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href={`/board?c=${key}`} className="text-sm font-bold text-court">← {labelOfCategory(post.category)}</Link>

        <article className="surface rounded-2xl p-5 sm:p-6 mt-3">
          <h1 className="text-xl sm:text-2xl heading break-words">
            {post.pinned && <span title="고정된 글">📌 </span>}
            {post.title}
          </h1>
          <p className="text-xs text-slate-500 mt-2">
            <Link href={`/users/${post.authorId}`} className="font-bold text-slate-700 hover:underline">{post.authorNickname}</Link>
            {post.authorIsAdmin && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full chip-on align-middle">운영진</span>}
            {" · "}
            {new Date(post.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            {post.edited ? " (수정됨)" : ""} · 조회 {post.viewCount}
          </p>
          <div className="h-px bg-line my-4" />
          <div className="text-sm sm:text-base text-slate-800 whitespace-pre-wrap break-words leading-relaxed min-h-[120px]">{post.content}</div>
          <div className="mt-5">
            <PostActions id={post.id} authorId={post.authorId} category={post.category} pinned={post.pinned} />
          </div>
        </article>

        <PostComments postId={post.id} />
      </div>
    </div>
  );
}
