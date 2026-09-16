export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-slate-700 leading-relaxed">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">이용약관</h1>

      <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        ⚠️ 이 페이지는 개발용 템플릿입니다. 실제 서비스 오픈 전 반드시 서비스 실정에
        맞게 수정하고, 법률 전문가의 검토를 받아주세요.
      </div>

      <section className="mb-6">
        <h2 className="font-semibold text-slate-900 mb-2">제1조 (목적)</h2>
        <p>
          이 약관은 테니스 매칭 서비스(이하 &quot;서비스&quot;)의 이용과 관련하여
          회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-slate-900 mb-2">제2조 (회원가입 및 본인인증)</h2>
        <p>
          이용자는 본인인증 절차를 통해 확인된 고유 식별값(CI/DI)을 기준으로
          회원가입을 하며, 서비스 이용 정지(밴) 이력이 있는 이용자는 탈퇴 후에도
          동일한 본인인증 정보로 재가입할 수 없습니다.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-slate-900 mb-2">제3조 (이용자의 의무)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>구력(실력) 정보를 허위로 기재하지 않습니다.</li>
          <li>매칭 상대방에게 비매너 행위를 하지 않습니다.</li>
          <li>블라인드 평가를 악의적으로 조작하지 않습니다.</li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-slate-900 mb-2">제4조 (서비스 이용 제한)</h2>
        <p>
          회사는 이용자가 이 약관 또는 관계 법령을 위반한 경우, 사전 통지 후(또는
          긴급한 경우 사후 통지) 서비스 이용을 제한하거나 회원 자격을 정지(밴)할 수
          있습니다.
        </p>
      </section>

      <section>
        <h2 className="font-semibold text-slate-900 mb-2">제5조 (면책)</h2>
        <p>TODO: 매칭 중 발생한 부상/분쟁 등에 대한 회사의 책임 범위 명시</p>
      </section>
    </div>
  );
}
