"use client";

// components/AvatarStack.tsx
// 참여자 프로필을 겹쳐서 보여주고 "현재/정원"을 함께 표시합니다. 사진이 없으면 닉네임 첫 글자 원.

import UserAvatar from "@/components/UserAvatar";

export interface StackUser {
  id: string;
  nickname: string | null;
  level?: number; // 레벨에 따라 테두리가 달라져요 (lib/levels.ts)
}

function Avatar({ user }: { user: StackUser }) {
  const lv = Math.min(Math.max(user.level ?? 1, 1), 7);
  return (
    <span className={`lv-ring lv-${lv}`} title={`${user.nickname ?? "익명"} · Lv.${lv}`}>
      <UserAvatar id={user.id} nickname={user.nickname} className="w-7 h-7" />
    </span>
  );
}

export default function AvatarStack({
  users,
  joined,
  capacity,
  max = 5,
}: {
  users: StackUser[]; // 방장 + 확정 참가자
  joined: number;
  capacity: number | null;
  max?: number;
}) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex -space-x-2.5" aria-hidden>
        {shown.map((u) => (
          <Avatar key={u.id} user={u} />
        ))}
        {extra > 0 && (
          <span className="inline-flex w-7 h-7 rounded-full ring-2 ring-white tint text-[10px] font-bold items-center justify-center text-slate-500">
            +{extra}
          </span>
        )}
      </div>
      <span className="text-sm text-slate-500">
        <b className="text-slate-800">{joined}</b>
        {capacity ? <span>/{capacity}명</span> : <span>명</span>}
      </span>
    </div>
  );
}
