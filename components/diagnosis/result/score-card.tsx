export function ScoreCard({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <section className="border border-line bg-panel p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[0.9rem] font-semibold text-ink">자동화 준비도</h2>
        <span className="font-flow text-[0.7rem] text-ink-soft">추정</span>
      </div>
      <p className="mt-2 font-flow text-3xl font-medium text-signal">
        {pct}
        <span className="text-lg text-ink-soft"> / 100</span>
      </p>
      <div aria-hidden className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-signal" style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}
