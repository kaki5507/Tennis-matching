-- =============================================================================
--  테니스매칭 더미데이터 (테스트용 INSERT 모음)  -  파일 하나로 실행/초기화 가능
-- =============================================================================
--  기준 스키마 : prisma/migrations (10개, add_maintenance_mode 까지)
--  대상 DB     : 개발/테스트용 Supabase 프로젝트 권장.  운영 DB 에는 실행하지 마세요.
--  실행 방법   : Supabase 대시보드 > SQL Editor 에 이 파일 전체를 붙여넣고 Run
--                또는  psql "$DIRECT_URL" -f prisma/seed/dummy_data.sql
--  재실행      : 몇 번이든 가능. 맨 위에서 "이전 더미데이터"만 지우고 다시 넣습니다.
--                (삭제 대상 = 아래 규칙으로 식별되는 더미 행뿐, 실제 회원/방은 건드리지 않음)
--     더미 식별 규칙: 사용자 이메일이 @seed.tennis.test 로 끝남 / 행 id 가 a~f0000000-0000-4000-8000- 로 시작
--                     방문기록 visitor_id 가 seed- 로 시작 / 작업기록 detail 이 [SEED] 로 시작
--  날짜        : 전부 "오늘(한국 시간)" 기준 상대값이라 언제 실행해도 시나리오가 유지됩니다.
--                (경기 날짜/시간은 한국 시간 그대로 저장되는 앱 규칙을 따름)
--  로그인      : 하단 [4-B] 가 Supabase 로그인 계정(auth.users)을 같이 만듭니다. 비밀번호는 모두  Test1234!
--                (Supabase 가 아닌 일반 Postgres 이거나 auth 스키마가 다르면 그 부분만 건너뛰고 NOTICE 로 알려줍니다)
--
--  ID 규칙 : sid('a', n) 사용자 / sid('c', n) 코트 / sid('b', n) 매칭방 / sid('d', n) 대회 / sid('e', n) 복식팀
--            예) sid('a', 2) = a0000000-0000-4000-8000-000000000002  (김방장)
-- =============================================================================
--
--  ■ 테스트 계정  (이메일 / 비밀번호 Test1234!)
--  ----------------------------------------------------------------------------------------------
--   n  이메일(@seed.tennis.test)  닉네임      종류/특징                                   NTRP(횟수) 매너
--  ----------------------------------------------------------------------------------------------
--   1  admin_kang                 관리자강    관리자(ADMIN). /admin 전체 화면, 점검 모드    4.0 (20)   40.0
--   2  host_kim                   김방장      방 여러 개의 방장. 대시보드/입금확인/완료      3.0 (12)   38.5
--   3  lee_ace                    이에이스    일반 여성. 신청중/수락/완료 상태가 다양        2.5 (5)    36.5
--   4  park_newbie                박테린이    미검증(평가 0회): 레벨 제한 방 참가 불가       -   (0)    36.5
--   5  choi_pro                   최고수      고수. 레벨/매너 제한 방 통과, 우승 이력        4.0 (30)   39.8
--   6  jung_rude                  정비매너    매너 28.0: 매너 기준 있는 방 참가 불가         3.0 (6)    28.0
--   7  han_ladies                 한여복      여성, 여복 팀 / 대회 참가                      3.0 (7)    37.0
--   8  oh_ladies                  오여복      여성, 여복 팀 파트너                           2.5 (4)    36.8
--   9  yoon_mixed                 윤혼복      평가 딱 3회(경계값), 혼복/팀 대기 시나리오     2.5 (3)    36.5
--  10  song_unverified            송임시      본인인증 없이 가입한 계정(관리자 화면 "미인증") 2.0 (0)    36.5
--  11  ban_user                   차단회원    정지된 계정(is_banned): 대부분의 액션 거부     3.0 (8)    30.0
--  12  gone_user                  탈퇴회원    탈퇴(deleted_at): 로그인/조회 거부             -   (0)    36.5
--  13  blank_user                 프로필없음  성별/출생연도 미입력(성별 구분 색 unknown)     -   (0)    36.5
--  14  shin_ace                   신에이스    남성 3.5. 대회/복식 파트너                     3.5 (10)   37.5
--  15  lim_serve                  임서브      여성 3.0                                       3.0 (9)    36.9
--  16  bae_volley                 배발리      남성 3.0. 노쇼 이력(경기 8)                    3.0 (9)    35.0
--  ----------------------------------------------------------------------------------------------
--
--  ■ 매칭방 시나리오  (상세: /matches/<id>)   기준일 b = 오늘(KST)
--  ----------------------------------------------------------------------------------------------
--   b01 OPEN   단식 b+1 19:00  참가자 없음(빈 방)                    - 방장 김방장
--   b02 OPEN   복식 b+2 20:00  PENDING(이에이스) ACCEPTED(최고수, 입금대기) ACCEPTED(한여복, 입금확인)
--                              REJECTED(윤혼복) CANCELED(박테린이) / 참가비 5,000  <- 방장 대시보드 총출동
--   b03 OPEN   복식 b+3 07:00  3/4 거의 참(수락 2 + 대기 1) / 방장 최고수
--   b04 OPEN   단식 b+0 22:00  "오늘" 배지 테스트 (22시 이후 실행하면 지난 방으로 숨겨짐)
--   b05 OPEN   단식 b+4 18:00  레벨 3.0-4.0 + 매너 37.0 이상 <- 박테린이/정비매너/이에이스 거부, 최고수 통과
--   b06 FULL   단식 b+1 10:00  정원 참(목록에서는 안 보임, 상세에서 마감 표시)
--   b07 COMPLETED 단식 b-3     평가 진행중: 방장은 제출 완료, 이에이스는 아직 (평가 화면 두 상태)
--   b08 COMPLETED 복식 b-7     평가 전부 완료 + 노쇼(배발리) 포함
--   b09 CANCELED  단식 b+5     취소된 방
--   b10 OPEN   단식 b-1 19:00  어제 날짜의 OPEN 방(목록에서 숨김 규칙 확인)
--   b11 OPEN   삭제된 방(deleted_at)  -> 404 확인
--   b12 OPEN   랠리(연습) b+6 08:00 서울 코트, 무료, 정원 없음
--   b13 OPEN   혼합복식 b+2 19:30 인천 코트, 연령/성별 제한 문구
--   b101~ 대량  최근 12주 경기(요일/시간대/지역 통계, 인기 시간 추천) + 앞으로 8일 모집중 방
--  ----------------------------------------------------------------------------------------------
--
--  ■ 대회 시나리오 (/tournaments/<id>)
--   d01 RECRUITING 단식  신청 3명 (신청/취소/자격 미달 사유 테스트)
--   d02 CLOSED     단식  8명 신청, 대진표 없음 <- 관리자 "대진표 생성" 테스트
--   d03 ONGOING    단식  8강 대진표 진행중(4강 한 경기 대기)  <- 결과 입력/자동 진출 테스트
--   d04 COMPLETED  단식  종료. 우승 최고수 / 준우승 김방장 / 3위 신에이스 <- 트로피 진열장
--   d05 RECRUITING 복식  확정 팀 2개 + 파트너 수락 대기 팀 1개 <- 팀 수락/평균 NTRP 상한(3.5)
--
--  ■ 그 밖에: 게시판(match_comments) 글, 채팅(MatchChat), 알림(읽음/안읽음 + 30건 페이지 테스트),
--     코트 빈자리 알림 구독, 블랙리스트, 방문 기록(30일), 가입 추이, 관리자 작업 기록 샘플
--  ■ 점검 모드는 건드리지 않습니다. 켜고 끄는 예시는 파일 맨 아래 [9] 주석 참고.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- [0] 도우미 함수 (이 세션에서만 존재하는 임시 함수)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.sid(kind text, n int) RETURNS uuid
LANGUAGE sql IMMUTABLE AS $$ SELECT (kind || '0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $$;

CREATE OR REPLACE FUNCTION pg_temp.today() RETURNS date
LANGUAGE sql STABLE AS $$ SELECT (now() AT TIME ZONE 'Asia/Seoul')::date $$;

-- 한국 시각(벽시계) -> DB 에 저장되는 UTC timestamp (created_at 등 Prisma 가 UTC 로 저장하는 컬럼용)
CREATE OR REPLACE FUNCTION pg_temp.kst(ts timestamp) RETURNS timestamp
LANGUAGE sql IMMUTABLE AS $$ SELECT (ts AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'UTC' $$;

-- ---------------------------------------------------------------------------
-- [1] 이전 더미데이터 삭제 (재실행용)  - 위의 "더미 식별 규칙" 에 맞는 행만 삭제
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  seed_users uuid[] := ARRAY(SELECT id FROM users WHERE email LIKE '%@seed.tennis.test');
  seed_matches uuid[] := ARRAY(
    SELECT id FROM matches WHERE id::text LIKE 'b0000000-0000-4000-8000-%' OR host_id = ANY (SELECT id FROM users WHERE email LIKE '%@seed.tennis.test'));
  seed_tours uuid[] := ARRAY(SELECT id FROM tournaments WHERE id::text LIKE 'd0000000-0000-4000-8000-%');
BEGIN
  DELETE FROM tournament_matches WHERE tournament_id = ANY (seed_tours);
  DELETE FROM tournament_teams WHERE tournament_id = ANY (seed_tours);
  DELETE FROM tournament_participants WHERE tournament_id = ANY (seed_tours) OR user_id = ANY (seed_users);
  DELETE FROM tournaments WHERE id = ANY (seed_tours);

  DELETE FROM evaluations WHERE match_id = ANY (seed_matches) OR evaluator_id = ANY (seed_users) OR evaluatee_id = ANY (seed_users);
  DELETE FROM match_comments WHERE match_id = ANY (seed_matches) OR user_id = ANY (seed_users);
  DELETE FROM "MatchChat" WHERE "matchId" = ANY (seed_matches) OR "userId" = ANY (seed_users);
  DELETE FROM messages WHERE match_id = ANY (seed_matches) OR user_id = ANY (seed_users);
  DELETE FROM match_participants WHERE match_id = ANY (seed_matches) OR user_id = ANY (seed_users);
  DELETE FROM matches WHERE id = ANY (seed_matches);

  DELETE FROM notifications WHERE user_id = ANY (seed_users);
  DELETE FROM device_tokens WHERE user_id = ANY (seed_users);
  DELETE FROM court_watches WHERE user_id = ANY (seed_users);
  DELETE FROM page_views WHERE visitor_id LIKE 'seed-%';
  DELETE FROM admin_audit_logs WHERE detail LIKE '[SEED]%';
  DELETE FROM banned_identities WHERE ci_di LIKE 'seed_ci_%';
  DELETE FROM users WHERE id = ANY (seed_users);
  DELETE FROM courts WHERE id::text LIKE 'c0000000-0000-4000-8000-%';

  -- Supabase 로그인 계정도 같이 정리 (auth 스키마가 없으면 건너뜀)
  IF to_regclass('auth.users') IS NOT NULL THEN
    BEGIN
      DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email LIKE '%@seed.tennis.test');
      DELETE FROM auth.users WHERE email LIKE '%@seed.tennis.test';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '[seed] auth 계정 정리를 건너뜁니다: %', SQLERRM;
    END;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- [2] 테니스장 (courts)  - 지역별 통계(경기 부천시 / 서울 강남구 / 인천 부평구) 확인용
-- ---------------------------------------------------------------------------
INSERT INTO courts (id, name, address, latitude, longitude, has_parking, has_shower, updated_at) VALUES
  (pg_temp.sid('c', 1), '성주산체육공원테니스장', '경기도 부천시 원미구 성주로 100',   37.5029000, 126.7955000, true,  false, now()),
  (pg_temp.sid('c', 2), '종합운동장테니스장',     '경기도 부천시 원미구 길주로 100',   37.5035000, 126.7738000, true,  true,  now()),
  (pg_temp.sid('c', 3), '소사배수지테니스장',     '경기도 부천시 소사구 소사로 200',   37.4818000, 126.7948000, false, false, now()),
  (pg_temp.sid('c', 4), '강남스포츠센터테니스장', '서울특별시 강남구 테헤란로 300',    37.5009000, 127.0396000, true,  true,  now()),
  (pg_temp.sid('c', 5), '부평테니스장',           '인천광역시 부평구 부평대로 400',    37.4894000, 126.7230000, true,  false, now());

-- ---------------------------------------------------------------------------
-- [3] 사용자 (users)  - 16명. 계정 설명은 파일 맨 위 표 참고
--     created_at 을 최근 30일에 분산시켜 가입자 추이 그래프가 채워지도록 함
-- ---------------------------------------------------------------------------
INSERT INTO users (id, ci_di, email, nickname, tennis_level, preferred_pos, manner_score, is_banned,
                   birth_year, gender, ntrp_score, ntrp_count, level_mismatch_count, role,
                   terms_agreed_at, privacy_agreed_at, marketing_agreed_at, created_at, updated_at, deleted_at)
SELECT pg_temp.sid('a', v.n), v.ci, v.handle || '@seed.tennis.test', v.nick, v.level, v.pos::"Position", v.manner, v.banned,
       v.birth, v.gender, v.ntrp, v.cnt, v.mismatch, v.role::"Role",
       now() - (v.days || ' days')::interval, now() - (v.days || ' days')::interval,
       CASE WHEN v.marketing THEN now() - (v.days || ' days')::interval END,
       now() - (v.days || ' days')::interval, now(),
       CASE WHEN v.gone THEN now() - interval '2 days' END
FROM (VALUES
  --  n, handle,          nick,        level,        pos,        manner, banned, birth, gender,   ntrp, cnt, mismatch, role,    days, marketing, gone, ci
  ( 1, 'admin_kang',     '관리자강',   'NTRP 3.5',  'ANY',      40.0, false, 1985, 'MALE',   4.0, 20, 0, 'ADMIN', 60, true,  false, 'seed_ci_01'),
  ( 2, 'host_kim',       '김방장',     'NTRP 3.0',  'FOREHAND', 38.5, false, 1990, 'MALE',   3.0, 12, 0, 'USER',  29, true,  false, 'seed_ci_02'),
  ( 3, 'lee_ace',        '이에이스',   'NTRP 2.5',  'BACKHAND', 36.5, false, 1994, 'FEMALE', 2.5,  5, 0, 'USER',  25, true,  false, 'seed_ci_03'),
  ( 4, 'park_newbie',    '박테린이',   '테린이',    'ANY',      36.5, false, 1998, 'MALE',   NULL, 0, 0, 'USER',  21, false, false, 'seed_ci_04'),
  ( 5, 'choi_pro',       '최고수',     'NTRP 3.5',  'FOREHAND', 39.8, false, 1982, 'MALE',   4.0, 30, 0, 'USER',  45, true,  false, 'seed_ci_05'),
  ( 6, 'jung_rude',      '정비매너',   'NTRP 3.0',  'ANY',      28.0, false, 1991, 'MALE',   3.0,  6, 0, 'USER',  18, false, false, 'seed_ci_06'),
  ( 7, 'han_ladies',     '한여복',     'NTRP 3.0',  'ANY',      37.0, false, 1992, 'FEMALE', 3.0,  7, 0, 'USER',  14, true,  false, 'seed_ci_07'),
  ( 8, 'oh_ladies',      '오여복',     'NTRP 2.5',  'BACKHAND', 36.8, false, 1995, 'FEMALE', 2.5,  4, 0, 'USER',  12, false, false, 'seed_ci_08'),
  ( 9, 'yoon_mixed',     '윤혼복',     'NTRP 2.5',  'ANY',      36.5, false, 1993, 'MALE',   2.5,  3, 0, 'USER',  10, false, false, 'seed_ci_09'),
  (10, 'song_unverified','송임시',     'NTRP 2.0',  'ANY',      36.5, false, 1996, 'MALE',   NULL, 0, 0, 'USER',   7, false, false, 'unverified_' || encode(sha256('song_unverified@seed.tennis.test'::bytea), 'hex')),
  (11, 'ban_user',       '차단회원',   'NTRP 3.0',  'ANY',      30.0, true,  1990, 'MALE',   3.0,  8, 5, 'USER',  40, false, false, 'seed_ci_11'),
  (12, 'gone_user',      '탈퇴회원',   '테린이',    'ANY',      36.5, false, 1999, 'FEMALE', NULL, 0, 0, 'USER',  35, false, true,  'seed_ci_12'),
  (13, 'blank_user',     '프로필없음', '테린이',    'ANY',      36.5, false, NULL, NULL,     NULL, 0, 0, 'USER',   3, false, false, 'seed_ci_13'),
  (14, 'shin_ace',       '신에이스',   'NTRP 3.5',  'FOREHAND', 37.5, false, 1988, 'MALE',   3.5, 10, 0, 'USER',  50, true,  false, 'seed_ci_14'),
  (15, 'lim_serve',      '임서브',     'NTRP 3.0',  'ANY',      36.9, false, 1991, 'FEMALE', 3.0,  9, 0, 'USER',  27, false, false, 'seed_ci_15'),
  (16, 'bae_volley',     '배발리',     'NTRP 3.0',  'BACKHAND', 35.0, false, 1989, 'MALE',   3.0,  9, 0, 'USER',   5, false, false, 'seed_ci_16')
) AS v(n, handle, nick, level, pos, manner, banned, birth, gender, ntrp, cnt, mismatch, role, days, marketing, gone, ci);

-- 재가입 차단(블랙리스트) 테스트: 이 식별값으로는 가입 불가. (차단회원 본인 식별값 + 이미 탈퇴한 정지 회원 가정)
INSERT INTO banned_identities (id, ci_di, reason, banned_at) VALUES
  (gen_random_uuid(), 'seed_ci_11',          '비매너 신고 누적(더미)',     now() - interval '10 days'),
  (gen_random_uuid(), 'seed_ci_blacklisted', '허위 구력 반복 적발(더미)',  now() - interval '20 days');

-- ---------------------------------------------------------------------------
-- [4-B] Supabase 로그인 계정 (auth.users / auth.identities)  - 비밀번호 Test1234!
--       앱 사용자 id 와 auth 계정 id 가 같아야 로그인 후 프로필이 연결됩니다.
--       실패해도 나머지 더미데이터는 정상 입력됩니다(NOTICE 만 출력).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('auth.users') IS NULL THEN
    RAISE NOTICE '[seed] auth.users 가 없어 로그인 계정 생성은 건너뜁니다. (Supabase 가 아니면 정상)';
    RETURN;
  END IF;
  PERFORM set_config('search_path', 'public, extensions, auth, pg_temp', true);
  BEGIN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, email_change, email_change_token_new, recovery_token)
    SELECT '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
           crypt('Test1234!', gen_salt('bf')), now(),
           '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''
    FROM public.users u
    WHERE u.email LIKE '%@seed.tennis.test' AND u.deleted_at IS NULL;

    INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    SELECT gen_random_uuid(), u.id, u.id::text,
           jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
           'email', now(), now(), now()
    FROM public.users u
    WHERE u.email LIKE '%@seed.tennis.test' AND u.deleted_at IS NULL;
    RAISE NOTICE '[seed] 로그인 계정 생성 완료 (비밀번호 Test1234!)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[seed] auth 계정 생성 실패(더미 로그인 불가, 나머지 데이터는 정상): %', SQLERRM;
  END;
