import type { PriorityTask } from "@/lib/diagnosisResult";

// 난이도는 라벨 텍스트가 뜻을 전부 전달하고, 색은 마름모(그래픽)에만 싣는다.
// resolved 는 paper 대비 3.9:1 이라 본문 색으로 쓰지 않는다(그래픽 3:1 기준은 충족).
const DIFF_DOT: Record<PriorityTask["difficulty"], string> = {
  낮음: "bg-resolved",
  중간: "bg-signal",
  높음: "bg-danger",
};

export function PriorityTasksCard({ tasks }: { tasks: PriorityTask[] }) {
  return (
    <section className="border-t border-line pt-5">
      <h2 className="text-[0.9rem] font-semibold text-ink">우선 추천 업무</h2>
      <ol className="mt-3 flex flex-col">
        {tasks.map((t, i) => (
          <li
            key={i}
            className="border-t border-line/60 py-4 first:border-t-0 first:pt-1 last:pb-0"
          >
            <div className="flex items-baseline gap-2.5">
              <span className="font-flow text-[0.72rem] text-ink-soft">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[1rem] leading-snug font-bold text-ink">
                {t.name}
              </span>
            </div>
            <p className="mt-2 text-[0.88rem] leading-[1.75] text-ink-soft">
              {t.reason}
            </p>
            <p className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 font-flow text-[0.72rem] text-ink-soft">
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className={`size-[6px] rotate-45 ${DIFF_DOT[t.difficulty]}`}
                />
                난이도 {t.difficulty}
              </span>
              <span>월 약 {t.estimatedMonthlySavedHours}시간 절감(추정)</span>
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
