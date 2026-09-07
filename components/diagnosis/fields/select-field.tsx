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
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <select
        id={id}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className="rounded-md border border-line bg-panel px-3 py-2.5 text-[0.95rem] text-ink outline-none focus-visible:border-signal focus-visible:ring-2 focus-visible:ring-signal/30 aria-[invalid=true]:border-red-500"
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
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
