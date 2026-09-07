import { useId } from "react";

export function SelectField({
  label,
  options,
  value,
  onChange,
  error,
  placeholder = "선택해 주세요",
}: {
  label: string;
  options: readonly string[];
  value: string | undefined;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.9rem] font-semibold text-ink">
        {label}
      </label>
      <select
        id={id}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className="min-h-11 w-full border border-line bg-panel px-3.5 py-2.5 text-[0.95rem] text-ink transition-colors outline-none focus-visible:border-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-signal motion-reduce:transition-none aria-[invalid=true]:border-danger"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-[0.8rem] font-medium text-danger">{error}</p>
      )}
    </div>
  );
}
