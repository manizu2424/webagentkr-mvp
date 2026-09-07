export function ChoiceGroup({
  label,
  options,
  value,
  onChange,
  error,
  columns = 2,
}: {
  label: string;
  options: readonly string[];
  value: string | undefined;
  onChange: (v: string) => void;
  error?: string;
  columns?: 1 | 2 | 3;
}) {
  const cols = { 1: "grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" }[columns];
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium text-ink">{label}</legend>
      <div className={`grid gap-2 ${cols}`}>
        {options.map((o) => {
          const active = value === o;
          return (
            <label
              key={o}
              className={`cursor-pointer rounded-md border px-3 py-2.5 text-[0.92rem] transition-colors ${
                active
                  ? "border-signal bg-signal/[0.06] text-ink"
                  : "border-line bg-panel text-ink-soft hover:border-ink-soft"
              }`}
            >
              <input
                type="radio"
                name={label}
                value={o}
                checked={active}
                onChange={() => onChange(o)}
                className="sr-only"
              />
              {o}
            </label>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </fieldset>
  );
}
