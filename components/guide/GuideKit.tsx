// components/guide/GuideKit.tsx
// 가이드 페이지 공통 부품. 서버 컴포넌트로만 구성(상태 없음)해서 가볍게 렌더링합니다.
// 실제 스크린샷 대신, 사이트의 실제 CSS 클래스를 그대로 쓴 "화면 그림(MockFrame)"으로 설명합니다.
import Link from "next/link";
import type { ReactNode } from "react";

/** 화면 그림 위의 번호 핀. 아래 설명 목록의 번호와 짝을 이룹니다. */
export function Pin({ n }: { n: number }) {
  return (
    <span
      className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-clay text-white text-[10px] font-bold align-middle shrink-0"
      aria-label={`${n}번`}
    >
      {n}
    </span>
  );
}

/** 휴대폰 화면 모양의 틀. 안쪽은 실제 사이트와 같은 색/모서리로 그립니다. */
export function MockFrame({ title, children, caption }: { title: string; children: ReactNode; caption?: string }) {
  return (
    <figure className="my-4">
      <div className="mx-auto max-w-sm rounded-2xl border-2 border-line bg-white overflow-hidden shadow-sm" role="img" aria-label={`${title} 화면 예시`}>
        <div className="flex items-center gap-1.5 px-3 py-2 bg-[var(--mist)] border-b border-line">
          <span className="w-2 h-2 rounded-full bg-[var(--clay)]" />
          <span className="w-2 h-2 rounded-full bg-[var(--grass)]" />
          <span className="w-2 h-2 rounded-full bg-[var(--court-soft)]" />
          <span className="ml-2 text-[11px] font-semibold text-ink-muted truncate">{title}</span>
        </div>
        <div className="p-3 text-sm text-ink select-none" aria-hidden>{children}</div>
      </div>
      {caption && <figcaption className="mt-2 text-center text-xs text-ink-muted">{caption}</figcaption>}
    </figure>
  );
}

/** 번호 핀과 짝이 되는 설명 목록 */
export function PinList({ items }: { items: { n: number; title: string; desc: ReactNode }[] }) {
  return (
    <ol className="space-y-2.5 my-3">
      {items.map((it) => (
        <li key={it.n} className="flex gap-2.5 items-start">
          <span className="mt-0.5"><Pin n={it.n} /></span>
          <p className="text-sm leading-relaxed text-ink">
            <b className="font-bold">{it.title}</b>
            <span className="text-ink-muted"> {it.desc}</span>
          </p>
        </li>
      ))}
    </ol>
  );
}

/** 순서가 있는 따라하기 단계 */
export function Steps({ items }: { items: { title: string; desc: ReactNode }[] }) {
  return (
    <ol className="my-4 space-y-0">
      {items.map((s, i) => (
        <li key={s.title} className="relative flex gap-3 pb-5 last:pb-0">
          {i < items.length - 1 && <span className="absolute left-[13px] top-7 bottom-0 w-px bg-line" aria-hidden />}
          <span className="relative z-10 flex items-center justify-center w-7 h-7 rounded-full bg-[var(--court)] text-white text-xs font-bold shrink-0">{i + 1}</span>
          <div className="min-w-0 pt-0.5">
            <p className="font-bold text-ink">{s.title}</p>
            <div className="text-sm text-ink-muted leading-relaxed mt-0.5">{s.desc}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

const CALLOUT = {
  tip: { icon: "💡", cls: "bg-ok-soft border-[var(--ok)]", label: "꿀팁" },
  warn: { icon: "⚠️", cls: "alert-warn", label: "주의" },
  info: { icon: "ℹ️", cls: "bg-[var(--mist)] border-line", label: "참고" },
} as const;

export function Callout({ kind = "tip", title, children }: { kind?: keyof typeof CALLOUT; title?: string; children: ReactNode }) {
  const c = CALLOUT[kind];
  return (
    <aside className={`my-4 rounded-xl border px-4 py-3 text-sm leading-relaxed ${c.cls}`}>
      <p className="font-bold mb-0.5">{c.icon} {title ?? c.label}</p>
      <div className="text-ink">{children}</div>
    </aside>
  );
}

/** 탭 안의 큰 단락 */
export function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 mb-10">
      <h2 className="font-display text-xl text-court">{title}</h2>
      {lead && <p className="mt-1 text-sm text-ink-muted leading-relaxed">{lead}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function LinkBtn({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center rounded-full btn-clay px-4 py-2 text-sm font-bold">
      {children}
    </Link>
  );
}

/** 자주 묻는 질문 (브라우저 기본 details 사용 — 스크립트 없이 열고 닫힘) */
export function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-line bg-white px-4 py-3 mb-2">
      <summary className="cursor-pointer list-none flex items-center justify-between gap-3 font-semibold text-ink">
        <span>{q}</span>
        <span className="text-ink-muted transition-transform group-open:rotate-45 text-lg leading-none" aria-hidden>+</span>
      </summary>
      <div className="mt-2 text-sm text-ink-muted leading-relaxed">{children}</div>
    </details>
  );
}

/** 작은 알약 모양 (화면 그림 안에서 쓰는 가짜 버튼/칩) */
export function Chip({ on, children }: { on?: boolean; children: ReactNode }) {
  return <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${on ? "chip-on" : "bg-[var(--mist)] text-ink"}`}>{children}</span>;
}
