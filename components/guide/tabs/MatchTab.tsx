// 가이드 ③ 매칭 (참여자 / 방장)
import { Section, Steps, Callout, MockFrame, PinList, Pin, LinkBtn, Chip } from "../GuideKit";

export default function MatchTab() {
  return (
    <>
      <Section id="find" title="방 찾아서 신청하기" lead="방 찾기에서 열린 방을 훑어보고, 마음에 드는 방에 신청해요.">
        <MockFrame title="방 상세" caption="신청 버튼은 화면 맨 아래에 있어요">
          <div className="hero-court text-white rounded-xl px-3 py-3 mb-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="bg-white/20 rounded-full px-2 py-0.5">🟢 모집중 <Pin n={1} /></span>
              <span className="bg-black/10 rounded-full px-2 py-0.5">복식</span>
            </div>
            <p className="font-bold mt-2">10월 31일 (토) 테니스 칠 분 구해요!</p>
            <p className="text-xs opacity-90">📍 예시 테니스장</p>
          </div>
          <div className="grid grid-cols-2 gap-2 tint rounded-xl p-2.5 text-xs">
            <div><p className="text-ink-muted">요구 실력</p><b>NTRP 2.0-3.0</b> <Pin n={2} /></div>
            <div><p className="text-ink-muted">매너 온도 기준</p><b>🌡️ 36.5도 이상</b> <Pin n={3} /></div>
            <div><p className="text-ink-muted">참가비</p><b>10,000원</b></div>
            <div><p className="text-ink-muted">참여 현황</p><b>2 / 4명</b> <Pin n={4} /></div>
          </div>
          <div className="flex gap-2 mt-3">
            <span className="flex-1 text-center rounded-xl border border-line py-2 text-xs">목록으로</span>
            <span className="flex-[2] text-center rounded-xl btn-clay py-2 text-xs font-bold">참여 신청 <Pin n={5} /></span>
          </div>
        </MockFrame>
        <PinList
          items={[
            { n: 1, title: "상태", desc: "모집중·마감됨·경기 완료·취소됨. 경기 시간이 지난 방은 '경기 시간 지남'으로 바뀌고 신청할 수 없어요." },
            { n: 2, title: "요구 실력", desc: "방장이 정한 실력 범위예요. 범위 밖이면 신청이 막힐 수 있어요." },
            { n: 3, title: "매너 온도 기준", desc: "내 매너 온도가 기준보다 낮으면 신청할 수 없어요." },
            { n: 4, title: "참여 현황", desc: "방장 포함 인원이에요. 프로필 테두리 색은 그 사람의 레벨이에요." },
            { n: 5, title: "참여 신청", desc: "누르면 방장에게 알림이 가고, 수락되면 확정돼요." },
          ]}
        />
        <Steps
          items={[
            { title: "신청", desc: "버튼이 '신청 대기 중'으로 바뀌어요. 이때는 아직 확정이 아니에요." },
            { title: "방장 수락", desc: "수락되면 버튼이 '수락됨'으로 바뀌고 알림이 와요. 이후 장소 지도와 채팅방을 쓸 수 있어요." },
            { title: "취소하고 싶다면", desc: "같은 버튼을 눌러 취소해요. 이미 수락된 뒤의 취소는 다른 참여자에게 피해가 가니 확인 창이 한 번 더 떠요." },
          ]}
        />
        <Callout kind="warn" title="수락 후 불참(노쇼)">
          연락 없이 나오지 않으면 평가에서 노쇼로 기록돼 매너 온도가 크게 내려가요. 사정이 생기면 꼭 미리 취소해 주세요.
        </Callout>
      </Section>

      <Section id="create" title="방 만들기 (방장)" lead="메뉴의 방 만들기에서 만들어요. 로그인이 필요해요.">
        <MockFrame title="방 만들기">
          <div className="space-y-2 text-xs">
            <div className="rounded-lg border border-line px-3 py-2">테니스장 <Pin n={1} /></div>
            <div className="rounded-lg border border-line px-3 py-2">경기 날짜·시간 <Pin n={2} /></div>
            <div className="flex gap-1.5 items-center">게임 종류 <Chip>단식</Chip><Chip on>복식</Chip><Chip>혼합복식</Chip><Chip>랠리</Chip> <Pin n={3} /></div>
            <div className="rounded-lg border border-line px-3 py-2">요구 실력: 비슷한 실력 (NTRP 2.0 ~ 3.0) <Pin n={4} /></div>
            <div className="rounded-lg border border-line px-3 py-2">모집 인원 (방장 제외): 3명 <Pin n={5} /></div>
            <div className="rounded-lg border border-line px-3 py-2">비용: 코트비 40,000원 / 예상 4명 <Pin n={6} /></div>
            <div className="rounded-lg border border-line px-3 py-2">🌡️ 참여 최소 매너 온도 <Pin n={7} /></div>
          </div>
        </MockFrame>
        <PinList
          items={[
            { n: 1, title: "테니스장", desc: "등록된 코트 중에서 골라요. 선택하면 상세 화면에 지도가 나와요." },
            { n: 2, title: "날짜·시간", desc: "한국 시간 기준이에요. 오늘 이전 날짜는 고를 수 없어요." },
            { n: 3, title: "게임 종류", desc: "단식(2명) · 복식/혼합복식(4명) · 랠리(연습)는 정해진 정원이 없어요." },
            { n: 4, title: "요구 실력", desc: "누구나 / 초보 환영 / 초보 전용 / 비슷한 실력 / 조금 더 잘 치는 분 / 조금 더 초보인 분 중에서 골라요. 내 구력을 기준으로 범위가 자동 계산돼요." },
            { n: 5, title: "모집 인원", desc: "방장을 뺀 인원이에요. 지인과 함께 오는 복식이라면 그만큼 줄여서 적어요." },
            { n: 6, title: "비용", desc: "총액을 적으면 인원수대로 나눠 1인당 금액을 계산해요. 코트비가 10만 원을 넘으면 금액이 맞는지 다시 물어봐요." },
            { n: 7, title: "최소 매너 온도", desc: "제한없음 / 33.0 / 35.0 / 36.5도 이상 중에서 골라요." },
          ]}
        />
        <Callout kind="tip" title="설명란을 꼭 채우세요">
          공 종류, 주차, 우천 시 규칙, 뒤풀이 여부를 적어 두면 신청 전에 서로 확인할 수 있어서 불참과 다툼이 줄어요.
        </Callout>
      </Section>

      <Section id="host" title="방장이 할 수 있는 일" lead="내가 만든 방의 상세 화면 아래쪽에 방장 전용 관리 영역이 보여요. 방장에게만 보여요.">
        <div className="grid gap-2.5 sm:grid-cols-2">
          {[
            ["✅ 신청 수락 / 거절", "신청자의 레벨·매너 온도를 보고 결정해요."],
            ["✏️ 방 정보 수정", "날짜·시간, 참가비, 상세 안내를 바꿀 수 있어요. 저장하면 신청자·참가자에게 변경 알림이 가요."],
            ["🏁 경기 완료 처리", "경기가 끝나면 완료로 바꿔요. 그때부터 서로 평가를 남길 수 있어요."],
            ["🗑 방 삭제", "모집 중인 방은 삭제할 수 있어요. 신청한 사람들에게 취소 알림이 가요."],
          ].map(([t, d]) => (
            <div key={t} className="surface rounded-xl p-4">
              <p className="font-bold">{t}</p>
              <p className="text-sm text-ink-muted mt-1 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
        <Callout kind="info" title="참가비는 어떻게 받나요?">
          서비스 안에서 결제하지 않아요. 방장이 안내한 방법(계좌 이체 등)으로 참가자와 직접 정산해요. 방 상세의 설명란과 채팅방에 방법을 적어 주세요.
        </Callout>
      </Section>

      <Section id="talk" title="질문하고 대화하기">
        <p className="text-sm text-ink-muted leading-relaxed">
          방 상세 맨 아래의 <b className="text-ink">댓글(Q&amp;A)</b>은 누구나 볼 수 있는 공개 질문이에요. 수락된 참가자와 방장끼리만 쓰는 <b className="text-ink">비공개 채팅방</b>은
          권한이 없는 사람에게는 아예 보이지 않아요. 개인 연락처나 계좌는 공개 댓글 대신 채팅방에 남기세요.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <LinkBtn href="/matches">방 찾기</LinkBtn>
          <LinkBtn href="/matches/create">방 만들기</LinkBtn>
        </div>
      </Section>
    </>
  );
}
