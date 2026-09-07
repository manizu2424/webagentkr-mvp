import Link from "next/link";

export function ConsentCheckbox({
  checked,
  onChange,
  error,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-[0.92rem] leading-relaxed text-ink">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 size-[18px] shrink-0 accent-[var(--wak-signal)]"
        />
        <span>
          <Link
            href="/privacy"
            target="_blank"
            onClick={(e) => e.stopPropagation()}
            className="underline decoration-line decoration-1 underline-offset-[4px] transition-colors hover:text-signal hover:decoration-signal motion-reduce:transition-none"
          >
            개인정보 수집·이용
          </Link>
          에 동의합니다. (필수)
        </span>
      </label>
      {error && (
        <p className="text-[0.8rem] font-medium text-danger">{error}</p>
      )}
    </div>
  );
}
