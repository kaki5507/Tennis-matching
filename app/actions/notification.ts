// app/actions/notification.ts
"use server"

import { PrismaClient } from "@prisma/client"
import { getMessagingInstance } from "@/lib/firebase-admin"

const prisma = new PrismaClient()

/**
 * 브라우저에서 발급받은 FCM 토큰을 저장합니다.
 * 알림 수신에 동의(marketingAgreedAt)한 유저의 토큰만 저장합니다 —
 * 동의하지 않은 유저는 애초에 토큰을 등록할 이유가 없어야 정상 흐름입니다.
 */
export async function registerDeviceToken(userId: string, token: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return { success: false, error: "존재하지 않는 유저입니다." }
    }
    if (!user.marketingAgreedAt) {
      return { success: false, error: "알림 수신에 동의하지 않은 계정입니다." }
    }

    await prisma.deviceToken.upsert({
      where: { token },
      update: { userId },
      create: { userId, token },
    })

    return { success: true }
  } catch (error) {
    console.error("디바이스 토큰 등록 에러:", error)
    return { success: false, error: "토큰 등록에 실패했습니다." }
  }
}

interface SendPushInput {
  title: string
  body: string
  url?: string
}

/**
 * 특정 유저 한 명에게 알림을 보냅니다.
 * - 마케팅/알림 수신에 동의한 유저에게만 실제 푸시를 발송합니다.
 * - 동의 여부와 무관하게, 인앱 알림함(Notification 테이블)에는 항상 기록을 남깁니다.
 *   (푸시는 거부해도 로그인해서 알림 목록은 볼 수 있게)
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

/** 마이페이지 등에서 인앱 알림함을 보여줄 때 사용 */
export async function getMyNotifications(userId: string) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    })
    return { success: true, notifications }
  } catch (error) {
    console.error("알림함 조회 에러:", error)
    return { success: false, notifications: [] }
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    })
    return { success: true }
  } catch (error) {
    console.error("알림 읽음 처리 에러:", error)
    return { success: false }
  }
}
