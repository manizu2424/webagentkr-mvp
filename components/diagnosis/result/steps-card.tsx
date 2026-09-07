// 실제 순서가 있는 유일한 목록 → 랜딩 flow-diagram·wizard-progress 와 같은 파이프라인으로 그린다.
// 헤어라인 커넥터 위의 마름모 노드가 순서를 나타내므로 별도 번호는 붙이지 않는다
// (문구 자체가 "1주차:"처럼 차수를 담고 있어 이중 번호가 된다). 순서 의미는 <ol> 이 유지한다.
export function StepsCard({ steps }: { steps: string[] }) {
  if (!steps.length) return null;
  return (
    <section className="border-t border-line pt-5">
      <h2 className="text-[0.9rem] font-semibold text-ink">권장 구축 단계</h2>
      <div className="relative mt-4 pl-6">
        <span
          aria-hidden
          className="absolute top-[0.6rem] bottom-[0.6rem] left-[3px] w-px bg-line"
        />
        <ol className="flex flex-col gap-3.5">
          {steps.map((s, i) => (
            <li
              key={i}
              className="relative text-[0.92rem] leading-[1.7] text-ink"
            >
              <span
                aria-hidden
                className={`absolute top-[0.85em] -left-[calc(1.5rem-1px)] size-[7px] -translate-y-1/2 rotate-45 ${
                  i === steps.length - 1 ? "bg-resolved" : "bg-signal"
                }`}
              />
              {s}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
