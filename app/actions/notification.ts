// app/actions/notification.ts
// 로그인한 본인의 알림함/기기 토큰만 다루는 서버 액션.
// (알림 "발송" 함수는 외부에서 호출되면 안 되므로 lib/push.ts로 분리되어 있습니다)
"use server"

import { prisma } from "@/lib/tournamentData"
import { requireUser } from "@/lib/serverAuth"
import { sendPushToUser } from "@/lib/push"

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

/** 내 기기로 테스트 알림 보내기 (본인에게만 발송). 왜 안 오는지 확인할 수 있게 결과를 자세히 돌려줍니다. */
export async function sendTestPushToMe(accessToken: string | null) {
  try {
    const auth = await requireUser(accessToken, { allowBanned: true })
    if (!auth.ok) return { success: false, message: auth.error ?? "로그인이 필요합니다." }

    // 연속으로 누르는 것 방지: 직전 테스트 알림 후 20초
    const recent = await prisma.notification.findFirst({
      where: { userId: auth.userId, title: "테스트 알림", createdAt: { gt: new Date(Date.now() - 20_000) } },
      select: { id: true },
    })
    if (recent) return { success: false, message: "방금 보냈어요. 20초 뒤에 다시 눌러 주세요." }

    const r = await sendPushToUser(auth.userId, { title: "테스트 알림", body: "이 알림이 보이면 푸시가 정상이에요.", url: "/notifications" })
    if (!r.success) return { success: false, message: "발송 중 오류가 났어요." }
    if (r.pushed) return { success: true, message: `등록된 기기 ${r.devices}대 중 ${r.delivered}대로 보냈어요. 몇 초 안에 도착해요.` }
    if ("reason" in r && r.reason === "not_consented") return { success: false, message: "알림 수신 동의가 꺼져 있어요." }
    if ("reason" in r && r.reason === "no_device") return { success: false, message: "등록된 기기가 없어요. 위의 알림 받기 버튼을 먼저 눌러 주세요." }
    if ("reason" in r && r.reason === "firebase_not_configured") return { success: false, message: "서버의 푸시 설정(Firebase)이 비어 있어요." }
    const codes = "errors" in r && r.errors ? [...new Set(r.errors)].join(", ") : ""
    return { success: false, message: `기기로 전달하지 못했어요. 알림 받기를 다시 눌러 주세요.${codes ? ` (${codes})` : ""}` }
  } catch (error) {
    console.error("테스트 푸시 에러:", error)
    return { success: false, message: "발송 중 오류가 났어요." }
  }
}
