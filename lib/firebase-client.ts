// lib/firebase-client.ts
// 브라우저(클라이언트 컴포넌트)에서만 사용합니다.

import { initializeApp, getApps } from "firebase/app"
import { getMessaging, getToken, isSupported } from "firebase/messaging"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export type PushSetupReason = "unsupported" | "ios_need_home" | "denied" | "config" | "error"
export type PushSetupResult = { ok: true; token: string } | { ok: false; reason: PushSetupReason; detail?: string }

/** 아이폰/아이패드인데 홈 화면 앱으로 열지 않은 상태인지 (이 상태에서는 알림을 켤 수 없음) */
export function iosNeedsHomeScreen(): boolean {
  if (typeof window === "undefined") return false
  const ua = navigator.userAgent
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)
  if (!ios) return false
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true
  return !standalone
}

/** 이 기기에서 이미 알림 권한이 허용돼 있는지 */
export function pushPermissionGranted(): boolean {
  return typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted"
}

/**
 * 브라우저 알림 권한을 요청하고, 허용되면 FCM 토큰을 발급받아 반환합니다.
 * 이 토큰을 서버로 보내 DeviceToken 테이블에 저장해야 실제 푸시를 받을 수 있습니다.
 *
 * 주의: 권한 요청(Notification.requestPermission)은 버튼을 누른 "직후"에 불러야 합니다.
 * 그 앞에 다른 비동기 작업을 기다리면 아이폰 사파리는 사용자가 누른 것으로 인정하지 않아 권한 창을 띄우지 않습니다.
 */
export async function requestNotificationPermission(): Promise<PushSetupResult> {
  try {
    if (typeof window === "undefined") return { ok: false, reason: "unsupported" }
    if (iosNeedsHomeScreen()) return { ok: false, reason: "ios_need_home" }
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return { ok: false, reason: "unsupported" }
    }

    // 1) 가장 먼저 권한 요청 (사용자 동작 직후여야 함)
    const permission = await Notification.requestPermission()
    if (permission !== "granted") return { ok: false, reason: "denied" }

    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      console.error("Firebase 클라이언트 환경변수가 설정되지 않았습니다. .env.example을 참고해주세요.")
      return { ok: false, reason: "config" }
    }
    if (!(await isSupported())) return { ok: false, reason: "unsupported" }

    const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig)
    const messaging = getMessaging(app)

    // 2) 백그라운드 수신용 서비스워커 등록. 활성화가 끝난 뒤에 토큰을 받아야 아이폰에서 실패하지 않습니다.
    await navigator.serviceWorker.register("/firebase-messaging-sw.js")
    const registration = await navigator.serviceWorker.ready

    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    })
    if (!token) return { ok: false, reason: "error", detail: "토큰을 받지 못했어요" }
    return { ok: true, token }
  } catch (error) {
    console.error("알림 권한 요청 에러:", error)
    return { ok: false, reason: "error", detail: error instanceof Error ? error.message.slice(0, 160) : String(error).slice(0, 160) }
  }
}
