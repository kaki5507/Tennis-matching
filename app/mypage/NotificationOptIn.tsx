"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { requestNotificationPermission, iosNeedsHomeScreen, pushPermissionGranted, type PushSetupReason } from "@/lib/firebase-client";
import { registerDeviceToken, sendTestPushToMe } from "@/app/actions/notification";
import { Bell, BellRing } from "lucide-react";
import { getAccessToken } from "@/lib/authToken";

interface Props {
  marketingAgreed: boolean; // 가입 시 알림 수신에 동의했는지
}

const REASON_TEXT: Record<PushSetupReason, string> = {
  ios_need_home: "아이폰은 홈 화면에 추가한 아이콘으로 들어와야 알림을 켤 수 있어요. 사파리 공유 버튼 > 홈 화면에 추가를 한 뒤, 그 아이콘으로 다시 들어와 주세요.",
  denied: "알림 권한이 꺼져 있어요. 아이폰은 설정 > 알림 > 테니스매칭, 그 밖의 기기는 브라우저의 사이트 설정에서 알림을 허용해 주세요.",
  unsupported: "이 브라우저는 푸시 알림을 지원하지 않아요. 카카오톡·인스타 안에서 열었다면 크롬이나 사파리로 다시 열어 주세요.",
  config: "서버의 푸시 설정이 비어 있어요. 운영자에게 알려 주세요.",
  error: "알림 설정 중 문제가 생겼어요. 잠시 뒤 다시 눌러 주세요.",
};

/**
 * 마이페이지의 "알림 받기" 영역.
 * 가입할 때 알림 수신에 동의하지 않은 유저에게는 브라우저 권한 창을 띄우지 않고 동의를 안내합니다.
 */
export default function NotificationOptIn({ marketingAgreed }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "enabled">("idle");
  const [error, setError] = useState("");
  const [granted, setGranted] = useState(false); // 이 기기에 이미 권한이 있는지
  const [needHome, setNeedHome] = useState(false);
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGranted(pushPermissionGranted());
    setNeedHome(iosNeedsHomeScreen());
  }, []);

  const handleEnable = async () => {
    setStatus("loading");
    setError("");
    const r = await requestNotificationPermission();
    if (!r.ok) {
      setStatus("idle");
      setError(REASON_TEXT[r.reason] + (r.reason === "error" && r.detail ? ` (${r.detail})` : ""));
      return;
    }
    const result = await registerDeviceToken(await getAccessToken(), r.token);
    if (result.success) {
      setStatus("enabled");
      setGranted(true);
    } else {
      setStatus("idle");
      setError(result.error ?? "기기 등록에 실패했어요.");
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestMsg(null);
    const r = await sendTestPushToMe(await getAccessToken());
    setTestMsg({ ok: r.success, text: r.message });
    setTesting(false);
  };

  if (!marketingAgreed) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 p-3 tint rounded-lg">
        <Bell className="w-4 h-4 shrink-0" />
        알림을 받으시려면 마이페이지 설정에서 알림 수신에 먼저 동의해주세요.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {needHome && (
        <p className="text-sm p-3 rounded-lg alert-warn border leading-relaxed">{REASON_TEXT.ios_need_home}</p>
      )}

      {status === "enabled" && (
        <div className="flex items-center gap-2 text-sm text-ok p-3 bg-ok-soft rounded-lg">
          <BellRing className="w-4 h-4 shrink-0" />
          이 기기가 등록됐어요. 아래 테스트 알림으로 확인해 보세요.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={handleEnable} disabled={status === "loading" || needHome} className="gap-2">
          <Bell className="w-4 h-4" />
          {status === "loading" ? "설정 중..." : granted ? "이 기기 다시 등록하기" : "이 기기에서 알림 받기"}
        </Button>
        <Button type="button" variant="outline" onClick={handleTest} disabled={testing} className="gap-2">
          {testing ? "보내는 중..." : "테스트 알림 보내기"}
        </Button>
      </div>

      {error && <p className="text-xs text-danger leading-relaxed">{error}</p>}
      {testMsg && <p className={`text-xs leading-relaxed ${testMsg.ok ? "text-ok" : "text-danger"}`}>{testMsg.text}</p>}

      <p className="text-xs text-slate-500 leading-relaxed">
        테스트 알림을 누른 뒤 앱을 닫고 기다려 보세요. 앱을 보고 있는 동안에는 배너가 안 뜰 수 있어요.
        PC는 브라우저가 완전히 종료돼 있으면 알림이 오지 않아요.
      </p>
    </div>
  );
}
