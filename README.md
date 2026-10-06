# 테니스매칭 🎾

실력과 매너로 만나는 테니스 파트너 매칭 서비스. Next.js + Supabase + Prisma로 만들었습니다.

## 문서

- [외부 서비스 연동 현황](docs/EXTERNAL_SERVICES.md) — 쓰고 있는 업체(Supabase, 포트원, 카카오맵 등) 목록과 계약 상태
- [.env.example](.env.example) — 필요한 환경변수 전체 목록

## 시작하기

```bash
npm install
cp .env.example .env   # 값 채우기 (docs/EXTERNAL_SERVICES.md 참고)
npx prisma generate
npx prisma migrate dev
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

## 스택

- **프레임워크**: Next.js (App Router)
- **DB / ORM**: Supabase(PostgreSQL) + Prisma
- **인증**: Supabase Auth
- **배포**: Vercel (예정)
