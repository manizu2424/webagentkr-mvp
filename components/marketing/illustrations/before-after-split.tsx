import { Fragment } from "react";
import { ArrowRight } from "lucide-react";

// 대비 일러스트: "사람이 반복 → 자동화 후". 표 위에 얹는 시각 요약.
// 상위 3행만 시각화 — 나머지는 아래 상세 표가 담당. RSC, 클라이언트 JS 없음.
export function BeforeAfterSplit({
  rows,
}: {
  rows: readonly { task: string; before: string; after: string }[];
}) {
  const visible = rows.slice(0, 3);

  return (
    <div
      role="img"
      aria-label="업무별 기존 방식 대 자동화 후 비교"
      className="grid max-w-[46rem] gap-x-4 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-stretch"
    >
      {visible.map((row) => (
        <Fragment key={row.task}>
          <div className="rounded-lg border border-line bg-panel p-4">
            <p className="text-[0.9rem] font-medium text-ink">{row.task}</p>
            <p className="mt-1 text-[0.85rem] text-ink-soft">{row.before}</p>
          </div>
          <div className="flex rotate-90 items-center justify-center py-1 sm:rotate-0 sm:py-0">
            <ArrowRight
              size={20}
              strokeWidth={1.75}
              aria-hidden
              className="text-ink-soft"
            />
          </div>
          <div className="rounded-lg border border-resolved/30 bg-[rgb(12_139_119_/_0.06)] p-4">
            <p className="font-flow text-[0.7rem] tracking-[0.04em] text-resolved/80">
              자동화 후
            </p>
            <p className="mt-1 text-[0.9rem] font-medium text-resolved">
              {row.after}
            </p>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
