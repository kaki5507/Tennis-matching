# 인증 메일 디자인 (Supabase 이메일 템플릿)

Supabase 대시보드 → Authentication → Emails(Email Templates)에서 각 템플릿의 **Message body**에 HTML 파일 내용을 통째로 붙여 넣고 Save 하세요.

| Supabase 템플릿 | 파일 | 제목(Subject) 추천 |
|---|---|---|
| Confirm signup | confirm-signup.html | [테니스매칭] 이메일 인증을 완료해 주세요 |
| Reset password | reset-password.html | [테니스매칭] 비밀번호 재설정 |
| Change email address | change-email.html | [테니스매칭] 이메일 변경 확인 |
| Magic link | magic-link.html | [테니스매칭] 로그인 링크 |

- 로고는 `{{ .SiteURL }}/apple-icon.png`를 불러옵니다. **Site URL이 Vercel 주소**여야 이미지가 보여요.
- 메일 프로그램은 CSS 변수를 못 쓰므로 이 파일만 색상 값을 직접 적었어요. (사이트 색상 토큰과 같은 값)
- 보내는 사람 이름은 Authentication → SMTP Settings의 Sender name을 `테니스매칭`으로 바꾸면 더 깔끔해요.
- Brevo의 클릭 추적(click tracking)은 꺼 두세요. 켜져 있으면 일회용 링크가 먼저 소모될 수 있어요.
