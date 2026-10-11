// app/board/[id]/edit/page.tsx — 글 수정
import { notFound } from "next/navigation";
import { getPost } from "@/app/actions/board";
import PostForm from "@/components/board/PostForm";

export const metadata = { title: "글 수정" };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPost(id, false);
  if (!post) notFound();
  return (
    <div className="min-h-screen page-bg py-6 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl heading mb-4">✏️ 글 수정</h1>
        <PostForm category={post.category} edit={{ id: post.id, title: post.title, content: post.content, pinned: post.pinned }} />
      </div>
    </div>
  );
}
