// 가이드 ⑦ 알림 · 게시판 · 기록
import { Section, Steps, Callout, LinkBtn } from "../GuideKit";

export default function MoreTab() {
  return (
    <>
      <Section id="notify" title="알림 받기" lead="신청·수락·변경·대회 소식을 놓치지 않으려면 알림을 켜 두세요.">
        <Steps items={[
          { title: "마이페이지 → 알림 설정", desc: "푸시 알림 켜기를 누르고 브라우저 권한을 허용해요." },
          { title: "알림 수신 동의", desc: "가입 때 동의하지 않았다면 이 화면에서 켤 수 있어요." },
          { title: "알림 모아 보기", desc: "☰ 메뉴의 알림에서 받은 알림을 다시 볼 수 있어요." },
        ]} />
        <Callout kind="info" title="이런 알림이 와요">
          내 방에 신청이 왔을 때 / 내 신청이 수락됐을 때 / 방 정보가 바뀌거나 방이 삭제됐을 때 / 관심 테니스장의 예약 오픈 / 대회 소식
        </Callout>
        <Callout kind="warn" title="알림이 안 와요">
          브라우저 설정에서 이 사이트의 알림이 &apos;차단&apos;이면 켜도 오지 않아요. 아이폰은 홈 화면에 추가한 뒤에 알림을 받을 수 있어요.
        </Callout>
      </Section>

      <Section id="board" title="게시판 쓰는 법" lead="분류를 골라 글을 올려요. 로그인한 회원만 쓸 수 있어요.">
        <div className="grid gap-2.5 sm:grid-cols-3">
          {[
            ["📢 공지사항", "운영진의 안내. 서비스 변경이나 점검 소식이 올라와요."],
            ["💬 자유게시판", "테니스 이야기, 동호회 소식, 장비 질문 등 자유롭게."],
            ["💡 건의함", "있었으면 하는 기능이나 불편한 점을 남겨 주세요. 기능을 만들 때 참고해요."],
          ].map(([t, d]) => (
            <div key={t} className="surface rounded-xl p-4">
              <p className="font-bold">{t}</p>
              <p className="text-sm text-ink-muted mt-1 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
        <Callout kind="tip">건의는 &quot;무엇이 불편한지 + 어떻게 되면 좋겠는지&quot; 두 가지를 같이 적어 주시면 반영하기 쉬워요.</Callout>
        <LinkBtn href="/board">게시판 가기</LinkBtn>
      </Section>

      <Section id="record" title="기록실과 내 전적">
        <p className="text-sm text-ink-muted leading-relaxed">
          <b className="text-ink">기록실</b>에서는 내 경기 결과를 모아 볼 수 있고, 마이페이지의 <b className="text-ink">📊 내 전적 보기</b>에서는 승·패·무, 연승, 대회 트로피, 얻은 칭호를 한눈에 확인해요.
          다른 회원의 프로필도 닉네임을 눌러서 볼 수 있어요.
        </p>
        <div className="flex gap-2 mt-3"><LinkBtn href="/history">기록실</LinkBtn><LinkBtn href="/mypage">마이페이지</LinkBtn></div>
      </Section>

      <Section id="account" title="계정 관리">
        <ul className="text-sm text-ink-muted space-y-1.5 leading-relaxed list-disc pl-5">
          <li><b className="text-ink">프로필 수정</b>: 닉네임, 프로필 사진, 구력, 선호 위치를 바꿔요.</li>
          <li><b className="text-ink">비밀번호를 잊었어요</b>: 로그인 화면의 비밀번호 재설정으로 메일을 받아 새로 정해요.</li>
          <li><b className="text-ink">이용 제한</b>: 규정 위반이 확인되면 이용이 제한될 수 있어요. 이용약관을 확인해 주세요.</li>
        </ul>
      </Section>
    </>
  );
}
