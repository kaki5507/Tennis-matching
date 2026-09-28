// lib/gender.ts
// 성별에 따른 색상/라벨 판정. 순수 함수라서 화면과 서버 어디서든 같은 기준으로 씁니다.
// DB에는 'MALE' | 'FEMALE' | null 로 저장되고, 프로필을 아직 안 채운 유저는 null 입니다.

export type Gender = "M" | "F";

/** 선수 한 명의 성별 표시 종류. 모르면 null */
export function toGender(value: string | null | undefined): Gender | null {
  if (!value) return null;
  const v = value.trim().toUpperCase();
  if (v === "MALE" || v === "M") return "M";
  if (v === "FEMALE" || v === "F") return "F";
  return null;
}

/** 참가 단위(선수 1명 또는 2인 팀)의 성별 구성 */
export type GenderKind = "M" | "F" | "MM" | "FF" | "MF" | "unknown";

/** 단식 선수의 종류 */
export function singleKind(value: string | null | undefined): GenderKind {
  return toGender(value) ?? "unknown";
}

/** 복식 팀의 종류 (남복/여복/혼복). 한 명이라도 성별을 모르면 unknown */
export function teamKind(a: string | null | undefined, b: string | null | undefined): GenderKind {
  const x = toGender(a);
  const y = toGender(b);
  if (!x || !y) return "unknown";
  if (x === "M" && y === "M") return "MM";
  if (x === "F" && y === "F") return "FF";
  return "MF";
}

/** 팀 종류 라벨 */
export function teamKindLabel(kind: GenderKind): string {
  switch (kind) {
    case "MM":
      return "남복";
    case "FF":
      return "여복";
    case "MF":
      return "혼복";
    case "M":
      return "남성";
    case "F":
      return "여성";
    default:
      return "";
  }
}

/** globals.css 의 색상 클래스 이름 (배경). 혼합은 두 색이 반반 섞인 배지 */
export function genderBadgeClass(kind: GenderKind): string {
  switch (kind) {
    case "M":
    case "MM":
      return "gender-m";
    case "F":
    case "FF":
      return "gender-f";
    case "MF":
      return "gender-mf";
    default:
      return "gender-none";
  }
}

/** 글자/점 색상 클래스 */
export function genderTextClass(kind: GenderKind): string {
  switch (kind) {
    case "M":
    case "MM":
      return "text-gender-m";
    case "F":
    case "FF":
      return "text-gender-f";
    case "MF":
      return "text-gender-mf";
    default:
      return "text-gender-none";
  }
}

/**
 * 대회 화면(상세/대진표 전용)에서 공통으로 쓰는 "참가 단위 ID → 이름 / 성별 종류" 지도를 만듭니다.
 * 참가 단위는 단식이면 유저 ID, 복식이면 팀 ID 입니다.
 */
export function buildEntrantMaps(input: {
  format: "SINGLES" | "DOUBLES";
  participants: { userId: string; user: { nickname: string | null; gender: string | null } }[];
  teams: {
    id: string;
    captain: { nickname: string | null; gender: string | null };
    partner: { nickname: string | null; gender: string | null };
  }[];
}) {
  const nameMap: Record<string, string> = {};
  const kindMap: Record<string, GenderKind> = {};

  if (input.format === "DOUBLES") {
    input.teams.forEach((t) => {
      nameMap[t.id] = `${t.captain.nickname || "익명"} · ${t.partner.nickname || "익명"}`;
      kindMap[t.id] = teamKind(t.captain.gender, t.partner.gender);
    });
  } else {
    input.participants.forEach((p) => {
      nameMap[p.userId] = p.user.nickname || "익명";
      kindMap[p.userId] = singleKind(p.user.gender);
    });
  }
  return { nameMap, kindMap };
}
