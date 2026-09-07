export function StackCard({ stack }: { stack: string[] }) {
  if (!stack.length) return null;
  return (
    <section className="border border-line bg-panel p-5">
      <h2 className="text-[0.9rem] font-semibold text-ink">권장 시스템 구성</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {stack.map((s) => (
          <li key={s} className="border border-line px-2.5 py-1 font-flow text-[0.8rem] text-ink">
            {s}
          </li>
        ))}
      </ul>
    </section>
  );
}
