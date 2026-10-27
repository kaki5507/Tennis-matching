// 가이드 ⑥ 평가 · 매너 온도
import { Section, Steps, Callout, MockFrame, PinList, Pin } from "../GuideKit";

const MANNER = [
  ["⭐5", "+0.2도"],
  ["⭐4", "+0.1도"],
  ["⭐3", "변화 없음"],
  ["⭐2", "-0.2도"],
  ["⭐1", "-0.5도"],
  ["노쇼", "-2.0도"],
];

export default function TrustTab() {
  return (
    <>
      <Section id="flow" title="경기 후 평가는 이렇게 해요" lead="경기가 '완료'로 바뀐 뒤에만 평가할 수 있어요. 방장과 수락된 참가자가 서로를 평가해요.">
        <Steps items={[
          { title: "방장이 경기를 완료 처리", desc: "완료되기 전에는 평가 화면이 나타나지 않아요." },
          { title: "방 상세 아래에서 평가 작성", desc: "함께 친 사람마다 매너 별점, 실력(NTRP), 승패를 남겨요. 나를 뺀 모든 참가자가 대상이에요." },
          { title: "제출", desc: "한 번 제출하면 반영돼요. 누가 어떻게 평가했는지는 상대에게 공개되지 않아요(블라인드)." },
        ]} />
        <MockFrame title="경기 평가">
          <div className="rounded-xl border border-line p-3 space-y-2 text-xs">
            <p className="font-bold text-sm">닉네임 님 평가</p>
            <p>매너 <span className="text-base">⭐⭐⭐⭐⭐</span> <Pin n={1} /></p>
            <p>실력(NTRP) <b className="text-court">2.5</b> <Pin n={2} /></p>
            <p>경기 결과 <span className="badge-ok rounded-full px-2 py-0.5 font-bold">승</span> <Pin n={3} /></p>
            <p>☐ 노쇼였어요 <Pin n={4} /></p>
          </div>
        </MockFrame>
        <PinList items={[
          { n: 1, title: "매너 별점", desc: "1~5점. 시간 약속, 말투, 콜 매너를 기준으로 솔직하게 남겨 주세요." },
          { n: 2, title: "상대의 실력", desc: "1.0~7.0 사이에서 상대가 어느 정도로 쳤는지 적어요. 자기 느낌이 아니라 상대 실력이에요." },
          { n: 3, title: "승패 기록", desc: "내 시점에서 이 사람이 이겼는지 졌는지 기록해요. 승률·다승 랭킹에 쓰여요." },
          { n: 4, title: "노쇼", desc: "연락 없이 나오지 않았다면 체크해요. 가장 큰 감점이라 정말 그런 경우에만 눌러 주세요." },
        ]} />
      </Section>

      <Section id="manner" title="매너 온도 계산" lead="누구나 36.5도에서 시작해요. 평가를 받을 때마다 오르거나 내려가요.">
        <div className="grid grid-cols-3 gap-2">
          {MANNER.map(([k, v]) => (
            <div key={k} className="surface rounded-xl p-3 text-center">
              <p className="font-bold">{k}</p>
              <p className="text-sm text-ink-muted">{v}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-ink-muted mt-2">온도는 0도 이상 99.9도 이하로 유지돼요.</p>
        <Callout kind="tip" title="온도가 높으면 좋은 점">
          방장이 &quot;최소 매너 온도&quot;를 걸어 둔 방에도 신청할 수 있고, 수락도 더 잘 돼요. 랭킹의 &quot;매너 온도&quot; 탭에도 이름이 올라가요.
        </Callout>
      </Section>

      <Section id="ntrp" title="검증된 NTRP" lead="받은 실력 평가의 평균이에요. 평가가 3번 모이면 마이페이지에 공개돼요.">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="surface rounded-xl p-4">
            <p className="font-bold">🔍 실력 분석 중 (0~2회)</p>
            <p className="text-sm text-ink-muted mt-1">아직 공개되지 않아요. 점수는 대회 참가 자격에도 쓰이니 평가가 쌓일 때까지 기다려요.</p>
          </div>
          <div className="surface rounded-xl p-4">
            <p className="font-bold">🏆 검증된 NTRP (3회 이상)</p>
            <p className="text-sm text-ink-muted mt-1">평균 점수를 0.5 단위로 반올림해 보여줘요. 대회 신청의 기준이 돼요.</p>
          </div>
        </div>
        <Callout kind="warn" title="구력이 크게 다르면">
          내가 적은 구력과 평가 평균이 반복해서 크게 어긋나면 구력이 자동으로 조정되고 마이페이지에 안내가 떠요. 이런 일이 계속되면 서비스 이용이 제한될 수 있어요.
        </Callout>
      </Section>
    </>
  );
}
