"use client";

// 목록 위 "글쓰기" 버튼. 공지사항은 관리자에게만 보이고, 자유게시판은 누구에게나 보입니다(로그인 안 했으면 로그인으로 안내).

import Link from "next/link";
import { useAuthUser } from "@/lib/useAuthUser";
import { useIsAdmin } from "@/lib/useIsAdmin";
import type { BoardKey } from "@/lib/board";

export default function WriteButton({ tab }: { tab: BoardKey }) {
  const { userId } = useAuthUser();
  const isAdmin = useIsAdmin(userId);
  if (tab === "notice" && !isAdmin) return null;
  return (
    <Link href={userId ? `/board/new?c=${tab}` : "/login"} className="btn-clay h-10 px-5 rounded-xl text-sm font-bold inline-flex items-center shrink-0">
      ✏️ {tab === "notice" ? "공지 쓰기" : tab === "suggest" ? "건의하기" : "글쓰기"}
    </Link>
  );
}
