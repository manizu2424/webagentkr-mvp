import type { PriorityTask } from "@/lib/diagnosisResult";

const DIFF_STYLE: Record<PriorityTask["difficulty"], string> = {
  낮음: "border-resolved text-resolved",
  중간: "border-signal text-signal",
  높음: "border-danger text-danger",
};

export function PriorityTasksCard({ tasks }: { tasks: PriorityTask[] }) {
  return (
    <section className="border border-line bg-panel p-5">
      <h2 className="text-[0.9rem] font-semibold text-ink">우선 추천 업무</h2>
      <ol className="mt-3 flex flex-col gap-4">
        {tasks.map((t, i) => (
          <li key={i} className="border-l-2 border-line pl-3">
            <div className="flex items-center gap-2">
              <span className="font-flow text-[0.75rem] text-ink-soft">{i + 1}</span>
              <span className="text-[0.95rem] font-medium text-ink">{t.name}</span>
              <span
                className={`ml-auto shrink-0 border px-1.5 py-0.5 text-[0.7rem] ${DIFF_STYLE[t.difficulty]}`}
              >
                {t.difficulty}
              </span>
            </div>
            <p className="mt-1 text-[0.85rem] leading-relaxed text-ink-soft">{t.reason}</p>
            <p className="mt-1 font-flow text-[0.75rem] text-ink-soft">
              월 약 {t.estimatedMonthlySavedHours}시간 절감(추정)
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
