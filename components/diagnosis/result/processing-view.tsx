// 대기 화면도 랜딩 히어로·폼 진행 표시와 같은 시각 언어 — 헤어라인 커넥터 위를 신호가 지난다.
// prefers-reduced-motion 에서는 .wak-scan 애니메이션이 걸리지 않고(globals.css 미디어 쿼리),
// motion-reduce:animate-none 으로 한 번 더 막아 정지 상태로 남는다.
export function ProcessingView() {
  return (
    <div className="mt-8">
      <div className="border-t-2 border-ink pt-3">
        <p className="font-flow text-[0.7rem] text-signal">분석 중</p>
        <h1 className="mt-1.5 text-[1.5rem] leading-tight font-extrabold tracking-tight text-ink sm:text-[1.75rem]">
          AI가 진단 결과를 만들고 있습니다
        </h1>
      </div>
      <p className="mt-5 max-w-[34rem] text-[0.95rem] leading-[1.75] text-ink-soft">
        보통 1~2분이면 끝납니다. 이 페이지에서 그대로 기다려 주세요. 결과는 AI가 계산한 추정치입니다.
      </p>
      <div aria-hidden className="relative mt-10 flex h-3 items-center">
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 overflow-hidden bg-line">
          <span className="wak-scan absolute inset-y-0 left-0 w-1/4 bg-signal motion-reduce:animate-none" />
        </span>
        <span className="relative size-2.5 rotate-45 bg-signal ring-4 ring-paper" />
        <span className="relative mx-auto size-2.5 rotate-45 border border-line bg-paper" />
        <span className="relative size-2.5 rotate-45 border border-line bg-paper" />
      </div>
    </div>
  );
}
