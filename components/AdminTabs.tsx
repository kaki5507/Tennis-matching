"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "📊 대시보드", exact: true },
  { href: "/admin/users", label: "👥 회원 관리", exact: false },
  { href: "/admin/tournaments/create", label: "🏆 대회 개설", exact: false },
  { href: "/admin/audit", label: "🧾 작업 기록", exact: false },
];

/** 관리자 화면 공통 상단 탭 */
export default function AdminTabs() {
  const pathname = usePathname();
  return (
    <div className="app-bar">
      <nav className="max-w-5xl mx-auto px-4 py-2 flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${active ? "chip-on" : "chip-off-court"}`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
