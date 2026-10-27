// 가이드 ① 시작하기: 가입 → 프로필 → 첫 매칭까지
import { Section, Steps, Callout, MockFrame, PinList, Pin, LinkBtn, Chip } from "../GuideKit";
import { NTRP_OPTIONS } from "@/lib/ntrpLevels";

export default function StartTab() {
  return (
    <>
      <Section id="overview" title="테니스매칭이 뭐예요?" lead="같이 칠 사람을 찾고, 빈 코트를 찾고, 대회까지 나가는 테니스 모임 서비스예요.">
        <div className="grid gap-2.5 sm:grid-cols-2">
          {[
            ["🔍", "매칭", "비슷한 실력의 사람이 만든 방에 신청하거나, 내가 방장이 되어 사람을 모아요."],
            ["🎾", "빈 코트", "부천 지역 테니스장의 비어 있는 시간을 한 화면에서 모아 봐요."],
            ["🏆", "대회", "자체 대회에 신청하면 대진표가 자동으로 만들어져요."],
            ["🌡️", "매너·실력 평가", "경기 뒤 서로 블라인드로 평가해서 믿을 수 있는 매칭을 만들어요."],
          ].map(([e, t, d]) => (
            <div key={t} className="surface rounded-xl p-4">
              <p className="font-bold text-ink">{e} {t}</p>
              <p className="text-sm text-ink-muted mt-1 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="signup" title="1. 가입하기" lead="이메일 가입과 구글·카카오 간편 로그인 중 편한 쪽을 고르세요.">
        <Steps
          items={[
            { title: "회원가입 화면 열기", desc: <>오른쪽 위 <b>회원가입</b> 버튼(휴대폰은 ☰ 메뉴)을 눌러요.</> },
            { title: "이메일·비밀번호·닉네임 입력", desc: "비밀번호는 6자 이상. 닉네임은 다른 회원과 겹치면 쓸 수 없어요. 약관과 개인정보 동의는 필수예요." },
            { title: "이메일 인증", desc: "가입 직후 메일로 인증 안내가 가요. 메일의 링크를 누르면 가입이 끝나요. 안 보이면 스팸함도 확인하세요." },
            { title: "로그인", desc: "인증이 끝나면 같은 이메일·비밀번호로 로그인해요." },
          ]}
        />
        <MockFrame title="회원가입" caption="입력 중 오류가 생기면 가입 버튼 바로 위에 빨간 안내가 떠요">
          <div className="space-y-2">
            <div className="rounded-lg border border-line px-3 py-2 text-ink-muted">이메일 <Pin n={1} /></div>
            <div className="rounded-lg border border-line px-3 py-2 text-ink-muted">비밀번호 (6자 이상)</div>
            <div className="rounded-lg border border-line px-3 py-2 text-ink-muted">닉네임 <Pin n={2} /></div>
            <div className="text-xs text-ink-muted">☑ 이용약관 동의 &nbsp; ☑ 개인정보 동의 <Pin n={3} /></div>
            <div className="rounded-lg alert-warn border px-3 py-2 text-xs">잠시 후 다시 시도해 주세요 <Pin n={4} /></div>
            <div className="rounded-full btn-clay text-center py-2.5 font-bold">회원가입</div>
          </div>
        </MockFrame>
        <PinList
          items={[
            { n: 1, title: "이메일", desc: "인증 메일을 받을 수 있는 주소여야 해요." },
            { n: 2, title: "닉네임", desc: "랭킹·방 목록에 보이는 이름이에요. 나중에 프로필에서 바꿀 수 있어요." },
            { n: 3, title: "약관 동의", desc: "이용약관·개인정보는 필수, 알림 수신은 선택이에요." },
            { n: 4, title: "오류 안내", desc: "버튼 바로 위에 표시돼요. 버튼을 두 번 눌러도 한 번만 처리돼요." },
          ]}
        />
        <Callout kind="info" title="간편 로그인">
          로그인 화면의 <b>구글 / 카카오</b> 버튼으로도 가입할 수 있어요. 이미 이메일로 가입한 주소와 같은 이메일이면 계정이 합쳐지지 않고,
          &quot;이미 가입된 이메일이에요, 이메일로 로그인해 주세요&quot;라고 안내해요.
        </Callout>
        <Callout kind="warn" title="인증 메일이 안 와요">
          메일 발송은 짧은 시간에 여러 번 요청하면 잠시 막혀요. &quot;50초 뒤에 다시 요청할 수 있어요&quot; 같은 안내가 뜨면 기다렸다가 한 번만 다시 눌러 주세요.
        </Callout>
      </Section>

      <Section id="profile" title="2. 프로필 채우기" lead="마이페이지 → 프로필 수정에서 구력과 선호 위치를 입력해요. 방 신청과 대회 신청에 쓰이는 정보예요.">
        <MockFrame title="마이페이지" caption="상단 배지로 자칭 구력과 검증된 실력을 한눈에 봐요">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-ok-soft text-ok flex items-center justify-center text-xl font-bold">테</div>
            <div>
              <p className="font-bold">테니스러버 님</p>
              <div className="flex flex-wrap gap-1 mt-1 text-[11px]">
                <span className="tint px-2 py-0.5 rounded-full border border-line">🙋 자칭: NTRP 2.0 <Pin n={1} /></span>
                <span className="border border-dashed border-line px-2 py-0.5 rounded-full text-ink-muted">🔍 실력 분석 중 (1/3) <Pin n={2} /></span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 text-xs"><Chip>프로필 수정</Chip><Chip>📊 내 전적 보기</Chip></div>
        </MockFrame>
        <PinList
          items={[
            { n: 1, title: "자칭 구력", desc: "내가 직접 고른 NTRP예요. 솔직하게 고를수록 맞는 상대를 만나요." },
            { n: 2, title: "검증된 NTRP", desc: "다른 사람들의 평가가 3번 모이면 평균 실력이 공개돼요." },
          ]}
        />
        <h3 className="font-bold text-ink mt-5 mb-2">구력(NTRP) 고르는 기준</h3>
        <p className="text-sm text-ink-muted mb-2">초보는 작은 차이도 크기 때문에 0.5부터 &quot;할 수 있는 것&quot; 기준으로 나눴어요.</p>
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          {NTRP_OPTIONS.map((o) => (
            <div key={o.label} className="flex gap-3 px-3 py-2 border-b border-line last:border-b-0 text-sm">
              <span className="w-12 shrink-0 font-bold text-court">{o.value.toFixed(o.value % 1 === 0 ? 1 : 2)}</span>
              <span className="w-24 shrink-0 font-semibold">{o.name}</span>
              <span className="text-ink-muted">{o.short}</span>
            </div>
          ))}
        </div>
        <Callout kind="warn" title="구력을 부풀리면">
          경기 후 동료 평가가 내가 적은 구력과 반복해서 크게 다르면 구력이 자동으로 조정되고, 횟수가 쌓이면 서비스 이용이 제한될 수 있어요.
        </Callout>
      </Section>

      <Section id="first" title="3. 첫 경기까지 한눈에" lead="처음이라면 이 순서를 따라가 보세요.">
        <Steps
          items={[
            { title: "방 구경하기", desc: "메뉴의 방 찾기에서 열린 방을 훑어봐요. 로그인 없이도 볼 수 있어요." },
            { title: "마음에 드는 방에 신청", desc: "방 상세에서 참여 신청을 누르면 방장에게 알림이 가요." },
            { title: "방장이 수락하면 확정", desc: "수락되면 상세 화면에서 장소 지도와 채팅방이 열려요." },
            { title: "경기하고 평가 남기기", desc: "방장이 경기를 완료 처리하면 서로 매너와 실력을 평가해요." },
          ]}
        />
        <div className="flex flex-wrap gap-2 mt-2">
          <LinkBtn href="/matches">열린 방 보러 가기</LinkBtn>
          <LinkBtn href="/signup">회원가입</LinkBtn>
        </div>
      </Section>
    </>
  );
}
