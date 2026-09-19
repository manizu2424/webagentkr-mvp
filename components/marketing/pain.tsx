import { ArrowRight } from "lucide-react";
import { SectionBand } from "@/components/marketing/section-band";
import { Icon } from "@/components/marketing/icons";
import { PAIN, SECTIONS } from "@/content/marketing";

// 고민(지금) → 자동화 후 를 한 카드에 묶는다 (옛 문제 + 비포애프터 통합).
export function Pain() {
  const s = SECTIONS.pain;
  return (
    <SectionBand surface="tint" eyebrow={s.eyebrow} heading={s.heading} lead={s.lead} wide>
      <ul className="grid gap-4 md:grid-cols-2">
        {PAIN.map((row) => (
          <li
            key={row.task}
            className="rounded-lg border border-line bg-panel p-5 shadow-[var(--wak-shadow-card)]"
          >
            <div className="flex items-center gap-2.5">
              <Icon name={row.icon} />
              <p className="text-[1.02rem] font-semibold text-ink">{row.task}</p>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-start sm:gap-3">
              <div>
                <p className="font-flow text-[0.68rem] tracking-[0.04em] text-ink-soft">지금</p>
                <p className="mt-1 text-[0.92rem] text-ink-soft">{row.before}</p>
              </div>
              <ArrowRight
                aria-hidden
                size={18}
                strokeWidth={1.75}
                className="mt-1 rotate-90 self-center text-ink-soft sm:mt-5 sm:rotate-0"
              />
              <div>
                <p className="font-flow text-[0.68rem] tracking-[0.04em] text-resolved">자동화 후</p>
                <p className="mt-1 text-[0.92rem] font-medium text-resolved">{row.after}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </SectionBand>
  );
}
