// lib/push.ts
// 알림 발송(서버 내부 전용). "use server"를 붙이지 마세요 — 붙이면 누구나 임의 유저에게
// 임의 문구의 알림/푸시를 보낼 수 있게 됩니다(피싱/스팸). 서버 액션과 크론에서만 import해서 쓰세요.

import { prisma } from "@/lib/tournamentData"
import { getMessagingInstance } from "@/lib/firebase-admin"

export interface SendPushInput {
  title: string
  body: string
  url?: string
}

/**
 * 특정 유저 한 명에게 알림을 보냅니다.
 * - 마케팅/알림 수신에 동의한 유저에게만 실제 푸시를 발송합니다.
 * - 동의 여부와 무관하게, 인앱 알림함(Notification 테이블)에는 항상 기록을 남깁니다.
 * - FCM 발송이 실패해도(키 미설정 등) 앱 전체가 죽지 않도록 항상 안전하게 처리합니다.
 */
export async function sendPushToUser(userId: string, input: SendPushInput) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return { success: false }

    // 1. 인앱 알림함에는 동의 여부와 무관하게 항상 기록
    await prisma.notification.create({
      data: { userId, title: input.title, body: input.body, url: input.url },
    })

    // 2. 실제 웹 푸시는 알림 수신에 동의한 유저에게만
    if (!user.marketingAgreedAt) {
      return { success: true, pushed: false, reason: "not_consented" }
    }

    const tokens = await prisma.deviceToken.findMany({ where: { userId } })
    if (tokens.length === 0) {
      return { success: true, pushed: false, reason: "no_device" }
    }

    const messaging = getMessagingInstance()
    if (!messaging) {
      console.error("Firebase Admin이 설정되지 않아 푸시를 보낼 수 없습니다.")
      return { success: true, pushed: false, reason: "firebase_not_configured" }
    }

    const response = await messaging.sendEachForMulticast({
      tokens: tokens.map((t) => t.token),
      notification: { title: input.title, body: input.body },
      data: input.url ? { url: input.url } : undefined,
      webpush: { fcmOptions: input.url ? { link: input.url } : undefined },
    })

    // 만료되어 더 이상 유효하지 않은 토큰은 정리
    const invalidTokens = response.responses
      .map((r, i) => (!r.success ? tokens[i].token : null))
      .filter((t): t is string => t !== null)

    if (invalidTokens.length > 0) {
      await prisma.deviceToken.deleteMany({ where: { token: { in: invalidTokens } } })
    }

    return { success: true, pushed: response.successCount > 0 }
  } catch (error) {
    console.error("푸시 발송 에러:", error)
    // 알림 발송 실패는 원래 하려던 작업(수락/거절 등)을 막으면 안 되므로 에러를 던지지 않습니다.
    return { success: false }
  }
}

/** 여러 유저에게 한 번에 같은 알림을 보낼 때 사용 (예: 경기 완료 → 전체 참여자에게 평가 요청) */
export async function sendPushToUsers(userIds: string[], input: SendPushInput) {
  await Promise.all(userIds.map((id) => sendPushToUser(id, input)))
}
