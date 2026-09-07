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
      <legend className="mb-2 text-[0.9rem] font-semibold text-ink">
        {label}
      </legend>
      <div className={`grid gap-2.5 ${cols}`}>
        {options.map((o) => {
          const active = value === o;
          return (
            <label
              key={o}
              className={`flex min-h-11 cursor-pointer items-center border px-3.5 py-2.5 text-[0.92rem] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-signal motion-reduce:transition-none ${
                active
                  ? "border-signal bg-signal/[0.07] font-medium text-ink"
                  : "border-line text-ink-soft hover:border-ink-soft hover:bg-panel hover:text-ink"
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
      {error && (
        <p className="text-[0.8rem] font-medium text-danger">{error}</p>
      )}
    </fieldset>
  );
}
