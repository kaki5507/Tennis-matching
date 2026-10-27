// 가이드 ② 빈 코트 찾기
import { Section, Steps, Callout, MockFrame, PinList, Pin, LinkBtn, Chip } from "../GuideKit";

export default function CourtsTab() {
  return (
    <>
      <Section id="what" title="빈 코트 찾기는 이런 기능이에요" lead="부천 지역 테니스장의 예약 가능한 시간을 모아서 날짜별로 보여줘요. 예약은 해당 시설의 예약 사이트에서 직접 해요.">
        <Callout kind="info" title="데이터는 이렇게 모여요">
          시설 예약 사이트를 일정 간격으로 확인해서 저장해 둔 결과를 보여줘요. 그래서 화면은 빠르지만, 방금 전에 예약된 자리는 잠깐 남아 보일 수 있어요.
          예약 전에 시설 사이트에서 한 번 더 확인해 주세요.
        </Callout>
      </Section>

      <Section id="use" title="화면 보는 법">
        <MockFrame title="빈 코트" caption="기간 → 시간대 → 날짜별 목록 순으로 좁혀 가요">
          <div className="flex gap-1.5 mb-2">
            <Chip on>내일</Chip><Chip>7일</Chip><Chip>이번 달</Chip>
            <span className="self-center"><Pin n={1} /></span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            <Chip>오전</Chip><Chip on>오후</Chip><Chip>🌙 퇴근 후</Chip><Chip>쉬는 날</Chip>
            <span className="self-center"><Pin n={2} /></span>
          </div>
          <div className="rounded-xl border border-line p-2.5">
            <p className="font-bold text-xs mb-1.5">10월 28일 (수) <Pin n={3} /></p>
            <p className="text-xs font-semibold">예시 테니스장</p>
            <div className="flex flex-wrap gap-1 mt-1">
              <span className="px-2 py-0.5 rounded-md text-[11px] bg-ok-soft text-ok">14:00~16:00</span>
              <span className="px-2 py-0.5 rounded-md text-[11px] bg-ok-soft text-ok">16:00~18:00</span>
              <span className="px-2 py-0.5 rounded-md text-[11px] time-night">20:00~22:00 🌙 <Pin n={4} /></span>
            </div>
          </div>
        </MockFrame>
        <PinList
          items={[
            { n: 1, title: "기간", desc: "내일 / 내일부터 7일 / 이번 달 남은 날 중에서 골라요." },
            { n: 2, title: "시간대 필터", desc: "오전·오후·퇴근 후는 하나라도 맞으면 보이고(합집합), 쉬는 날은 그중 주말·공휴일 날짜만 남겨요." },
            { n: 3, title: "날짜별 목록", desc: "날짜마다 코트와 빈 시간이 묶여 나와요." },
            { n: 4, title: "퇴근 후 표시", desc: "평일 20~22시 시간대는 직장인이 치기 좋은 시간이라 따로 표시해요." },
          ]}
        />
      </Section>

      <Section id="nextmonth" title="매달 25일부터는 다음 달까지" lead="월말이 가까우면 이번 달에 남은 날이 거의 없어요. 그래서 25일부터는 다음 달 일정도 같이 보여줘요.">
        <Steps
          items={[
            { title: "1일~24일", desc: "이번 달 남은 날짜만 나와요." },
            { title: "25일~말일", desc: "이번 달 남은 날 + 다음 달 전체가 이어서 나와요. 날짜 목록이 달을 넘어 계속 이어져요." },
            { title: "다음 달 1일", desc: "다시 새로운 이번 달 기준으로 돌아와요." },
          ]}
        />
      </Section>

      <Section id="filters" title="시간대 필터 정리">
        <div className="overflow-hidden rounded-xl border border-line bg-white text-sm">
          {[
            ["오전", "12시 전에 시작하는 시간"],
            ["오후", "12시 이후에 시작하는 시간"],
            ["🌙 퇴근 후", "평일 20:00~22:00 (주말은 해당 안 됨)"],
            ["쉬는 날", "토·일요일과 공휴일 날짜만 남김 (다른 필터와 함께 쓰면 그중 쉬는 날만)"],
          ].map(([k, v]) => (
            <div key={k} className="flex gap-3 px-3 py-2.5 border-b border-line last:border-b-0">
              <b className="w-24 shrink-0">{k}</b><span className="text-ink-muted">{v}</span>
            </div>
          ))}
        </div>
        <Callout kind="tip">
          평일 퇴근 후에 칠 방을 만들고 싶다면 &quot;🌙 퇴근 후&quot;로 자리를 찾은 뒤, 같은 시간으로 매칭 방을 만들어 보세요.
        </Callout>
      </Section>

      <Section id="alert" title="취소표 / 예약 오픈 알림 받기" lead="관심 있는 테니스장을 등록해 두면 자리가 나왔을 때 알림을 받아요.">
        <Steps
          items={[
            { title: "알림 허용", desc: <>마이페이지의 <b>🔔 알림 설정</b>에서 푸시 알림을 켜요. 브라우저가 권한을 물으면 허용해 주세요.</> },
            { title: "관심 테니스장 등록", desc: <>같은 화면의 <b>📅 테니스장 예약 오픈 알림</b>에서 시설을 골라 추가해요.</> },
            { title: "알림 받고 바로 예약", desc: "알림을 누르면 사이트로 이동해요. 자리가 빨리 차니까 바로 시설 예약 사이트로 가세요." },
          ]}
        />
        <LinkBtn href="/courts">빈 코트 보러 가기</LinkBtn>
      </Section>
    </>
  );
}
