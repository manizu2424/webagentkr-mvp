export function ErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mt-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">
        결과를 불러오지 못했습니다
      </h1>
      <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">
        일시적인 문제일 수 있습니다. 잠시 후 다시 시도해 주세요.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex min-h-11 items-center rounded-md bg-signal px-5 text-[0.95rem] font-medium text-white transition-colors hover:bg-[#182fc0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal motion-reduce:transition-none"
      >
        다시 시도
      </button>
    </div>
  );
}