END $$;

-- ---------------------------------------------------------------------------
-- [5] 매칭방 (matches)  - 시나리오별 개별 방
-- ---------------------------------------------------------------------------
INSERT INTO matches (id, host_id, court_id, match_date, start_time, target_level, status, game_type,
                     gender_requirement, age_requirement, cost_per_person, description, min_manner_score,
                     created_at, updated_at, deleted_at)
SELECT pg_temp.sid('b', m.n), pg_temp.sid('a', m.host), pg_temp.sid('c', m.court),
       pg_temp.today() + m.day_off, m.t::time, m.level, m.status::"MatchStatus", m.gtype,
       m.gender, m.age, m.cost, m.descr, m.minmanner,
       now() - (m.created_days || ' days')::interval, now(),
       CASE WHEN m.deleted THEN now() - interval '1 day' END
FROM (VALUES
  --  n, host, court, day_off, time,   level,     status,      game_type,    gender,     age,        cost, description, minmanner, created_days, deleted
  ( 1,  2, 1,  1, '19:00', '누구나',   'OPEN',      '단식',       '제한없음', '제한없음',    0, '가볍게 랠리 위주로 단식 한 게임 해요. 초보 환영!', NULL, 1, false),
  ( 2,  2, 2,  2, '20:00', '2.5-3.5', 'OPEN',      '복식',       '제한없음', '제한없음', 5000, '코트 대여비 N빵입니다. 입금 확인 후 참가 확정이에요. 공 가져오세요.', NULL, 2, false),
  ( 3,  5, 1,  3, '07:00', '누구나',   'OPEN',      '복식',       '제한없음', '제한없음', 8000, '이른 아침 복식입니다. 한 자리 남았어요.', NULL, 2, false),
  ( 4,  2, 3,  0, '22:00', '누구나',   'OPEN',      '단식',       '제한없음', '제한없음',    0, '오늘 밤 야간 단식! 불 켜지는 코트예요.', NULL, 0, false),
  ( 5,  5, 1,  4, '18:00', '3.0-4.0', 'OPEN',      '단식',       '제한없음', '제한없음', 3000, '레벨 3.0 이상, 매너 37도 이상만 신청해주세요. 진지하게 한 게임.', 37.0, 3, false),
  ( 6,  2, 2,  1, '10:00', '누구나',   'FULL',      '단식',       '제한없음', '제한없음',    0, '마감된 방입니다. (정원 참)', NULL, 3, false),
  ( 7,  2, 1, -3, '19:00', '누구나',   'COMPLETED', '단식',       '제한없음', '제한없음', 4000, '지난 경기: 평가 진행중 시나리오.', NULL, 8, false),
  ( 8,  5, 2, -7, '20:00', '2.5-4.0', 'COMPLETED', '복식',       '제한없음', '제한없음', 6000, '지난 복식: 평가 완료 + 노쇼 발생 시나리오.', NULL, 12, false),
  ( 9,  2, 1,  5, '19:00', '누구나',   'CANCELED',  '단식',       '제한없음', '제한없음',    0, '[취소] 우천 예보로 취소합니다.', NULL, 4, false),
  (10,  2, 3, -1, '19:00', '누구나',   'OPEN',      '단식',       '제한없음', '제한없음',    0, '어제 날짜인데 아직 OPEN 상태로 남은 방 (목록에서는 숨겨져야 함).', NULL, 5, false),
  (11,  2, 1,  2, '19:00', '누구나',   'OPEN',      '단식',       '제한없음', '제한없음',    0, '삭제된 방 (상세 접근 시 404).', NULL, 5, true),
  (12, 14, 4,  6, '08:00', '누구나',   'OPEN',      '랠리(연습)', '제한없음', '제한없음',    0, '서울 강남 코트에서 아침 랠리. 무료, 정원 없음.', NULL, 1, false),
  (13, 15, 5,  2, '19:30', '2.0-3.5', 'OPEN',      '혼합복식',   '제한없음', '30대 이상',  7000, '인천 부평 혼합복식. 남녀 1:1로 모집합니다.', 35.0, 1, false)
) AS m(n, host, court, day_off, t, level, status, gtype, gender, age, cost, descr, minmanner, created_days, deleted);

