// app/board/page.tsx
// 게시판: 공지사항 / 자유게시판. 누구나(로그인 안 해도) 읽을 수 있어요.

import Link from "next/link";
import { listPosts } from "@/app/actions/board";
import WriteButton from "@/components/board/WriteButton";
import { BOARD_TABS, categoryOfKey } from "@/lib/board";

export const metadata = { title: "게시판" };

function ago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" });
}

export default async function BoardPage({ searchParams }: { searchParams: Promise<{ c?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const tab = BOARD_TABS.find((t) => t.key === sp.c) ?? BOARD_TABS[0];
  const q = (sp.q ?? "").trim().slice(0, 50);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const { posts, total, pageSize, success } = await listPosts(categoryOfKey(tab.key), page, q);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: { c?: string; q?: string; page?: number }) => {
    const u = new URLSearchParams();
    u.set("c", p.c ?? tab.key);
    const qq = p.q ?? q;
    if (qq) u.set("q", qq);
    if (p.page && p.page > 1) u.set("page", String(p.page));
    return `/board?${u.toString()}`;
  };

  return (
    <div className="min-h-screen page-bg py-6 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl heading mb-1">📋 게시판</h1>
        <p className="text-sm text-ink-muted mb-4">{tab.desc}</p>

        <div className="flex gap-2 mb-3">
          {BOARD_TABS.map((t) => (
            <Link key={t.key} href={`/board?c=${t.key}`} className={`rounded-full px-4 py-2 text-sm font-bold whitespace-nowrap ${t.key === tab.key ? "chip-on" : "chip-off"}`}>
              {t.emoji} {t.label}
            </Link>
          ))}
        </div>

        <div className="flex gap-2 mb-3">
          <form action="/board" className="flex gap-2 flex-1 min-w-0">
            <input type="hidden" name="c" value={tab.key} />
            <input name="q" defaultValue={q} placeholder="제목·내용 검색" maxLength={50} className="h-10 flex-1 min-w-0 rounded-xl border border-line px-3 text-sm bg-chalk" />
            <button type="submit" className="btn-outline-court h-10 px-4 rounded-xl border text-sm font-bold shrink-0">검색</button>
          </form>
          <WriteButton tab={tab.key} />
        </div>

        {!success ? (
          <div className="surface rounded-2xl p-8 text-center text-sm text-slate-400">게시글을 불러오지 못했어요. 잠시 후 다시 시도해주세요.</div>
        ) : posts.length === 0 ? (
          <div className="surface rounded-2xl p-10 text-center text-sm text-slate-400">
            {q ? "검색 결과가 없어요." : tab.key === "notice" ? "아직 공지사항이 없어요." : "첫 글을 남겨보세요!"}
          </div>
        ) : (
          <ul className="surface rounded-2xl divide-y divide-line overflow-hidden">
            {posts.map((p) => (
              <li key={p.id}>
                <Link href={`/board/${p.id}`} className="row-link block px-4 py-3">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5 min-w-0">
                    {p.pinned && <span className="shrink-0" title="고정된 글">📌</span>}
                    <span className="truncate">{p.title}</span>
                    {p.commentCount > 0 && <span className="shrink-0 text-xs font-bold text-court">[{p.commentCount}]</span>}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {p.authorNickname}{p.authorIsAdmin ? " (운영진)" : ""} · {ago(p.createdAt)} · 조회 {p.viewCount}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4 text-sm">
            {page > 1 && <Link href={href({ page: page - 1 })} className="chip-off rounded-full px-4 py-2 font-bold">이전</Link>}
            <span className="text-slate-500">{page} / {pages}</span>
            {page < pages && <Link href={href({ page: page + 1 })} className="chip-off rounded-full px-4 py-2 font-bold">다음</Link>}
          </div>
        )}
      </div>
    </div>
  );
}
