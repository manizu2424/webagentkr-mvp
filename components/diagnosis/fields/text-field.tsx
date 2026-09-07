import { useId } from "react";

export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  type = "text",
  placeholder,
  maxLength,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  type?: string;
  placeholder?: string;
  maxLength?: number;
  inputMode?: "text" | "email" | "tel";
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.9rem] font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className="min-h-11 w-full border border-line bg-panel px-3.5 py-2.5 text-[0.95rem] text-ink transition-colors outline-none placeholder:text-ink-soft focus-visible:border-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-signal motion-reduce:transition-none aria-[invalid=true]:border-danger"
      />
      {hint && !error && <p className="text-[0.8rem] text-ink-soft">{hint}</p>}
      {error && (
        <p className="text-[0.8rem] font-medium text-danger">{error}</p>
      )}
    </div>
  );
}
