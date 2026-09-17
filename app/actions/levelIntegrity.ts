// app/actions/levelIntegrity.ts
"use server"

import { PrismaClient } from "@prisma/client"
import { sendPushToUser } from "@/app/actions/notification"

const prisma = new PrismaClient()

// 자기신고 구력(문자열)을 숫자로 환산하는 표 (profile 페이지의 선택지와 반드시 일치시켜야 함)
const LEVEL_BUCKETS: { label: string; value: number }[] = [
  { label: "테린이", value: 1.5 },
  { label: "NTRP 2.0", value: 2.0 },
  { label: "NTRP 2.5", value: 2.5 },
  { label: "NTRP 3.0", value: 3.0 },
  { label: "NTRP 3.5", value: 3.5 },
]

// 최소 이만큼 평가가 쌓여야 "믿을 만한 실력 데이터"로 보고 자동조정을 검토합니다.
// (참여 시 레벨 제한 검증은 3회 기준이지만, 레벨을 강제로 바꾸는 건 더 신중해야 하므로 5회로 잡음)
const MIN_EVAL_COUNT_FOR_PENALTY = 5

// 이 이상 차이나면 "허위 구력"으로 판단합니다. (NTRP 1.0점 차이 = 한 체급 이상 차이)
const MISMATCH_THRESHOLD = 1.0

// 자동조정이 이 횟수만큼 누적되면, 반복적인 허위신고로 보고 계정을 정지합니다.
const BAN_AFTER_MISMATCH_COUNT = 3

function selfDeclaredValue(tennisLevel: string): number | null {
  const bucket = LEVEL_BUCKETS.find((b) => b.label === tennisLevel)
  return bucket ? bucket.value : null // "NTRP 3.5 이상"처럼 매핑 안 되는 자유입력값은 검사를 건너뜀
}

function nearestBucketLabel(score: number): string {
  let closest = LEVEL_BUCKETS[0]
  let minDiff = Math.abs(score - closest.value)
  for (const bucket of LEVEL_BUCKETS) {
    const diff = Math.abs(score - bucket.value)
    if (diff < minDiff) {
      closest = bucket
      minDiff = diff
    }
  }
  return closest.label
}

/**
 * 한 유저의 최신 NTRP 평가 데이터를, 본인이 신고한 구력과 비교합니다.
 * 차이가 기준치 이상이면:
 *  1) tennisLevel을 실제 평가 기반 레벨로 강제 조정
 *  2) levelMismatchCount 1 증가
 *  3) 본인에게 알림으로 사유 안내
 *  4) 누적 3회째면 계정 정지(isBanned = true) — 반복적 허위신고에 대한 페널티
 *
 * evaluation.ts에서 평가가 새로 저장될 때마다 호출됩니다.
 */
export async function checkLevelIntegrity(userId: string, realScore: number, ntrpCount: number) {
  try {
    if (ntrpCount < MIN_EVAL_COUNT_FOR_PENALTY) {
      return { adjusted: false, reason: "insufficient_data" as const }
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return { adjusted: false, reason: "user_not_found" as const }

    const selfScore = selfDeclaredValue(user.tennisLevel)
    if (selfScore === null) {
      // 자유입력 등 매핑 불가능한 값이면 자동조정 대상에서 제외 (오탐 방지)
      return { adjusted: false, reason: "unmappable_level" as const }
    }

    const diff = Math.abs(realScore - selfScore)
    if (diff < MISMATCH_THRESHOLD) {
      return { adjusted: false, reason: "within_threshold" as const }
    }

    const newLevel = nearestBucketLabel(realScore)
    if (newLevel === user.tennisLevel) {
      // 이미 조정된 상태와 같은 값이면 다시 조정할 필요 없음
      return { adjusted: false, reason: "already_matching" as const }
    }

    const newMismatchCount = user.levelMismatchCount + 1
    const shouldBan = newMismatchCount >= BAN_AFTER_MISMATCH_COUNT

    await prisma.user.update({
      where: { id: userId },
      data: {
        tennisLevel: newLevel,
        levelMismatchCount: newMismatchCount,
        ...(shouldBan ? { isBanned: true } : {}),
      },
    })

    const direction = realScore > selfScore ? "높게" : "낮게"
    await sendPushToUser(userId, {
      title: shouldBan ? "⚠️ 계정이 정지되었습니다" : "🎾 구력 정보가 자동 조정되었어요",
      body: shouldBan
        ? `반복적으로 신고 구력과 실제 평가가 크게 달라 이용이 제한되었습니다. 문의는 고객센터로 부탁드려요.`
        : `동료 평가 결과, 실제 실력이 신고하신 구력보다 ${direction} 나타나 '${newLevel}'로 자동 조정되었습니다.`,
      url: "/mypage",
    })

    return { adjusted: true, newLevel, mismatchCount: newMismatchCount, banned: shouldBan }
  } catch (error) {
    console.error("허위구력 검사 에러:", error)
    // 이 검사가 실패해도 원래 하려던 평가 저장 자체는 막지 않습니다.
    return { adjusted: false, reason: "error" as const }
  }
}
