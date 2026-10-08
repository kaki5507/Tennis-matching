# 외부 서비스 연동 현황

이 프로젝트가 의존하는 외부 업체/API 목록입니다. 새 서비스를 연동하거나 계약 상태가
바뀌면(예: 포트원 PG 계약 완료) **이 표를 같이 업데이트**해주세요. `.env.example`에
어떤 변수가 필요한지는 적혀있지만, "어디서 발급받는지 / 지금 상태가 어떤지"는
여기서만 관리됩니다.

## 한눈에 보기

| 업체 | 용도 | 상태 | 요금제 | 관련 `.env` 변수 |
|---|---|---|---|---|
| [Supabase](https://supabase.com/dashboard) | 로그인(Auth) + DB(PostgreSQL) 호스팅 | ✅ 연동됨 | 무료 티어 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`, `DIRECT_URL` |
| [Brevo](https://app.brevo.com) | 회원가입/비밀번호 재설정 이메일(SMTP) | ✅ 연동됨 | 무료 (일 300통) | Supabase 대시보드의 SMTP 설정에 직접 입력 (별도 `.env` 없음) |
| [포트원(PortOne)](https://admin.portone.io) | 본인인증(CI/DI) | ⚠️ **PG 계약 전** | 미정 | `NEXT_PUBLIC_PORTONE_STORE_ID`, `NEXT_PUBLIC_PORTONE_CHANNEL_KEY`, `PORTONE_API_SECRET` |
| [Kakao Developers](https://developers.kakao.com) | 테니스장 검색/지도 표시 | ✅ 연동됨 (localhost만 등록) | 무료 | `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` |
| [Firebase](https://console.firebase.google.com) | 웹 푸시 알림(Cloud Messaging) | ✅ 연동됨 | 무료 | `NEXT_PUBLIC_FIREBASE_*` 6종, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` |
| [부천시 공공서비스예약](https://reserv.bucheon.go.kr) | 테니스장 예약 빈자리 감지 (3시간마다 조회) | ✅ 조회 전용, 정식 계약 아님 | 무료 | 없음 (공개 페이지 조회) |
| [cron-job.org](https://cron-job.org) | 예약 빈자리 확인 API를 3시간마다 호출 | ⏳ 배포 시 등록 예정 | 무료 | `CRON_SECRET` (호출 시 인증 헤더로 사용) |
| [GitHub](https://github.com/kaki5507/Tennis-matching) | 코드 저장소 | ✅ 사용 중 | 무료 | 없음 (push용 PAT는 개인 보관) |
| Vercel | 배포 + 호스팅 | ⏳ 예정 | 무료 티어(Hobby)로 시작 예정 | 배포 시 위 변수들 전부 등록 필요 |

## 업체별 상세

### Supabase
- **역할**: 회원 로그인/세션 관리, 모든 데이터(유저, 매칭, 대회 등) 저장
- **주의사항**: 무료 티어는 접속 없으면 자동 일시정지됨. 대시보드에서 Restore 필요할 수 있음
- **테스트 단계 이메일 인증 건너뛰기**: Vercel 환경변수 `SUPABASE_SERVICE_ROLE_KEY`(서버 전용)를 넣으면, 임시 가입이 열려 있는 동안
  이메일 인증 없이 가입 즉시 로그인되고 로그인 화면에 "이메일 인증 건너뛰고 로그인" 버튼이 생김. 포트원 3종 설정 시 자동으로 꺼짐.
  (키를 안 넣으면 Supabase 대시보드 Authentication > Providers > Email 의 "Confirm email"을 끄는 방법 사용)
- **다음 할 일**: 없음

### Brevo
- **역할**: Supabase 기본 SMTP는 시간당 발송량이 너무 적어서 대체
- **다음 할 일**: 없음 (하루 300통 넘으면 유료 전환 검토)

### 포트원(PortOne)
- **역할**: 회원가입 시 본인인증(CI/DI) → 재가입 방지에 사용
- **현재 상태**: 다날/KCP 둘 다 본인인증 테스트 채널을 정책상 제공하지 않아서, 실제
  PG 계약 전까지는 **임시 가입**("본인인증 없이 가입하기" 버튼)을 사용 중.
  - 개발 환경: 자동 허용
  - 운영(Vercel): 포트원 설정 3종(STORE_ID/CHANNEL_KEY/API_SECRET) 중 하나라도 비어 있으면 기본 허용 (긴급 차단은 `ALLOW_UNVERIFIED_SIGNUP=false`)
  - 3종이 모두 설정되면 스위치와 무관하게 자동으로 닫힘
  - 임시 가입자는 본인인증 값 대신 이메일 해시(`unverified_…`)로 식별 → 같은 이메일 중복 가입/정지 회원의
    같은 이메일 재가입은 막히지만, 다른 이메일로는 새로 가입 가능. 관리자 > 회원 관리에서 "미인증" 배지로 구분됨
- **다음 할 일**: 사업자등록증 발급 → 포트원 콘솔에서 전자결제(본인인증) 신청 → PG 계약 →
  발급받은 키 3종을 `.env`에 입력하면 임시 가입 버튼 자동으로 사라짐 

### Kakao Developers
- **역할**: 방 만들기에서 테니스장 검색, 매칭 상세 페이지 지도 표시
- **현재 상태**: JavaScript 키 발급 완료, Web 플랫폼에 `localhost:3000`만 등록됨
- **다음 할 일**: Vercel 배포 후 실제 도메인을 Web 플랫폼에 추가 등록

### Firebase
- **역할**: 매칭 수락/거절, 입금확인, 대회, 예약 빈자리 등 모든 웹 푸시 알림
- **다음 할 일**: 없음

### 부천시 공공서비스예약
- **역할**: 예약 취소로 빈자리가 생기면 감지해서 구독자에게 알림
- **주의사항**: 정식 API가 아니라 공개 조회 페이지를 읽는 방식. 매크로 예약 금지 정책을
  지키기 위해 3시간 간격으로만 조회하고, 예약 신청은 절대 자동화하지 않음
  (`lib/bucheonScraper.ts` 상단 주석 참고)
- **왜 Vercel 자체 크론이 아니라 cron-job.org를 쓰는지**: Vercel 무료(Hobby) 플랜은
  크론을 하루 1번까지만 허용해서, 3시간마다 도는 이 기능은 자체 크론으로 못 돌림.
  대신 cron-job.org(무료)에서 `https://[배포도메인]/api/cron/check-court-availability`를
  **매시 정각, 한국 시간 오전 9시~밤 11시**(스케줄 `0 9-23 * * *`, 시간대 Asia/Seoul)에 호출하도록 등록. `Authorization: Bearer {CRON_SECRET}` 헤더 필요.
  수집 결과는 DB에 저장되고 사용자의 "빈 코트 찾기"는 저장본만 읽음(부천 사이트에 요청 안 감). 관리자는 /courts 화면에서 정기 수집 ON/OFF 와 "지금 갱신"을 쓸 수 있음.
  서버도 09~23시 밖의 호출은 건너뜀(`?force=1` 로 시간대만 무시 가능)
- **다음 할 일**: 없음 (배포 후 cron-job.org에 등록하면 끝)

### Vercel (예정)
- **역할**: 배포 + 예약 알림 크론(`vercel.json`) 실행
- **다음 할 일**: 프로젝트 생성 → 위 표의 `.env` 변수 전부 등록 → `ADMIN_SIGNUP_CODE`,
  `CRON_SECRET`도 함께 등록

## 이 문서 업데이트 규칙

1. 새 외부 서비스를 추가하면 → 위 표 한 줄 추가 + 아래 상세 섹션 추가
2. 계약/요금제 상태가 바뀌면 → 상태 열과 다음 할 일을 그 자리에서 수정 (히스토리는 git 커밋 로그가 대신함)
3. 키를 재발급하거나 폐기하면 → 실제 키 값은 여기 적지 말고, `.env.example`의 변수명만 최신으로 유지
