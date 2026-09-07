export function MultiSelect({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  const toggle = (o: string) =>
    onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium text-ink">
        {label} <span className="text-ink-soft">(복수 선택)</span>
      </legend>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((o) => {
          const active = value.includes(o);
          return (
            <label
              key={o}
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-[0.92rem] transition-colors ${
                active
                  ? "border-signal bg-signal/[0.06] text-ink"
                  : "border-line bg-panel text-ink-soft hover:border-ink-soft"
              }`}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggle(o)}
                className="size-4 accent-[var(--wak-signal)]"
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
