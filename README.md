<div align="center">

# 🎾 테니스매칭

**실력과 매너로 만나는 테니스 파트너 매칭 서비스**

같이 칠 사람을 찾고, 빈 코트를 찾고, 대회까지. 한 곳에서.

[서비스 바로가기](https://tennis-matching-mu.vercel.app) · [이용 가이드](https://tennis-matching-mu.vercel.app/guide) · [외부 서비스 현황](docs/EXTERNAL_SERVICES.md)

![Next.js](https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs) ![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=000) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=fff) ![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20Postgres-3ecf8e?logo=supabase&logoColor=fff) ![Prisma](https://img.shields.io/badge/Prisma-6-2d3748?logo=prisma) ![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=fff)

</div>

---

## 어떤 서비스인가요?

단톡방에 "치실 분?" 올리고 답을 기다리는 대신, **방을 만들고 사람을 모으는** 서비스예요.
경기가 끝나면 서로 매너와 실력을 블라인드로 평가해서, 처음 만나는 사람도 믿고 칠 수 있게 해요.

## 주요 기능

| | 기능 | 설명 |
|---|---|---|
| 🤝 | **매칭** | 방 만들기·신청·수락, 요구 실력과 최소 매너 온도 설정, 방장 관리(수정·완료·삭제), 댓글 Q&A와 참가자 비공개 채팅 |
| 🎾 | **빈 코트 찾기** | 부천 테니스장의 예약 가능한 시간을 모아서 보여줘요. 오전/오후/퇴근 후(평일 20~22시)/쉬는 날 필터, 매달 25일부터 다음 달 표시 |
| 🔔 | **알림** | 웹 푸시(Firebase), 관심 테니스장 예약 오픈 알림 |
| 🌡️ | **매너 온도** | 36.5도에서 시작, 경기 후 별점 평가로 변동. 노쇼는 큰 감점 |
| 📊 | **검증된 NTRP** | 동료 평가 3회가 모이면 평균 실력 공개. 구력을 부풀리면 자동 조정 |
| 👑 | **레벨·칭호·랭킹** | 새싹부터 레전드까지 7단계, 평생/숨겨진/주간 칭호, 6가지 기준 랭킹 |
| 🏆 | **대회** | 단식·복식 신청, 파트너 초대, 자동 대진표와 시드 배정, 우승 기록 |
| 📝 | **게시판** | 공지사항 · 자유게시판 · 건의함 |
| 🔐 | **로그인** | 이메일, 구글·카카오 간편 로그인 (같은 이메일은 계정을 합치지 않고 차단) |
| 📖 | **이용 가이드** | `/guide` 에 8개 탭으로 화면과 함께 사용법 안내 |

## 홍보 이미지

인스타그램에 올리는 카드뉴스 원본(축소본)이에요. 이미지는 [`docs/promo`](docs/promo)에 있어요.

### 기능 소개

<table>
<tr><td><img src="docs/promo/feature_01.png" width="180" alt="소개"></td><td><img src="docs/promo/feature_02.png" width="180" alt="빈 코트"></td><td><img src="docs/promo/feature_03.png" width="180" alt="매칭 3단계"></td><td><img src="docs/promo/feature_04.png" width="180" alt="예약 오픈 알림"></td><td><img src="docs/promo/feature_05.png" width="180" alt="매너 온도"></td></tr>
<tr><td><img src="docs/promo/feature_06.png" width="180" alt="검증된 NTRP"></td><td><img src="docs/promo/feature_07.png" width="180" alt="레벨"></td><td><img src="docs/promo/feature_08.png" width="180" alt="칭호와 랭킹"></td><td><img src="docs/promo/feature_09.png" width="180" alt="대회 대진표"></td><td><img src="docs/promo/feature_10.png" width="180" alt="마무리"></td></tr>
</table>

### 준비 중인 기능 예고

아직 개발되지 않은 기능을 예고하는 시리즈예요. 이미지 속 화면은 모두 예상 화면이고, 출시 일정은 정해지지 않았어요.

<table>
<tr><td><img src="docs/promo/soon_01.png" width="180" alt="전체 티저"></td><td><img src="docs/promo/soon_02.png" width="180" alt="카카오톡 알림"></td><td><img src="docs/promo/soon_03.png" width="180" alt="시간대 선택 알림"></td><td><img src="docs/promo/soon_04.png" width="180" alt="본인 확인 마크"></td><td><img src="docs/promo/soon_05.png" width="180" alt="지역 확대"></td></tr>
<tr><td><img src="docs/promo/soon_06.png" width="180" alt="정산 현황"></td><td><img src="docs/promo/soon_07.png" width="180" alt="파트너 추천"></td><td><img src="docs/promo/soon_08.png" width="180" alt="동호회 방"></td><td><img src="docs/promo/soon_09.png" width="180" alt="월간 리포트"></td><td><img src="docs/promo/soon_10.png" width="180" alt="건의함"></td></tr>
</table>

## 시작하기

필요한 것: Node.js 20 이상, Supabase 프로젝트(Auth + Postgres)

```bash
git clone https://github.com/kaki5507/Tennis-matching.git
cd Tennis-matching
npm install
cp .env.example .env     # 값 채우기 (아래 환경변수 참고)
npx prisma generate
npx prisma migrate dev
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인할 수 있어요.

### 자주 쓰는 명령어

| 명령어 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 마이그레이션 적용 + Prisma 클라이언트 생성 + 빌드 (Vercel이 실행) |
| `npm run lint` | ESLint |
| `npm test` | 단위 테스트 (Vitest) |
| `npm run test:db` | DB가 필요한 통합 테스트 |

### 환경변수

전체 목록과 설명은 [`.env.example`](.env.example)에 있어요. 어디서 발급받는지, 지금 상태가 어떤지는 [외부 서비스 연동 현황](docs/EXTERNAL_SERVICES.md)에 정리돼 있어요.

| 구분 | 변수 | 비고 |
|---|---|---|
| 필수 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`, `DIRECT_URL` | Supabase |
| 푸시 알림 | `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Firebase |
| 크롤링 호출 | `CRON_SECRET` | 외부 크론이 보내는 Bearer 토큰 |
| 선택 | `PORTONE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `REQUIRE_EMAIL_CONFIRM`, `ADMIN_SIGNUP_CODE` | 본인인증·테스트 가입·관리자 |

> `SUPABASE_SERVICE_ROLE_KEY`, `FIREBASE_PRIVATE_KEY`, `CRON_SECRET`, `PORTONE_API_SECRET`은 서버 전용 비밀값이에요. 이름에 `NEXT_PUBLIC_`을 붙이거나 저장소에 올리지 마세요.

## 구조

```
app/            화면(App Router)과 서버 액션 (app/actions)
  courts/       빈 코트 찾기
  matches/      매칭 방 목록·상세·생성
  tournaments/  대회·대진표
  ranking/      랭킹
  board/        게시판
  guide/        이용 가이드
  api/cron/     빈 코트 수집 크론 엔드포인트
components/     공용 컴포넌트 (guide/ 는 가이드 전용)
lib/            규칙과 순수 함수 (레벨, 칭호, NTRP, 대진표, 코트 수집 등)
prisma/         스키마와 마이그레이션
tests/          단위·통합 테스트
docs/           문서와 홍보 이미지
```

## 빈 코트 수집은 이렇게 동작해요

1. 외부 크론([cron-job.org](https://cron-job.org))이 `/api/cron/check-court-availability`를 정해진 간격으로 호출해요. (`Authorization: Bearer <CRON_SECRET>` 필요)
2. 서버가 부천시 공공서비스예약 사이트의 공개 페이지를 조회해서 빈 시간을 저장해요. 매달 25일부터는 다음 달도 같이 수집해요.
3. 사용자는 저장된 결과를 읽어요. 그래서 화면이 빠르지만, 방금 예약된 자리는 잠시 남아 보일 수 있어요.

예약은 해당 시설의 예약 사이트에서 직접 해야 해요. 이 서비스는 조회 전용이에요.

## 배포

Vercel에 올리고, `npm run build`가 DB 마이그레이션을 먼저 적용해요. 배포 전에 Vercel 프로젝트 환경변수에 위 값들을 등록해 주세요.

## 문서

- [외부 서비스 연동 현황](docs/EXTERNAL_SERVICES.md): 쓰고 있는 업체 목록과 계약 상태
- [.env.example](.env.example): 필요한 환경변수 전체 목록