-- ---------------------------------------------------------------------------
-- [6] 참가자 (match_participants)  - 신청중/수락/거절/자진취소/노쇼/입금 상태
-- ---------------------------------------------------------------------------
INSERT INTO match_participants (id, match_id, user_id, team, status, payment_confirmed, payment_confirmed_at, created_at, updated_at)
SELECT gen_random_uuid(), pg_temp.sid('b', p.m), pg_temp.sid('a', p.u), p.team::"Team", p.status::"ParticipantStatus",
       p.paid, CASE WHEN p.paid THEN now() - interval '1 day' END,
       now() - (p.days || ' days')::interval, now()
FROM (VALUES
  -- b02 복식(5,000원): 대기/수락(입금대기)/수락(입금확인)/거절/자진취소
  ( 2,  3, NULL, 'PENDING',  false, 1),
  ( 2,  5, 'A',  'ACCEPTED', false, 2),
  ( 2,  7, 'B',  'ACCEPTED', true,  2),
  ( 2,  9, NULL, 'REJECTED', false, 1),
  ( 2,  4, NULL, 'CANCELED', false, 1),
  -- b03 복식(8,000원) 3/4: 수락 2 + 대기 1
  ( 3,  3, 'A',  'ACCEPTED', true,  2),
  ( 3,  7, 'B',  'ACCEPTED', false, 2),
  ( 3,  8, NULL, 'PENDING',  false, 0),
  -- b05 레벨/매너 제한 방: 신청자 없음 (거부 테스트용으로 비워둠)
  -- b06 마감방
  ( 6,  3, NULL, 'ACCEPTED', false, 3),
  -- b07 완료(평가 진행중)
  ( 7,  3, NULL, 'ACCEPTED', true,  8),
  -- b08 완료 복식 + 노쇼
  ( 8,  2, 'A',  'ACCEPTED', true, 12),
  ( 8, 14, 'B',  'ACCEPTED', true, 12),
  ( 8, 16, 'B',  'NO_SHOW',  false, 12),
  -- b09 취소방에 남은 신청
  ( 9,  3, NULL, 'PENDING',  false, 3),
  -- b13 혼복
  (13,  3, NULL, 'PENDING',  false, 0),
  (13, 14, NULL, 'ACCEPTED', false, 0)
) AS p(m, u, team, status, paid, days);

