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
      <label className="flex items-start gap-2.5 text-[0.92rem] text-ink">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 size-4 accent-[var(--wak-signal)]"
        />
        <span>
          <Link
            href="/privacy"
            target="_blank"
            className="underline decoration-line underline-offset-2 hover:decoration-signal"
          >
            개인정보 수집·이용
          </Link>
          에 동의합니다. (필수)
        </span>
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
