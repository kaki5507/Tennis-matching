// app/board/new/page.tsx — 새 글 쓰기
import PostForm from "@/components/board/PostForm";
import { categoryOfKey } from "@/lib/board";

export const metadata = { title: "글쓰기" };

export default async function NewPostPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const category = categoryOfKey(c);
  return (
    <div className="min-h-screen page-bg py-6 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl heading mb-4">{category === "NOTICE" ? "📢 공지 쓰기" : "✏️ 자유게시판 글쓰기"}</h1>
        <PostForm category={category} />
      </div>
    </div>
  );
}
