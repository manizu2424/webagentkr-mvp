// 스택 항목은 "시스템 부품" — 랜딩 flow-diagram 의 노드 박스와 같은 조합(모노 + panel + line).
export function StackCard({ stack }: { stack: string[] }) {
  if (!stack.length) return null;
  return (
    <section className="border-t border-line pt-5">
      <h2 className="text-[0.9rem] font-semibold text-ink">권장 시스템 구성</h2>
      <ul className="mt-3.5 flex flex-wrap gap-2">
        {stack.map((s) => (
          <li
            key={s}
            className="border border-line bg-panel px-3 py-1.5 font-flow text-[0.8rem] tracking-tight text-ink"
          >
            {s}
          </li>
        ))}
      </ul>
    </section>
  );
}
