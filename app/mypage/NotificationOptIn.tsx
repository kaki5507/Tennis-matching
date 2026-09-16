"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { requestNotificationPermission } from "@/lib/firebase-client";
import { registerDeviceToken } from "@/app/actions/notification";
import { Bell, BellRing } from "lucide-react";

interface Props {
  userId: string;
  marketingAgreed: boolean; // 가입 시 알림 수신에 동의했는지
}

/**
 * 마이페이지 등에 배치하는 "알림 받기" 버튼.
 * 가입할 때 알림 수신에 동의하지 않은 유저에게는 굳이 브라우저 권한 팝업을
 * 띄우지 않고, 대신 동의를 안내합니다. (동의 없는 발송은 정책상 막혀있음)
 */
export default function NotificationOptIn({ userId, marketingAgreed }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "enabled" | "denied">("idle");

  const handleEnable = async () => {
    setStatus("loading");
    const token = await requestNotificationPermission();

    if (!token) {
      setStatus("denied");
      return;
    }

    const result = await registerDeviceToken(userId, token);
    if (result.success) {
      setStatus("enabled");
    } else {
      setStatus("denied");
    }
  };

  if (!marketingAgreed) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 p-3 bg-slate-50 rounded-lg">
        <Bell className="w-4 h-4 shrink-0" />
        알림을 받으시려면 마이페이지 설정에서 알림 수신에 먼저 동의해주세요.
      </div>
    );
  }

  if (status === "enabled") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700 p-3 bg-green-50 rounded-lg">
        <BellRing className="w-4 h-4 shrink-0" />
        알림이 켜져 있습니다.
      </div>
    );
  }

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        onClick={handleEnable}
        disabled={status === "loading"}
        className="gap-2"
      >
        <Bell className="w-4 h-4" />
        {status === "loading" ? "설정 중..." : "이 브라우저에서 알림 받기"}
      </Button>
      {status === "denied" && (
        <p className="text-xs text-red-500 mt-2">
          알림 권한이 거부되었거나 설정에 실패했어요. 브라우저 알림 설정을 확인해주세요.
        </p>
      )}
    </div>
  );
}
