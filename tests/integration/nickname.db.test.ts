// 닉네임 중복 방지 — 실제 Postgres 에 모든 마이그레이션을 적용해서 검증하는 통합 테스트
//
// 실행: TEST_DATABASE_URL=postgres://postgres@localhost:5432/postgres npm run test:db
//  - TEST_DATABASE_URL 은 "관리용 접속 주소"입니다. 테스트가 임시 DB(nicktest_xxxx)를 만들고 끝나면 지웁니다.
//  - 값이 없으면 이 파일은 건너뜁니다 (일반 npm test 에는 영향 없음).
import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { Client } from "pg"
import { readdirSync, readFileSync } from "fs"
import path from "path"

const ADMIN_URL = process.env.TEST_DATABASE_URL
const MIGRATIONS = path.resolve(__dirname, "../../prisma/migrations")
const NICK_MIGRATION = "20261007100000_unique_nickname"

const dbName = `nicktest_${Date.now().toString(36)}`
let admin: Client
let db: Client
let dbUrl: string
let seq = 0

function urlFor(name: string) {
  const u = new URL(ADMIN_URL!)
  u.pathname = `/${name}`
  return u.toString()
}

async function applyMigration(client: Client, dir: string) {
  await client.query(readFileSync(path.join(MIGRATIONS, dir, "migration.sql"), "utf8"))
}

/** 유저 한 명 추가 (필수 컬럼만) */
function insertUser(client: Client, nickname: string, opts: { deleted?: boolean; createdAt?: string } = {}) {
  const n = ++seq
  return client.query(
    `INSERT INTO users (id, ci_di, email, nickname, tennis_level, terms_agreed_at, privacy_agreed_at, updated_at, created_at, deleted_at)
     VALUES (gen_random_uuid(), $1, $2, $3, '테린이', now(), now(), now(), COALESCE($4::timestamptz, now()), $5)`,
    [`ci_${n}`, `u${n}@test.dev`, nickname, opts.createdAt ?? null, opts.deleted ? new Date() : null]
  )
}

const nicknames = async (client: Client) =>
  (await client.query(`SELECT nickname FROM users WHERE deleted_at IS NULL ORDER BY created_at, id`)).rows.map((r) => r.nickname as string)

describe.skipIf(!ADMIN_URL)("닉네임 중복 방지 (DB)", () => {
  beforeAll(async () => {
    admin = new Client({ connectionString: ADMIN_URL })
    await admin.connect()
    await admin.query(`CREATE DATABASE ${dbName}`)
    dbUrl = urlFor(dbName)
    db = new Client({ connectionString: dbUrl })
    await db.connect()
    // 닉네임 마이그레이션 "이전"까지만 먼저 적용 → 겹치는 기존 데이터를 만들 수 있음
    const dirs = readdirSync(MIGRATIONS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
    for (const d of dirs.filter((x) => x < NICK_MIGRATION)) await applyMigration(db, d)
  })

  afterAll(async () => {
    await db?.end()
    await admin?.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`)
    await admin?.end()
  })

  it("마이그레이션: 기존 중복(대소문자 포함)을 가입 순서대로 번호를 붙여 정리하고, 탈퇴 회원은 건드리지 않는다", async () => {
    await insertUser(db, "Ace", { createdAt: "2026-01-01" })
    await insertUser(db, "ace", { createdAt: "2026-01-02" })
    await insertUser(db, "ACE", { createdAt: "2026-01-03" })
    await insertUser(db, "ace", { deleted: true, createdAt: "2026-01-04" })

    await applyMigration(db, NICK_MIGRATION)

    expect(await nicknames(db)).toEqual(["Ace", "ace2", "ACE3"]) // 먼저 가입한 사람은 그대로
    const gone = await db.query(`SELECT nickname FROM users WHERE deleted_at IS NOT NULL`)
    expect(gone.rows[0].nickname).toBe("ace")
  })

  it("같은 닉네임은 거부된다", async () => {
    await insertUser(db, "라켓맨")
    await expect(insertUser(db, "라켓맨")).rejects.toMatchObject({ code: "23505" })
  })

  it("대소문자만 다른 닉네임도 거부된다", async () => {
    await insertUser(db, "Smash")
    await expect(insertUser(db, "SMASH")).rejects.toMatchObject({ code: "23505" })
    await expect(insertUser(db, "smash")).rejects.toMatchObject({ code: "23505" })
  })

  it("다른 닉네임은 허용된다", async () => {
    await insertUser(db, "Lob")
    await expect(insertUser(db, "Lob2")).resolves.toBeDefined()
  })

  it("탈퇴한 회원의 닉네임은 다시 쓸 수 있다", async () => {
    await insertUser(db, "떠난사람", { deleted: true })
    await expect(insertUser(db, "떠난사람")).resolves.toBeDefined()
  })

  it("프로필 수정으로 남의 닉네임으로 바꾸는 것도 거부된다 / 내 닉네임 그대로 저장은 허용", async () => {
    await insertUser(db, "원래주인")
    await insertUser(db, "도전자")
    await expect(db.query(`UPDATE users SET nickname='원래주인' WHERE nickname='도전자'`)).rejects.toMatchObject({ code: "23505" })
    await expect(db.query(`UPDATE users SET nickname='도전자' WHERE nickname='도전자'`)).resolves.toBeDefined()
  })

  it("동시 가입: 같은 닉네임으로 10명이 동시에 가입해도 정확히 1명만 성공한다", async () => {
    const clients = await Promise.all(
      Array.from({ length: 10 }, async () => {
        const c = new Client({ connectionString: dbUrl })
        await c.connect()
        return c
      })
    )
    try {
      const results = await Promise.allSettled(clients.map((c) => insertUser(c, "동시가입")))
      const ok = results.filter((r) => r.status === "fulfilled").length
      const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected")
      expect(ok).toBe(1)
      expect(rejected).toHaveLength(9)
      expect(rejected.every((r) => (r.reason as { code?: string }).code === "23505")).toBe(true)
      const { rows } = await db.query(`SELECT count(*)::int AS n FROM users WHERE nickname='동시가입'`)
      expect(rows[0].n).toBe(1)
    } finally {
      await Promise.all(clients.map((c) => c.end()))
    }
  })
})
