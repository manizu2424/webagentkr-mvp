// 점수 다음가는 수치. 파랑은 점수 하나에만 쓰고 여기는 ink — 강조점은 한 곳에만.
export function SavedHoursCard({ hours }: { hours: { min: number; max: number } }) {
  return (
    <section className="border-t border-line pt-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[0.9rem] font-semibold text-ink">예상 절감 시간</h2>
        <span className="font-flow text-[0.7rem] text-ink-soft">추정</span>
      </div>
      <p className="mt-2.5 flex items-baseline gap-2">
        <span className="text-[0.95rem] text-ink-soft">월</span>
        <span className="font-flow text-[1.9rem] leading-none font-medium tracking-tight text-ink">
          {hours.min}~{hours.max}
        </span>
        <span className="text-[0.95rem] text-ink-soft">시간</span>
      </p>
      <p className="mt-3 text-[0.85rem] leading-relaxed text-ink-soft">
        우선 추천 업무를 모두 자동화했을 때 기준입니다.
      </p>
    </section>
  );
}
