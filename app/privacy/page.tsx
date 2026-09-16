export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-slate-700 leading-relaxed">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">개인정보처리방침</h1>

      <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        ⚠️ 이 페이지는 개발용 템플릿입니다. 실제 서비스 오픈 전 반드시 아래 항목을
        서비스 실정에 맞게 채우고, 법률 전문가의 검토를 받아주세요.
        (회사명/사업자등록번호/수집 항목/보유기간/제3자 제공 여부/위탁 업체 등은
        실제 운영 현황과 반드시 일치해야 합니다.)
      </div>

      <section className="mb-6">
        <h2 className="font-semibold text-slate-900 mb-2">1. 수집하는 개인정보 항목</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>필수: 이메일, 닉네임, 성별, 본인인증 고유식별값(CI/DI)</li>
          <li>선택: 프로필 사진, 생년(나이 제한 계산용)</li>
          <li>서비스 이용 중 생성: 구력, 선호 포지션, 매칭 참여/평가 기록</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-slate-900 mb-2">2. 개인정보의 수집 및 이용 목적</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>회원 식별 및 재가입 방지(CI/DI)</li>
          <li>레벨별 매칭 서비스 제공</li>
          <li>블라인드 평가를 통한 매너/실력 신뢰도 관리</li>
          <li>(동의 시) 매칭/입금/대회 관련 알림 발송</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-slate-900 mb-2">3. 개인정보의 보유 및 이용 기간</h2>
        <p>
          회원 탈퇴 시 지체 없이 파기합니다. 단, 관계 법령에 따라 보존이 필요한
          정보는 해당 법령에서 정한 기간 동안 보관합니다. (TODO: 실제 보관 기간 명시)
        </p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-slate-900 mb-2">4. 개인정보 처리 위탁</h2>
        <p>TODO: Supabase(인증/DB), 포트원(본인인증) 등 위탁 업체 및 위탁 업무 내용 명시</p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-slate-900 mb-2">5. 이용자의 권리</h2>
        <p>
          이용자는 언제든지 자신의 개인정보를 조회, 수정, 삭제(탈퇴)할 수 있으며,
          마이페이지 또는 고객센터를 통해 요청할 수 있습니다.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-slate-900 mb-2">6. 개인정보 보호책임자</h2>
        <p>TODO: 담당자명 / 연락처 / 이메일</p>
      </section>
    </div>
  );
}