-- ---------------------------------------------------------------------------
-- [7] 동료 평가 (evaluations)
-- ---------------------------------------------------------------------------
INSERT INTO evaluations (id, match_id, evaluator_id, evaluatee_id, manner_rating, ntrp_rating, win_loss, is_noshow, created_at, updated_at)
SELECT gen_random_uuid(), pg_temp.sid('b', e.m), pg_temp.sid('a', e.evaluator), pg_temp.sid('a', e.evaluatee),
       e.manner, e.ntrp, e.wl::"WinLoss", e.noshow, now() - (e.days || ' days')::interval, now()
FROM (VALUES
  -- b07: 방장(2)만 이에이스(3)를 평가함 -> 이에이스는 아직 평가 전
  ( 7,  2,  3, 5, 2.5, 'WIN',  false, 3),
  -- b08: 방장 최고수(5), 김방장(2), 신에이스(14) 서로 평가 + 배발리(16) 노쇼
  ( 8,  5,  2, 5, 3.0, 'WIN',  false, 6),
  ( 8,  5, 14, 4, 3.5, 'WIN',  false, 6),
  ( 8,  2,  5, 5, 4.0, 'LOSS', false, 6),
  ( 8,  2, 14, 4, 3.5, 'LOSS', false, 6),
  ( 8, 14,  5, 5, 4.0, 'LOSS', false, 6),
  ( 8, 14,  2, 4, 3.0, 'LOSS', false, 6),
  ( 8,  5, 16, 1, 3.0, NULL,   true,  6),
  ( 8,  2, 16, 1, 3.0, NULL,   true,  6)
) AS e(m, evaluator, evaluatee, manner, ntrp, wl, noshow, days);

