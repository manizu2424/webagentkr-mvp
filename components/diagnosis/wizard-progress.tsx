const LABELS = ["회사", "도구", "업무", "업무량", "상담"] as const;

// 랜딩 히어로 파이프라인과 같은 시각 언어 — 헤어라인 커넥터 위의 마름모 노드.
// 신호가 지나온 구간은 resolved, 현재 노드는 signal, 앞은 line.
export function WizardProgress({ step }: { step: number }) {
  return (
    <ol className="flex items-start" aria-label={`5단계 중 ${step}단계`}>
      {LABELS.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const current = n === step;
        return (
          <li key={label} className="flex flex-1 flex-col items-center gap-2.5">
            <span
              aria-hidden
              className="relative flex h-3 w-full items-center justify-center"
            >
              {/* 노드로 들어오는 구간 */}
              <span
                className={`absolute top-1/2 left-0 h-px w-1/2 ${i === 0 ? "hidden" : ""} ${
                  n <= step ? "bg-resolved" : "bg-line"
                }`}
              />
              {/* 노드에서 나가는 구간 */}
              <span
                className={`absolute top-1/2 right-0 h-px w-1/2 ${i === LABELS.length - 1 ? "hidden" : ""} ${
                  done ? "bg-resolved" : "bg-line"
                }`}
              />
              <span
                className={`relative rotate-45 border ${
                  current
                    ? "size-3 border-signal bg-signal ring-4 ring-signal/15"
                    : done
                      ? "size-2.5 border-resolved bg-resolved"
                      : "size-2.5 border-line bg-paper"
                }`}
              />
            </span>
            <span
              className={`text-[0.72rem] sm:text-[0.8rem] ${
                current ? "font-semibold text-ink" : "text-ink-soft"
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
