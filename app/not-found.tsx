import Link from "next/link";
import EmptyState from "@/components/EmptyState";

// 없는 주소(404)로 들어왔을 때 보이는 화면
export default function NotFound() {
  return (
    <div className="min-h-[70vh] page-bg flex items-center justify-center px-4 py-12">
      <div className="surface rounded-2xl shadow-sm max-w-md w-full">
        <EmptyState
          pose="search"
          title="공이 코트 밖으로 나갔어요"
          description={<>찾으시는 페이지가 없거나 옮겨졌어요.<br />주소를 다시 확인하거나 아래에서 이동해 주세요.</>}
        >
          <Link href="/" className="btn-clay px-5 py-2.5 rounded-lg text-sm font-bold">
            메인으로
          </Link>
          <Link href="/matches" className="btn-outline-court px-4 py-2.5 rounded-lg text-sm font-medium border">
            방 찾기
          </Link>
        </EmptyState>
      </div>
    </div>
  );
}
