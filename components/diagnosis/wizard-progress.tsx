const LABELS = ["회사", "도구", "업무", "업무량", "상담"] as const;

export function WizardProgress({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label={`5단계 중 ${step}단계`}>
      {LABELS.map((label, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "current" : "todo";
        return (
          <li key={label} className="flex flex-1 flex-col items-center gap-1.5">
            <span
              className={`h-1 w-full rounded-full ${
                state === "done"
                  ? "bg-resolved"
                  : state === "current"
                    ? "bg-signal"
                    : "bg-line"
              }`}
            />
            <span
              className={`font-flow text-[0.68rem] ${
                state === "current" ? "text-ink" : "text-ink-soft"
              }`}
            >
              {String(n).padStart(2, "0")} {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
