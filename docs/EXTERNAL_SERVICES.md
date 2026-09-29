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
| [GitHub](https://github.com/kaki5507/Tennis-matching) | 코드 저장소 | ✅ 사용 중 | 무료 | 없음 (push용 PAT는 개인 보관) |
| Vercel | 배포 + 크론(예약 알림) 실행 | ⏳ 예정 | 무료 티어로 시작 예정 | 배포 시 위 변수들 전부 등록 필요 |

## 업체별 상세

### Supabase
- **역할**: 회원 로그인/세션 관리, 모든 데이터(유저, 매칭, 대회 등) 저장
- **주의사항**: 무료 티어는 접속 없으면 자동 일시정지됨. 대시보드에서 Restore 필요할 수 있음
- **다음 할 일**: 없음

### Brevo
- **역할**: Supabase 기본 SMTP는 시간당 발송량이 너무 적어서 대체
- **다음 할 일**: 없음 (하루 300통 넘으면 유료 전환 검토)

### 포트원(PortOne)
- **역할**: 회원가입 시 본인인증(CI/DI) → 재가입 방지에 사용
- **현재 상태**: 다날/KCP 둘 다 본인인증 테스트 채널을 정책상 제공하지 않아서, 실제
  PG 계약 전까지는 **개발용 우회 버튼**으로 회원가입 플로우만 테스트 중 (`NODE_ENV=production`이거나
  `PORTONE_API_SECRET`이 설정되면 자동으로 비활성화됨)
- **다음 할 일**: 사업자등록증 발급 → 포트원 콘솔에서 전자결제(본인인증) 신청 → PG 계약 →
  발급받은 키 3종을 `.env`에 입력하면 우회 버튼 자동으로 사라짐

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
- **다음 할 일**: 없음 (배포되어야 크론이 실제로 돎)

### Vercel (예정)
- **역할**: 배포 + 예약 알림 크론(`vercel.json`) 실행
- **다음 할 일**: 프로젝트 생성 → 위 표의 `.env` 변수 전부 등록 → `ADMIN_SIGNUP_CODE`,
  `CRON_SECRET`도 함께 등록

## 이 문서 업데이트 규칙

1. 새 외부 서비스를 추가하면 → 위 표 한 줄 추가 + 아래 상세 섹션 추가
2. 계약/요금제 상태가 바뀌면 → 상태 열과 다음 할 일을 그 자리에서 수정 (히스토리는 git 커밋 로그가 대신함)
3. 키를 재발급하거나 폐기하면 → 실제 키 값은 여기 적지 말고, `.env.example`의 변수명만 최신으로 유지
