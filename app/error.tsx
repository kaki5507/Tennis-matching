"use client";

import Link from "next/link";
import EmptyState from "@/components/EmptyState";

// 화면을 그리다 문제가 생겼을 때 보이는 화면 (헤더는 그대로 유지됨)
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[70vh] page-bg flex items-center justify-center px-4 py-12">
      <div className="surface rounded-2xl shadow-sm max-w-md w-full">
        <EmptyState
          pose="sleep"
          title="잠깐 문제가 생겼어요"
          description={<>일시적인 오류일 수 있어요.<br />다시 시도해도 안 되면 잠시 후 이용해 주세요.</>}
        >
          <button type="button" onClick={() => reset()} className="btn-clay px-5 py-2.5 rounded-lg text-sm font-bold">
            다시 시도
          </button>
          <Link href="/" className="btn-outline-court px-4 py-2.5 rounded-lg text-sm font-medium border">
            메인으로
          </Link>
        </EmptyState>
      </div>
    </div>
  );
}
