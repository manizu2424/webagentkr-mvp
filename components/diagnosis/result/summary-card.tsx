// 페이지에서 가장 긴 읽을거리 = 결론. 본문은 ink 로 두어 가독성을 최우선에 둔다.
export function SummaryCard({ summary }: { summary: string }) {
  return (
    <section className="border-t border-line pt-5">
      <h2 className="text-[0.9rem] font-semibold text-ink">종합 요약</h2>
      <p className="mt-3 max-w-[34rem] text-[0.95rem] leading-[1.85] text-ink">
        {summary}
      </p>
    </section>
  );
}
