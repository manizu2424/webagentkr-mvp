import { SectionBand } from "@/components/marketing/section-band";
import { DEMOS, SECTIONS } from "@/content/marketing";

// 실제 고객이 없는 데모는 반드시 "자동화 데모"로 표시 (절대원칙 §3).
export function Demos() {
  const s = SECTIONS.demos;
  return (
    <SectionBand id="demos" surface="paper" eyebrow={s.eyebrow} heading={s.heading} lead={s.lead} wide>
      <div className="grid gap-6 lg:grid-cols-3">
        {DEMOS.map((demo) => (
          <article
            key={demo.title}
            className="flex flex-col rounded-lg border border-line bg-panel p-6 shadow-[var(--wak-shadow-card)]"
          >
            <span className="self-start rounded-sm border border-signal px-2 py-0.5 text-[0.7rem] font-medium tracking-wide text-signal">
              자동화 데모
            </span>
            <h3 className="mt-3 text-[1.15rem] font-bold text-ink">{demo.title}</h3>

            <ol className="mt-5 flex flex-col gap-2.5">
              {demo.steps.map((step, i) => (
                <li key={step} className="flex items-baseline gap-2.5">
                  <span className="font-flow text-[0.68rem] text-signal">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[0.95rem] text-ink">{step}</span>
                </li>
              ))}
            </ol>

            <p className="mt-6 border-t border-line pt-4 text-[0.92rem] font-medium text-resolved">
              기대 효과 · {demo.effect}
            </p>
            {"note" in demo && demo.note && (
              <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-soft">{demo.note}</p>
            )}
          </article>
        ))}
      </div>
    </SectionBand>
  );
}
