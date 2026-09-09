"use client";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-[960px] px-5 py-16 text-center">
      <p className="text-[0.95rem] text-ink">화면을 불러오는 중 문제가 발생했습니다.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 min-h-9 rounded-md border border-line px-4 text-[0.85rem] text-ink-soft transition-colors hover:bg-panel hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal motion-reduce:transition-none"
      >
        다시 시도
      </button>
    </div>
  );
}
