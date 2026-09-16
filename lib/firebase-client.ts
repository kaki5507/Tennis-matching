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

/**
 * 브라우저 알림 권한을 요청하고, 허용되면 FCM 토큰을 발급받아 반환합니다.
 * 이 토큰을 서버로 보내 DeviceToken 테이블에 저장해야 실제 푸시를 받을 수 있습니다.
 */
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    if (typeof window === "undefined") return null

    const supported = await isSupported()
    if (!supported) {
      console.warn("이 브라우저는 웹 푸시를 지원하지 않습니다.")
      return null
    }

    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      console.error(
        "Firebase 클라이언트 환경변수가 설정되지 않았습니다. .env.example을 참고해주세요."
      )
      return null
    }

    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      return null
    }

    const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig)
    const messaging = getMessaging(app)

    // 백그라운드 수신을 위한 서비스워커 등록
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js")

    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    })

    return token || null
  } catch (error) {
    console.error("알림 권한 요청 에러:", error)
    return null
  }
}