-- ---------------------------------------------------------------------------
-- [8] 게시판 글(방 Q&A 댓글, match_comments) + 수락자 채팅(MatchChat)
-- ---------------------------------------------------------------------------
INSERT INTO match_comments (id, match_id, user_id, content, created_at)
SELECT gen_random_uuid(), pg_temp.sid('b', c.m), pg_temp.sid('a', c.u), c.content, now() - (c.mins || ' minutes')::interval
FROM (VALUES
  ( 2,  3, '공은 제가 가져가면 될까요? 라켓 대여는 안 되죠?',                 600),
  ( 2,  2, '공은 새 공으로 제가 준비합니다. 라켓은 각자 챙겨오세요!',         580),
  ( 2,  4, '초보인데 참여해도 괜찮을까요 ㅠㅠ',                               300),
  ( 2,  2, '이번 방은 2.5 이상만 받고 있어요. 다음 방에 꼭 오세요!',           280),
  ( 5,  6, '레벨은 3.0인데 매너 기준이 높네요... 신청 가능한가요?',          120),
  ( 5,  5, '매너 온도 37도 이상만 가능해요. 시스템에서 자동으로 막힙니다.',   100),
  ( 3,  8, '주차 가능한가요?',                                                60),
  ( 3,  5, '네, 코트 앞 주차장 무료입니다.',                                   45),
  (12, 13, '프로필이 비어 있어도 참여할 수 있나요?',                           30),
  (13,  9, '혼합복식인데 파트너 없이 혼자 가도 되나요?',                       20),
  ( 7,  3, '수고하셨습니다! 평가 남겨주세요 :)',                              4000),
  ( 7,  2, '다들 수고하셨어요. 다음에 또 해요.',                              3990)
) AS c(m, u, content, mins);

-- 수락된 사람(방장 포함)끼리의 채팅. b02: 방장(2) + 수락자(5, 7)
INSERT INTO "MatchChat" (id, "matchId", "userId", message, "createdAt")
SELECT gen_random_uuid(), pg_temp.sid('b', c.m), pg_temp.sid('a', c.u), c.msg, now() - (c.mins || ' minutes')::interval
FROM (VALUES
  (2, 2, '확정된 분들 안녕하세요! 코트 번호는 당일 알려드릴게요.',   200),
  (2, 5, '넵 확인했습니다. 20분 전에 도착할게요.',                   190),
  (2, 7, '입금 완료했어요. 계좌 확인 부탁드려요!',                   170),
  (2, 2, '입금 확인했습니다. 감사합니다!',                           160),
  (8, 5, '다들 고생하셨습니다. 평가 남겨주세요.',                   9000),
  (3, 5, '아침 7시 정각 시작이라 6시 50분까지 모여주세요.',          400)
) AS c(m, u, msg, mins);

-- ---------------------------------------------------------------------------
-- [9-A] 알림 (notifications) - 읽음/안읽음 + 30건(이전 알림 더 보기 테스트)
-- ---------------------------------------------------------------------------
INSERT INTO notifications (id, user_id, title, body, url, is_read, created_at)
SELECT gen_random_uuid(), pg_temp.sid('a', n.u), n.title, n.body, n.url, n.is_read, now() - (n.mins || ' minutes')::interval
FROM (VALUES
  (2, '새 참여 신청이 들어왔어요',  '이에이스님이 복식 매칭에 참여를 신청했어요.',        '/matches/' || pg_temp.sid('b', 2), false,   30),
  (2, '입금 대기 중인 참가자가 있어요', '최고수님의 참가비 입금을 확인해 주세요.',         '/matches/' || pg_temp.sid('b', 2), false,  120),
  (3, '매칭이 수락됐어요! 🎾',       '신청하신 매칭에 참여가 확정됐습니다.',               '/matches/' || pg_temp.sid('b', 3), false,   90),
  (3, '💰 입금이 확인됐어요',        '8,000원 참가비 입금이 방장에 의해 확인되었습니다.',  '/matches/' || pg_temp.sid('b', 3), true,   600),
  (3, '동료 평가를 남겨주세요',      '지난 경기의 동료 평가를 작성하면 실력 점수에 반영돼요.', '/matches/' || pg_temp.sid('b', 7), false, 3000),
  (4, '매칭 신청 결과 안내',         '아쉽게도 이번 매칭엔 참여가 어렵게 됐어요. 다른 매칭을 찾아보세요.', '/matches', true, 1500),
  (5, '매칭이 수락됐어요! 🎾',       '신청하신 매칭에 참여가 확정됐습니다.',               '/matches/' || pg_temp.sid('b', 2), true,  2400),
  (6, '🎾 구력 정보가 자동 조정되었어요', '동료 평가 결과 실제 실력이 신고하신 구력보다 높게 나타나 NTRP 3.0 으로 자동 조정되었습니다.', '/mypage', false, 4000),
  (11, '⚠️ 계정이 정지되었습니다',   '반복적으로 신고 구력과 실제 평가가 크게 달라 이용이 제한되었습니다.', '/mypage', false, 5000),
  (1, '새 가입자가 있어요',          '오늘 새로 가입한 회원이 3명입니다.',                 '/admin', false, 200)
) AS n(u, title, body, url, is_read, mins);

INSERT INTO notifications (id, user_id, title, body, url, is_read, created_at)
SELECT gen_random_uuid(), pg_temp.sid('a', 2), '알림 페이지 테스트 #' || g, '이전 알림 더 보기(페이지네이션) 확인용 더미 알림입니다.',
       '/matches', g > 8, now() - ((g * 45 + 300) || ' minutes')::interval
FROM generate_series(1, 30) AS g;

-- 코트 빈자리 알림 구독 (부천 공공예약 facility_id: 116 성주산, 193 남부수자원)
INSERT INTO court_watches (id, user_id, facility_id, facility_name, created_at) VALUES
  (gen_random_uuid(), pg_temp.sid('a', 3), '116', '성주산체육공원테니스장', now() - interval '3 days'),
  (gen_random_uuid(), pg_temp.sid('a', 3), '193', '남부수자원테니스장',     now() - interval '2 days'),
  (gen_random_uuid(), pg_temp.sid('a', 5), '116', '성주산체육공원테니스장', now() - interval '1 day');

-- 푸시 토큰(실제 FCM 토큰이 아닌 자리표시자: 푸시 "발송 대상 존재" 경로 테스트용)
INSERT INTO device_tokens (id, user_id, token, created_at, updated_at) VALUES
  (gen_random_uuid(), pg_temp.sid('a', 3), 'seed-fake-fcm-token-lee-ace', now(), now());

