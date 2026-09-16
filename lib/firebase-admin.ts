// lib/firebase-admin.ts
// 서버(Server Action)에서만 사용하는 Firebase Admin SDK 초기화.
// 절대 클라이언트 컴포넌트에서 import하지 마세요 (비공개 키 노출 위험).

import { initializeApp, getApps, cert, type App } from "firebase-admin/app"
import { getMessaging } from "firebase-admin/messaging"

function getFirebaseAdminApp(): App | null {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  // .env에 개행문자(\n)가 이스케이프되어 저장되는 경우가 많아 복원해줍니다.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

  if (!projectId || !clientEmail || !privateKey) {
    // 아직 Firebase 프로젝트를 연결하지 않은 개발 초기 상태를 위한 안전장치.
    console.error(
      "Firebase Admin 환경변수가 설정되지 않았습니다. .env.example을 참고해주세요."
    )
    return null
  }

  if (getApps().length > 0) {
    return getApps()[0]
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  })
}

export function getMessagingInstance() {
  const app = getFirebaseAdminApp()
  if (!app) return null
  return getMessaging(app)
}
