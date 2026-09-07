export function SummaryCard({ summary }: { summary: string }) {
  return (
    <section className="border border-line bg-panel p-5">
      <h2 className="text-[0.9rem] font-semibold text-ink">종합 요약</h2>
      <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">{summary}</p>
    </section>
  );
}
