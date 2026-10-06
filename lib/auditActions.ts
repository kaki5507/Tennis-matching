// lib/auditActions.ts
// 감사 로그의 작업 코드와 화면 표시용 이름. (서버/클라이언트 양쪽에서 import 가능)
// 새 관리자 기능을 만들면 여기에 코드를 추가하고 logAdminAction을 호출하면 됩니다.

export const AUDIT_ACTIONS = {
  USER_BAN: { label: "회원 정지", group: "회원", tone: "danger" },
  USER_UNBAN: { label: "정지 해제", group: "회원", tone: "ok" },
  USER_VIEW: { label: "회원 상세 조회", group: "조회", tone: "info" },
  USER_SEARCH: { label: "회원 검색", group: "조회", tone: "info" },
  USER_EXPORT: { label: "회원 CSV 내보내기", group: "조회", tone: "danger" },
  TOURNAMENT_CREATE: { label: "대회 개설", group: "대회", tone: "ok" },
  TOURNAMENT_STATUS: { label: "대회 상태 변경", group: "대회", tone: "info" },
  TOURNAMENT_RESULT: { label: "대회 결과 직접 기록", group: "대회", tone: "info" },
  BRACKET_GENERATE: { label: "대진표 생성", group: "대회", tone: "ok" },
  BRACKET_RESET: { label: "대진표 초기화", group: "대회", tone: "danger" },
  MATCH_RESULT: { label: "경기 결과 입력", group: "대회", tone: "info" },
  MAINTENANCE_ON: { label: "점검 모드 켬", group: "시스템", tone: "danger" },
  MAINTENANCE_OFF: { label: "점검 모드 끔", group: "시스템", tone: "ok" },
  MAINTENANCE_UPDATE: { label: "점검 안내 수정", group: "시스템", tone: "info" },
} as const

export type AuditAction = keyof typeof AUDIT_ACTIONS
export type AuditGroup = "회원" | "조회" | "대회" | "시스템"

export const AUDIT_GROUPS: AuditGroup[] = ["회원", "대회", "조회", "시스템"]

export function actionLabel(code: string): string {
  return (AUDIT_ACTIONS as Record<string, { label: string }>)[code]?.label ?? code
}
