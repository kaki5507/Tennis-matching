// 가이드 ⑤ 레벨·칭호·랭킹 (규칙 표는 실제 코드의 값을 그대로 가져와서 항상 최신으로 맞춰져요)
import { Section, Callout, MockFrame, PinList, Pin, LinkBtn } from "../GuideKit";
import { LEVELS } from "@/lib/levels";
import { TITLES, WEEKLY_TITLES } from "@/lib/titles";

export default function GrowthTab() {
  const normal = TITLES.filter((t) => !t.hidden);
  const hidden = TITLES.filter((t) => t.hidden);
  return (
    <>
      <Section id="level" title="레벨은 이렇게 올라요" lead="경험치만 쌓는다고 올라가지 않아요. 아래 조건을 모두 채워야 다음 레벨로 올라가요.">
        <div className="grid gap-2.5 sm:grid-cols-3 mb-4">
          {[
            ["경기 1판", "+10"],
            ["방문 1일", "+1 (하루 1번만)"],
            ["대회 참가 1회", "+20"],
          ].map(([k, v]) => (
            <div key={k} className="surface rounded-xl p-3 text-center">
              <p className="text-xs text-ink-muted">{k}</p>
              <p className="font-display text-lg text-court">{v}</p>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-sm min-w-[460px]">
            <thead>
              <tr className="tint text-left text-xs text-ink-muted">
                <th className="px-3 py-2">레벨</th><th className="px-3 py-2">경험치</th><th className="px-3 py-2">경기 수</th><th className="px-3 py-2">방문일</th><th className="px-3 py-2">프로필 테두리</th>
              </tr>
            </thead>
            <tbody>
              {LEVELS.map((l) => (
                <tr key={l.level} className="border-t border-line">
                  <td className="px-3 py-2 font-bold whitespace-nowrap">{l.emoji} Lv.{l.level} {l.name}</td>
                  <td className="px-3 py-2">{l.minXp}</td>
                  <td className="px-3 py-2">{l.minPlayed}판</td>
                  <td className="px-3 py-2">{l.minVisitDays}일</td>
                  <td className="px-3 py-2 text-ink-muted">
                    <span className={`lv-ring lv-${l.level} align-middle mr-1.5`}><span className="block w-4 h-4 rounded-full bg-white" /></span>{l.ringHint}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Callout kind="info" title="한 칸씩 올라가요">
          조건을 모두 채운 가장 높은 레벨까지 순서대로 올라가요. 레벨은 내 실력(NTRP)이 아니라 &quot;얼마나 꾸준히 활동했는지&quot;를 보여주는 지표예요.
        </Callout>
      </Section>

      <Section id="ranking" title="랭킹 보는 법" lead="랭킹은 이메일 인증을 마친 회원만 보여요. 탭을 바꿔 기준을 골라요.">
        <MockFrame title="랭킹">
          <div className="flex gap-1 overflow-hidden text-[11px] mb-2">
            {["레벨", "매너 온도", "승률", "다승", "경기 수", "이주의 칭호"].map((t, i) => (
              <span key={t} className={`shrink-0 rounded-full px-2.5 py-1 ${i === 0 ? "chip-on" : "tint"}`}>{t}</span>
            ))}
            <Pin n={1} />
          </div>
          <div className="flex items-center gap-2 py-1.5 border-t border-line">
            <b className="w-5 text-center">1</b>
            <span className="lv-ring lv-5"><span className="block w-7 h-7 rounded-full bg-ok-soft" /></span>
            <div className="min-w-0"><p className="font-semibold text-sm">닉네임</p><p className="text-[11px] text-ink-muted">⭐ 에이스 · Lv.5 <Pin n={2} /></p></div>
          </div>
        </MockFrame>
        <PinList items={[
          { n: 1, title: "여섯 가지 기준", desc: "레벨 / 매너 온도 / 승률 / 다승 / 경기 수 / 이주의 칭호. 검색창에서 닉네임으로 찾을 수도 있어요." },
          { n: 2, title: "프로필 테두리", desc: "레벨이 높을수록 테두리가 화려해져요. 방 목록과 참여자 목록에서도 똑같이 보여요." },
        ]} />
        <p className="text-sm text-ink-muted">메인의 &quot;함께하는 회원&quot; 숫자를 누르면 이 화면으로 와요. 같은 기준(이메일 인증 완료)으로 센 숫자예요.</p>
      </Section>

      <Section id="titles" title="칭호 모으기" lead="조건을 채우면 영구히 얻는 칭호예요. 프로필에 진열돼요.">
        <div className="grid gap-2 sm:grid-cols-2">
          {normal.map((t) => (
            <div key={t.id} className="surface rounded-xl px-3 py-2.5 flex gap-2.5 items-start">
              <span className="text-xl leading-none">{t.emoji}</span>
              <div><p className="font-bold text-sm">{t.name}</p><p className="text-xs text-ink-muted">{t.desc}</p></div>
            </div>
          ))}
        </div>
        <h3 className="font-bold text-ink mt-5 mb-1">🕵️ 숨겨진 칭호</h3>
        <p className="text-xs text-ink-muted mb-2">획득 전에는 이름이 ???로 보여요. 조건만 살짝 알려 드릴게요.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {hidden.map((t) => (
            <div key={t.id} className="rounded-xl border border-dashed border-line bg-white px-3 py-2.5 flex gap-2.5 items-start">
              <span className="text-xl leading-none">{t.emoji}</span>
              <div><p className="font-bold text-sm">{t.name}</p><p className="text-xs text-ink-muted">{t.desc}</p></div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="weekly" title="이주의 칭호" lead="지난주(월~일) 결과로 뽑아 이번 주 동안 달고 다녀요. 매주 새로 바뀌어요.">
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.values(WEEKLY_TITLES).map((w) => (
            <div key={w.name} className="surface rounded-xl px-3 py-2.5">
              <p className="font-bold text-sm">{w.emoji} {w.name}</p>
              <p className="text-xs text-ink-muted mt-0.5">{w.desc}</p>
              <p className="text-[11px] text-ink-muted mt-1">최소 {w.min}회 이상일 때만 선정</p>
            </div>
          ))}
        </div>
        <div className="mt-4"><LinkBtn href="/ranking">랭킹 보러 가기</LinkBtn></div>
      </Section>
    </>
  );
}
