// 가이드 ④ 대회
import { Section, Steps, Callout, MockFrame, PinList, Pin, LinkBtn } from "../GuideKit";

export default function TournamentTab() {
  return (
    <>
      <Section id="list" title="대회 목록 보는 법" lead="대회 메뉴에서 열린 대회를 확인해요. 카드마다 종류와 참가 조건이 적혀 있어요.">
        <MockFrame title="대회">
          <div className="surface rounded-xl p-3">
            <div className="flex items-center justify-between text-xs">
              <b>👯 복식 · 가을 오픈 <Pin n={1} /></b>
              <span className="badge-ok rounded-full px-2 py-0.5 font-bold">모집중 <Pin n={2} /></span>
            </div>
            <p className="text-xs text-ink-muted mt-1.5">📍 예시 테니스장</p>
            <p className="text-xs text-ink-muted">11/15 · NTRP 2.0~3.5 · 팀 평균 3.0 이하 <Pin n={3} /></p>
          </div>
        </MockFrame>
        <PinList
          items={[
            { n: 1, title: "종류", desc: "단식은 한 명씩, 복식은 파트너와 한 팀으로 나가요." },
            { n: 2, title: "상태", desc: "모집중 → 모집마감 → 진행중 → 종료 순서로 바뀌어요." },
            { n: 3, title: "참가 조건", desc: "검증된 NTRP 범위 안이어야 하고, 대회에 따라 최소 매너 온도 기준도 있어요. 복식은 두 사람의 평균이 팀 평균 상한 이하여야 해요." },
          ]}
        />
        <Callout kind="info" title="왜 '검증된 실력'이 필요한가요?">
          대회는 비슷한 실력끼리 붙어야 재미있어서, 내가 적은 구력이 아니라 동료 평가로 확인된 NTRP를 기준으로 참가 자격을 봐요.
          평가가 3번 이상 쌓이면 자격이 생겨요.
        </Callout>
      </Section>

      <Section id="apply" title="신청하기">
        <h3 className="font-bold text-ink mb-1">단식</h3>
        <Steps items={[
          { title: "대회 상세 열기", desc: "조건을 만족하면 '대회 신청하기' 버튼이 활성화돼요." },
          { title: "버튼 한 번", desc: "신청이 끝나면 '✅ 신청 완료됐어요!'가 보여요. 마감 전이라면 같은 자리에서 신청을 취소할 수 있어요." },
        ]} />
        <h3 className="font-bold text-ink mt-4 mb-1">복식</h3>
        <Steps items={[
          { title: "파트너 검색", desc: "닉네임으로 파트너를 찾아 초대해요." },
          { title: "파트너 수락", desc: "파트너가 수락해야 한 팀으로 인정돼요. 수락하지 않은 팀은 대진표에서 빠져요." },
          { title: "팀 평균 확인", desc: "두 사람의 NTRP 평균이 상한을 넘으면 신청할 수 없다고 안내돼요." },
        ]} />
        <Callout kind="tip">버튼이 비활성화돼 있으면 버튼 아래 안내 문구에 이유가 적혀 있어요. (예: 실력 범위 밖, 모집 마감)</Callout>
      </Section>

      <Section id="bracket" title="대진표와 결과" lead="모집이 끝나면 관리자가 대진표를 만들어요. 시드는 NTRP를 기준으로 자동 배정돼요.">
        <Steps items={[
          { title: "대진표 생성", desc: "신청 인원(복식은 팀 수)에 맞춰 자동으로 만들어져요. 복식의 팀 실력은 두 선수의 NTRP 합이에요." },
          { title: "경기 진행", desc: "대진표 화면에서 내 경기를 확인하고, 결과가 입력되면 다음 라운드가 채워져요." },
          { title: "우승 기록", desc: "우승하면 프로필의 트로피 진열장과 칭호(챔피언)에 남아요. 대회 참가는 레벨 경험치도 올려줘요." },
        ]} />
        <LinkBtn href="/tournaments">대회 보러 가기</LinkBtn>
      </Section>
    </>
  );
}