-- ---------------------------------------------------------------------------
-- [10] 대회 (tournaments / participants / teams / bracket)
-- ---------------------------------------------------------------------------
INSERT INTO tournaments (id, title, description, court_id, start_date, registration_deadline, min_ntrp, max_ntrp,
                         min_manner_score, max_participants, format, max_team_avg_ntrp, status, created_by,
                         champion_id, runner_up_id, third_place_id, created_at)
SELECT pg_temp.sid('d', t.n), t.title, t.descr, pg_temp.sid('c', t.court), pg_temp.today() + t.start_off,
       now() + (t.deadline_h || ' hours')::interval, t.minn, t.maxn, t.minm, t.maxp, t.fmt::"TournamentFormat", t.teamavg,
       t.status::"TournamentStatus", pg_temp.sid('a', 1),
       CASE WHEN t.champ IS NULL THEN NULL ELSE pg_temp.sid('a', t.champ) END,
       CASE WHEN t.runner IS NULL THEN NULL ELSE pg_temp.sid('a', t.runner) END,
       CASE WHEN t.third IS NULL THEN NULL ELSE pg_temp.sid('a', t.third) END,
       now() - (t.created_days || ' days')::interval
FROM (VALUES
  --  n, title,                          descr,                                  court, start_off, deadline_h, minn, maxn, minm, maxp, fmt,      teamavg, status,       champ, runner, third, created_days
  (1, '[더미] 가을 오픈 단식 (모집중)',    '신청/취소/자격 검사 테스트용. NTRP 2.0~4.0, 매너 30도 이상', 1, 14,  240, 2.0, 4.0, 30.0,  8, 'SINGLES', NULL, 'RECRUITING', NULL, NULL, NULL,  3),
  (2, '[더미] 주말 단식 챔피언십 (마감)',  '모집이 끝나 대진표 생성을 기다리는 대회',               2,  3, -24, 2.0, 4.0, 30.0,  8, 'SINGLES', NULL, 'CLOSED',     NULL, NULL, NULL,  9),
  (3, '[더미] 부천 단식 리그 (진행중)',    '8강 진행중. 결과 입력/자동 진출 테스트',                1,  0, -72, 2.0, 4.0, 30.0,  8, 'SINGLES', NULL, 'ONGOING',    NULL, NULL, NULL, 14),
  (4, '[더미] 여름 단식 컵 (종료)',        '종료된 대회. 우승 최고수 / 준우승 김방장 / 3위 신에이스',  2, -10, -400, 2.0, 4.0, 30.0,  4, 'SINGLES', NULL, 'COMPLETED',   5, 2, 14, 30),
  (5, '[더미] 가을 오픈 복식 (모집중)',    '복식: 두 선수 평균 NTRP 3.5 이하. 팀 신청/파트너 수락 테스트', 3, 21, 336, 2.0, 4.0, 30.0, 8, 'DOUBLES', 3.5,  'RECRUITING', NULL, NULL, NULL,  2)
) AS t(n, title, descr, court, start_off, deadline_h, minn, maxn, minm, maxp, fmt, teamavg, status, champ, runner, third, created_days);

-- 단식 신청자 (d01: 3명 / d02, d03: 8명 / d04: 4명) + 복식 확정 팀 선수 (d05)
INSERT INTO tournament_participants (id, tournament_id, user_id, registered_at)
SELECT gen_random_uuid(), pg_temp.sid('d', p.t), pg_temp.sid('a', p.u), now() - (p.days || ' days')::interval
FROM (VALUES
  (1, 2, 2), (1, 3, 1), (1, 5, 1),
  (2, 5, 8), (2, 14, 8), (2, 2, 7), (2, 7, 7), (2, 16, 6), (2, 3, 6), (2, 8, 5), (2, 9, 5),
  (3, 5, 12), (3, 14, 12), (3, 2, 11), (3, 7, 11), (3, 16, 10), (3, 3, 10), (3, 8, 9), (3, 9, 9),
  (4, 5, 28), (4, 2, 28), (4, 14, 27), (4, 3, 27),
  (5, 2, 1), (5, 14, 1), (5, 7, 1), (5, 8, 1)
) AS p(t, u, days);

-- 복식 팀: 확정 2팀(김방장+신에이스, 한여복+오여복) + 수락 대기 1팀(이에이스 -> 윤혼복)
INSERT INTO tournament_teams (id, tournament_id, captain_id, partner_id, status, created_at) VALUES
  (pg_temp.sid('e', 1), pg_temp.sid('d', 5), pg_temp.sid('a', 2), pg_temp.sid('a', 14), 'CONFIRMED', now() - interval '1 day'),
  (pg_temp.sid('e', 2), pg_temp.sid('d', 5), pg_temp.sid('a', 7), pg_temp.sid('a', 8),  'CONFIRMED', now() - interval '1 day'),
  (pg_temp.sid('e', 3), pg_temp.sid('d', 5), pg_temp.sid('a', 3), pg_temp.sid('a', 9),  'PENDING',   now() - interval '3 hours');

-- 대진표 d03 (진행중, 8명). 시드 순서 = 최고수(5) 신에이스(14) 김방장(2) 한여복(7) 배발리(16) 이에이스(3) 오여복(8) 윤혼복(9)
--   1라운드: (1v8) 5-9, (4v5) 7-16, (2v7) 14-8, (3v6) 2-3 / 4강: 5v16 완료, 14v2 대기 / 결승, 3·4위전 대기
INSERT INTO tournament_matches (id, tournament_id, round, position, player1_id, player2_id, winner_id, score, is_bye, is_third_place, updated_at) VALUES
  (pg_temp.sid('f', 1), pg_temp.sid('d', 3), 1, 0, pg_temp.sid('a', 5),  pg_temp.sid('a', 9),  pg_temp.sid('a', 5),  '6-2 6-1',     false, false, now()),
  (pg_temp.sid('f', 2), pg_temp.sid('d', 3), 1, 1, pg_temp.sid('a', 7),  pg_temp.sid('a', 16), pg_temp.sid('a', 16), '4-6 6-4 6-3', false, false, now()),
  (pg_temp.sid('f', 3), pg_temp.sid('d', 3), 1, 2, pg_temp.sid('a', 14), pg_temp.sid('a', 8),  pg_temp.sid('a', 14), '6-3 6-4',     false, false, now()),
  (pg_temp.sid('f', 4), pg_temp.sid('d', 3), 1, 3, pg_temp.sid('a', 2),  pg_temp.sid('a', 3),  pg_temp.sid('a', 2),  '7-5 6-3',     false, false, now()),
  (pg_temp.sid('f', 5), pg_temp.sid('d', 3), 2, 0, pg_temp.sid('a', 5),  pg_temp.sid('a', 16), pg_temp.sid('a', 5),  '6-4 6-4',     false, false, now()),
  (pg_temp.sid('f', 6), pg_temp.sid('d', 3), 2, 1, pg_temp.sid('a', 14), pg_temp.sid('a', 2),  NULL,                  NULL,          false, false, now()),
  (pg_temp.sid('f', 7), pg_temp.sid('d', 3), 3, 0, pg_temp.sid('a', 5),  NULL,                 NULL,                  NULL,          false, false, now()),
  (pg_temp.sid('f', 8), pg_temp.sid('d', 3), 3, 0, pg_temp.sid('a', 16), NULL,                 NULL,                  NULL,          false, true,  now());

