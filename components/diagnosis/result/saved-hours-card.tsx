export function SavedHoursCard({ hours }: { hours: { min: number; max: number } }) {
  return (
    <section className="border border-line bg-panel p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[0.9rem] font-semibold text-ink">예상 절감 시간</h2>
        <span className="font-flow text-[0.7rem] text-ink-soft">추정</span>
      </div>
      <p className="mt-2 text-[0.95rem] text-ink">
        월{" "}
        <span className="font-flow text-2xl font-medium text-signal">
          {hours.min}~{hours.max}
        </span>{" "}
        시간
      </p>
      <p className="mt-1 text-[0.8rem] text-ink-soft">
        우선 추천 업무를 모두 자동화했을 때 기준입니다.
      </p>
    </section>
  );
}
