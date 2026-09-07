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
      <legend className="mb-2 text-[0.9rem] font-semibold text-ink">
        {label} <span className="font-normal text-ink-soft">(복수 선택)</span>
      </legend>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((o) => {
          const active = value.includes(o);
          return (
            <label
              key={o}
              className={`flex min-h-11 cursor-pointer items-center gap-2.5 border px-3.5 py-2.5 text-[0.92rem] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-signal motion-reduce:transition-none ${
                active
                  ? "border-signal bg-signal/[0.07] font-medium text-ink"
                  : "border-line text-ink-soft hover:border-ink-soft hover:bg-panel hover:text-ink"
              }`}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggle(o)}
                className="size-[18px] shrink-0 accent-[var(--wak-signal)] outline-none"
              />
              {o}
            </label>
          );
        })}
      </div>
      {error && (
        <p className="text-[0.8rem] font-medium text-danger">{error}</p>
      )}
    </fieldset>
  );
}
