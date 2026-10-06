// app/actions/notification.ts
// 로그인한 본인의 알림함/기기 토큰만 다루는 서버 액션.
// (알림 "발송" 함수는 외부에서 호출되면 안 되므로 lib/push.ts로 분리되어 있습니다)
"use server"

import { prisma } from "@/lib/tournamentData"
import { requireUser } from "@/lib/serverAuth"

/**
 * 브라우저에서 발급받은 FCM 토큰을 저장합니다.
 * 알림 수신에 동의(marketingAgreedAt)한 유저의 토큰만 저장합니다.
 */
export async function registerDeviceToken(accessToken: string | null, deviceToken: string) {
  try {
    const auth = await requireUser(accessToken)
    if (!auth.ok) return { success: false, error: auth.error }
    if (!deviceToken || deviceToken.length > 4096) return { success: false, error: "토큰이 올바르지 않습니다." }

    const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { marketingAgreedAt: true } })
    if (!user?.marketingAgreedAt) {
      return { success: false, error: "알림 수신에 동의하지 않은 계정입니다." }
    }

    // 같은 기기에서 다른 계정으로 로그인한 경우 토큰의 주인이 바뀌는 것이 정상
    await prisma.deviceToken.upsert({
      where: { token: deviceToken },
      update: { userId: auth.userId },
      create: { userId: auth.userId, token: deviceToken },
    })

    return { success: true }
  } catch (error) {
    console.error("디바이스 토큰 등록 에러:", error)
    return { success: false, error: "토큰 등록에 실패했습니다." }
  }
}

/** 인앱 알림함 목록 (최신순, 한 번에 30개) */
export async function getMyNotifications(accessToken: string | null, cursor?: string) {
  try {
    const auth = await requireUser(accessToken, { allowBanned: true })
    if (!auth.ok) return { success: false, notifications: [], hasMore: false }

    const rows = await prisma.notification.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
      take: 31, // 하나 더 가져와서 "다음 페이지 있음"을 판단
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })
    const hasMore = rows.length > 30
    return { success: true, notifications: rows.slice(0, 30), hasMore }
  } catch (error) {
    console.error("알림함 조회 에러:", error)
    return { success: false, notifications: [], hasMore: false }
  }
}

/** 헤더 종 아이콘의 안 읽은 알림 개수 */
export async function getUnreadNotificationCount(accessToken: string | null) {
  try {
    const auth = await requireUser(accessToken, { allowBanned: true })
    if (!auth.ok) return { success: false, count: 0 }

    const count = await prisma.notification.count({ where: { userId: auth.userId, isRead: false } })
    return { success: true, count }
  } catch (error) {
    console.error("안 읽은 알림 수 조회 에러:", error)
    return { success: false, count: 0 }
  }
}

/** 알림 하나를 읽음 처리 (본인 알림만 가능) */
export async function markNotificationAsRead(accessToken: string | null, notificationId: string) {
  try {
    const auth = await requireUser(accessToken, { allowBanned: true })
    if (!auth.ok) return { success: false }

    await prisma.notification.updateMany({
      where: { id: notificationId, userId: auth.userId },
      data: { isRead: true },
    })
    return { success: true }
  } catch (error) {
    console.error("알림 읽음 처리 에러:", error)
    return { success: false }
  }
}

/** 모든 알림 읽음 처리 */
export async function markAllNotificationsAsRead(accessToken: string | null) {
  try {
    const auth = await requireUser(accessToken, { allowBanned: true })
    if (!auth.ok) return { success: false }

    await prisma.notification.updateMany({
      where: { userId: auth.userId, isRead: false },
      data: { isRead: true },
    })
    return { success: true }
  } catch (error) {
    console.error("전체 읽음 처리 에러:", error)
    return { success: false }
  }
}
