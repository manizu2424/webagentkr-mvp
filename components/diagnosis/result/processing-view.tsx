export function ProcessingView() {
  return (
    <div className="mt-8">
      <p className="font-flow text-[0.7rem] text-signal">분석 중</p>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">
        AI가 진단 결과를 만들고 있습니다
      </h1>
      <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">
        보통 1~2분이면 끝납니다. 이 페이지에서 그대로 기다려 주세요. 결과는 AI가 계산한 추정치입니다.
      </p>
      <div aria-hidden className="mt-8 h-px w-full overflow-hidden bg-line">
        <div className="h-full w-1/3 animate-pulse bg-signal" />
      </div>
    </div>
  );
}
