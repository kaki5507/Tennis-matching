-- 닉네임 중복 방지 (대소문자 무시, 탈퇴 회원 제외)
-- 주의: Prisma 스키마로 표현할 수 없는 부분 유니크 인덱스라 schema.prisma 에는 없습니다.
--       (앱에서도 isNicknameTaken 으로 먼저 검사하고, 이 인덱스는 동시 가입 같은 경합을 막는 최후 방어선입니다.)

-- 1) 기존 데이터에 이미 겹치는 닉네임이 있으면 인덱스 생성이 실패하므로, 먼저 정리합니다.
--    가장 먼저 가입한 사람은 그대로 두고, 나머지는 뒤에 번호를 붙입니다. (예: 테니스왕 → 테니스왕2)
WITH ranked AS (
  SELECT id,
         nickname,
         ROW_NUMBER() OVER (PARTITION BY lower(nickname) ORDER BY created_at, id) AS rn
  FROM "users"
  WHERE "deleted_at" IS NULL
)
UPDATE "users" u
SET nickname = left(r.nickname, 17) || r.rn::text
FROM ranked r
WHERE u.id = r.id AND r.rn > 1;

-- 2) 정리 후에도 겹칠 수 있는 극히 드문 경우(번호 붙인 이름이 이미 있는 경우)를 위해 한 번 더 id 일부를 붙입니다.
WITH ranked AS (
  SELECT id,
         nickname,
         ROW_NUMBER() OVER (PARTITION BY lower(nickname) ORDER BY created_at, id) AS rn
  FROM "users"
  WHERE "deleted_at" IS NULL
)
UPDATE "users" u
SET nickname = left(r.nickname, 12) || '_' || left(replace(u.id::text, '-', ''), 6)
FROM ranked r
WHERE u.id = r.id AND r.rn > 1;

-- 3) 유니크 인덱스
CREATE UNIQUE INDEX "users_nickname_active_key"
  ON "users" (lower("nickname"))
  WHERE "deleted_at" IS NULL;
