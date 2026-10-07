// lib/nickname.ts
// 닉네임 규칙 (순수 함수 — 서버/클라이언트/테스트에서 공통 사용)

export const NICKNAME_MIN = 2
export const NICKNAME_MAX = 20
export const NICKNAME_TAKEN_MESSAGE = "이미 사용 중인 닉네임입니다."

/** 앞뒤 공백 제거 + 연속 공백을 하나로 (보이지 않는 문자로 중복을 피해가는 것을 막음) */
export function normalizeNickname(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFC")
    .replace(/[​-‍﻿]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/** 형식 검사. 문제가 있으면 안내 문구, 없으면 null */
export function nicknameFormatError(nickname: string): string | null {
  if (nickname.length < NICKNAME_MIN || nickname.length > NICKNAME_MAX) {
    return `닉네임은 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 입력해주세요.`
  }
  return null
}