-- 대진표 d04 (종료, 4명): 최고수(5) 우승 / 김방장(2) 준우승 / 신에이스(14) 3위
INSERT INTO tournament_matches (id, tournament_id, round, position, player1_id, player2_id, winner_id, score, is_bye, is_third_place, updated_at) VALUES
  (pg_temp.sid('f', 11), pg_temp.sid('d', 4), 1, 0, pg_temp.sid('a', 5),  pg_temp.sid('a', 3),  pg_temp.sid('a', 5),  '6-1 6-0',     false, false, now()),
  (pg_temp.sid('f', 12), pg_temp.sid('d', 4), 1, 1, pg_temp.sid('a', 2),  pg_temp.sid('a', 14), pg_temp.sid('a', 2),  '7-6 6-4',     false, false, now()),
  (pg_temp.sid('f', 13), pg_temp.sid('d', 4), 2, 0, pg_temp.sid('a', 5),  pg_temp.sid('a', 2),  pg_temp.sid('a', 5),  '6-3 7-6',     false, false, now()),
  (pg_temp.sid('f', 14), pg_temp.sid('d', 4), 2, 0, pg_temp.sid('a', 3),  pg_temp.sid('a', 14), pg_temp.sid('a', 14), '2-6 4-6',     false, true,  now());

-- ---------------------------------------------------------------------------
-- [11] 대량 데이터 - 관리자 통계 화면(요일·시간대 히트맵, 지역·코트 추이, 인기 시간 추천)용
-- ---------------------------------------------------------------------------
-- 11-A. 최근 12주 경기 36개: 토요일 19시가 가장 많고, 일요일 10시/수요일 20시가 다음
INSERT INTO matches (id, host_id, court_id, match_date, start_time, target_level, status, game_type,
                     gender_requirement, age_requirement, cost_per_person, description, created_at, updated_at)
SELECT pg_temp.sid('b', 100 + i),
       pg_temp.sid('a', (ARRAY[2, 3, 5, 7, 14, 15, 16, 9])[1 + i % 8]),
       pg_temp.sid('c', (ARRAY[1, 1, 2, 3, 4, 5, 1, 2])[1 + i % 8]),
       d.match_date,
       (CASE i % 4 WHEN 1 THEN '10:00' WHEN 2 THEN '20:00' ELSE '19:00' END)::time,
       '누구나',
       CASE WHEN d.match_date < pg_temp.today() THEN 'COMPLETED' ELSE 'OPEN' END::"MatchStatus",
       (ARRAY['단식', '복식', '혼합복식', '랠리(연습)'])[1 + i % 4],
       '제한없음', '제한없음', (i % 3) * 2000,
       '[SEED-BULK] 통계용 더미 경기 #' || i,
       now() - ((i % 12) * 7 + 3 || ' days')::interval, now()
FROM generate_series(1, 36) AS i
CROSS JOIN LATERAL (
  SELECT (date_trunc('week', pg_temp.today())::date - ((i % 12) * 7)
          + (CASE i % 4 WHEN 0 THEN 5 WHEN 1 THEN 6 WHEN 2 THEN 2 ELSE 5 END))::date AS match_date
) AS d;

-- 11-B. 앞으로 8일간 모집중 방 8개 (목록 화면 채우기: 단식/복식/혼복/랠리 섞임)
INSERT INTO matches (id, host_id, court_id, match_date, start_time, target_level, status, game_type,
                     gender_requirement, age_requirement, cost_per_person, description, created_at, updated_at)
SELECT pg_temp.sid('b', 200 + i),
       pg_temp.sid('a', (ARRAY[2, 3, 5, 7, 14, 15, 16, 9])[1 + i % 8]),
       pg_temp.sid('c', (ARRAY[1, 2, 3, 1, 4, 5, 2, 1])[1 + i % 8]),
       pg_temp.today() + i,
       (ARRAY['07:00', '09:30', '12:00', '15:00', '18:00', '19:00', '20:30', '21:00'])[1 + i % 8]::time,
       (ARRAY['누구나', '2.0-3.0', '2.5-3.5', '3.0-4.0'])[1 + i % 4],
       'OPEN'::"MatchStatus",
       (ARRAY['단식', '복식', '혼합복식', '랠리(연습)'])[1 + i % 4],
       '제한없음', '제한없음', (i % 4) * 1500,
       '[SEED-BULK] 앞으로 열리는 더미 방 #' || i,
       now() - (i || ' hours')::interval, now()
FROM generate_series(1, 8) AS i;

-- 11-C. 대량 경기에 수락 참가자 1명씩 (방장과 다른 사람)
INSERT INTO match_participants (id, match_id, user_id, status, created_at, updated_at)
SELECT gen_random_uuid(), m.id,
       pg_temp.sid('a', (ARRAY[2, 3, 5, 7, 14, 15, 16, 9])[1 + ((n.idx + 1) % 8)]),
       'ACCEPTED'::"ParticipantStatus", now(), now()
FROM matches m
CROSS JOIN LATERAL (SELECT (right(m.id::text, 12))::int % 100 + (right(m.id::text, 12))::int / 100 AS idx) AS n
WHERE m.description LIKE '[SEED-BULK]%'
  AND pg_temp.sid('a', (ARRAY[2, 3, 5, 7, 14, 15, 16, 9])[1 + ((n.idx + 1) % 8)]) <> m.host_id;

-- 11-D. 방문 기록 30일 (일별 방문자/시간대/기기/경로 분포). 방문자 ID 는 seed-visitor-N 으로 재방문 포함
INSERT INTO page_views (id, path, device, "userId", visitor_id, created_at)
SELECT gen_random_uuid(),
       (ARRAY['/', '/matches', '/tournaments', '/history', '/matches/create', '/mypage', '/notifications'])[1 + (v + p) % 7],
       CASE WHEN v % 3 = 0 THEN 'desktop' ELSE 'mobile' END,
       CASE WHEN v % 5 = 0 THEN pg_temp.sid('a', 2 + (v % 6)) END,
       'seed-visitor-' || ((v + d * 3) % 45),
       pg_temp.kst((pg_temp.today() - d)::timestamp
                   + ((ARRAY[8, 9, 12, 13, 18, 19, 20, 21, 22, 23, 10, 11])[1 + (v * p) % 12] || ' hours')::interval
                   + ((v * 7 + p * 13) % 60 || ' minutes')::interval)
