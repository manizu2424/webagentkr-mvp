// 페이지의 유일한 강조점. 카드 상자 대신 계측기 판독값 — 모노 숫자 + 눈금 위 마름모 마커.
// 마름모·헤어라인은 랜딩 스파인 / wizard-progress 와 같은 시각 언어.
export function ScoreCard({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[0.9rem] font-semibold text-ink">자동화 준비도</h2>
        <span className="font-flow text-[0.7rem] text-ink-soft">추정</span>
      </div>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="font-flow text-[3.5rem] leading-none font-medium tracking-tight text-signal sm:text-[4.25rem]">
          {pct}
        </span>
        <span className="font-flow text-[1.05rem] text-ink-soft">/ 100</span>
      </p>

      <div aria-hidden className="relative mt-5 mb-1 h-3">
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />
        <span
          className="absolute top-1/2 left-0 h-px -translate-y-1/2 bg-signal"
          style={{ width: `${pct}%` }}
        />
        {[25, 50, 75].map((t) => (
          <span
            key={t}
            className="absolute top-1/2 h-2 w-px -translate-y-1/2 bg-line"
            style={{ left: `${t}%` }}
          />
        ))}
        <span
          className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-signal ring-4 ring-paper"
          style={{ left: `${pct}%` }}
        />
      </div>
    </section>
  );
}
