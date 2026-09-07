export function StepsCard({ steps }: { steps: string[] }) {
  if (!steps.length) return null;
  return (
    <section className="border border-line bg-panel p-5">
      <h2 className="text-[0.9rem] font-semibold text-ink">권장 구축 단계</h2>
      <ol className="mt-3 flex flex-col gap-2">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2.5 text-[0.9rem] leading-relaxed text-ink">
            <span className="font-flow text-[0.8rem] text-signal">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
