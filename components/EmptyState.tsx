// components/EmptyState.tsx
// 목록이 비었을 때 보여주는 안내. 캐릭터 + 제목 + 설명 + (선택) 행동 버튼.
// 서버/클라이언트 어디서나 쓸 수 있습니다.

import TennisMascot, { type MascotPose } from "@/components/TennisMascot";

interface Props {
  pose?: MascotPose;
  title: string;
  description?: React.ReactNode;
  /** 버튼/링크 등 다음 행동 */
  children?: React.ReactNode;
  /** compact: 카드 안쪽의 작은 빈 영역, default: 목록 전체가 빈 경우 */
  size?: "default" | "compact";
  /** 초록 코트 배경 위에서 쓸 때 */
  onCourt?: boolean;
}

export default function EmptyState({ pose = "sleep", title, description, children, size = "default", onCourt = false }: Props) {
  const compact = size === "compact";
  return (
    <div
      className={`text-center ${
        compact ? "py-6 px-4" : "py-14 px-6"
      } ${onCourt ? "on-court-panel rounded-2xl" : ""}`}
      role="status"
    >
      <TennisMascot pose={pose} className={`mx-auto mascot-float ${compact ? "w-20 h-20 mb-2" : "w-32 h-32 mb-3"}`} />
      <p className={`font-display ${compact ? "text-base" : "text-xl"} ${onCourt ? "text-chalk" : "text-court"}`}>{title}</p>
      {description && (
        <p className={`mt-1.5 text-sm leading-relaxed ${onCourt ? "text-chalk opacity-80" : "text-ink-muted"}`}>{description}</p>
      )}
      {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