FROM generate_series(0, 29) AS d
CROSS JOIN LATERAL generate_series(1, 10 + (d * 5) % 25) AS v
CROSS JOIN generate_series(1, 3) AS p;

-- 11-E. 관리자 작업 기록 샘플 (모든 액션 종류 1건 이상, detail 이 [SEED] 로 시작)
INSERT INTO admin_audit_logs (id, admin_id, admin_nickname, action, target_type, target_id, target_label, detail, created_at)
SELECT gen_random_uuid(), pg_temp.sid('a', 1), '관리자강', a.action, a.ttype, a.tid, a.tlabel, '[SEED] ' || a.detail,
       now() - (a.mins || ' minutes')::interval
FROM (VALUES
  ('USER_BAN',           'user',       pg_temp.sid('a', 11)::text, '차단회원',                      '비매너 신고 누적',          7200),
  ('USER_UNBAN',         'user',       pg_temp.sid('a', 6)::text,  '정비매너',                      '오해 소명으로 해제',        6000),
  ('USER_VIEW',          'user',       pg_temp.sid('a', 3)::text,  '이에이스',                      '회원 상세 조회',            5000),
  ('USER_SEARCH',        NULL,         NULL,                       NULL,                            '검색어: 김',                4800),
  ('USER_EXPORT',        NULL,         NULL,                       NULL,                            '전체 회원 15명 내보냄',     4000),
  ('TOURNAMENT_CREATE',  'tournament', pg_temp.sid('d', 1)::text,  '[더미] 가을 오픈 단식 (모집중)', '대회 개설',                3000),
  ('TOURNAMENT_STATUS',  'tournament', pg_temp.sid('d', 2)::text,  '[더미] 주말 단식 챔피언십 (마감)', '모집중 -> 모집마감',      2500),
  ('BRACKET_GENERATE',   'tournament', pg_temp.sid('d', 3)::text,  '[더미] 부천 단식 리그 (진행중)', '8명 대진표 생성',          2000),
  ('MATCH_RESULT',       'tournament', pg_temp.sid('d', 3)::text,  '[더미] 부천 단식 리그 (진행중)', '1라운드 결과 입력',        1500),
  ('BRACKET_RESET',      'tournament', pg_temp.sid('d', 4)::text,  '[더미] 여름 단식 컵 (종료)',     '입력 오류로 초기화 후 재입력', 1000),
  ('TOURNAMENT_RESULT',  'tournament', pg_temp.sid('d', 4)::text,  '[더미] 여름 단식 컵 (종료)',     '우승 최고수 / 준우승 김방장 / 3위 신에이스', 900),
  ('MAINTENANCE_ON',     NULL,         NULL,                       NULL,                            '문구: 서버 점검 (예시)',     600),
  ('MAINTENANCE_UPDATE', NULL,         NULL,                       NULL,                            '문구 수정 (예시)',           590),
  ('MAINTENANCE_OFF',    NULL,         NULL,                       NULL,                            '점검 종료 (예시)',           560)
) AS a(action, ttype, tid, tlabel, detail, mins);

-- ---------------------------------------------------------------------------
-- [12] 확인용 요약 (실행 결과 마지막 표로 보입니다)
-- ---------------------------------------------------------------------------
SELECT '사용자'       AS 항목, count(*) AS 개수 FROM users WHERE email LIKE '%@seed.tennis.test'
UNION ALL SELECT '코트',            count(*) FROM courts WHERE id::text LIKE 'c0000000-%'
UNION ALL SELECT '매칭방(전체)',    count(*) FROM matches WHERE id::text LIKE 'b0000000-%'
UNION ALL SELECT '매칭방(시나리오)', count(*) FROM matches WHERE id::text LIKE 'b0000000-%' AND description NOT LIKE '[SEED-BULK]%'
UNION ALL SELECT '참가자',          count(*) FROM match_participants mp JOIN matches m ON m.id = mp.match_id WHERE m.id::text LIKE 'b0000000-%'
UNION ALL SELECT '평가',            count(*) FROM evaluations WHERE match_id::text LIKE 'b0000000-%'
UNION ALL SELECT '댓글(게시판)',    count(*) FROM match_comments WHERE match_id::text LIKE 'b0000000-%'
UNION ALL SELECT '채팅',            count(*) FROM "MatchChat" WHERE "matchId"::text LIKE 'b0000000-%'
UNION ALL SELECT '알림',            count(*) FROM notifications WHERE user_id::text LIKE 'a0000000-%'
UNION ALL SELECT '대회',            count(*) FROM tournaments WHERE id::text LIKE 'd0000000-%'
UNION ALL SELECT '대진표 경기',     count(*) FROM tournament_matches WHERE tournament_id::text LIKE 'd0000000-%'
UNION ALL SELECT '방문기록',        count(*) FROM page_views WHERE visitor_id LIKE 'seed-%'
UNION ALL SELECT '작업기록',        count(*) FROM admin_audit_logs WHERE detail LIKE '[SEED]%';

COMMIT;

-- =============================================================================
-- [참고 A] 점검 모드 켜고 끄기 (필요할 때 따로 실행)
-- =============================================================================
-- 켜기:
--   INSERT INTO maintenance_settings (id, enabled, message, ends_at, updated_at)
--   VALUES (1, true, '서버 점검 중입니다. 오후 3시에 다시 만나요!', now() + interval '2 hours', now())
--   ON CONFLICT (id) DO UPDATE SET enabled = true, message = EXCLUDED.message, ends_at = EXCLUDED.ends_at, updated_at = now();
-- 끄기:
--   UPDATE maintenance_settings SET enabled = false, updated_at = now() WHERE id = 1;
-- (앱은 최대 30초 캐시를 쓰므로 반영에 시간이 조금 걸릴 수 있습니다. 관리자 화면에서 켜고 끄면 즉시 반영됩니다)
--
-- [참고 B] 더미데이터만 지우기: 이 파일에서 [1] 삭제 블록(DO $$ ... END $$;)만 따로 실행하세요.
-- [참고 C] 상태를 바로 바꿔 보고 싶을 때 (예)
--   -- 이에이스(3)의 b02 신청을 방장이 수락한 상태로:
--   UPDATE match_participants SET status = 'ACCEPTED' WHERE match_id = 'b0000000-0000-4000-8000-000000000002' AND user_id = 'a0000000-0000-4000-8000-000000000003';
--   -- 박테린이(4)가 평가 3회를 채워 NTRP 2.5 가 된 상태로:
--   UPDATE users SET ntrp_count = 3, ntrp_score = 2.5 WHERE id = 'a0000000-0000-4000-8000-000000000004';
