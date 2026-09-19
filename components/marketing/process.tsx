import { ArrowRight } from "lucide-react";
import { SectionBand } from "@/components/marketing/section-band";
import { Icon } from "@/components/marketing/icons";
import { PROCESS, SECTIONS } from "@/content/marketing";

// 진행 방식 — 진짜 순서라 번호 사용. 3단계 (진단 → 제안 → 구축).
export function Process() {
  const s = SECTIONS.process;
  return (
    <SectionBand surface="panel" eyebrow={s.eyebrow} heading={s.heading} lead={s.lead} wide>
      <ol className="grid gap-6 md:grid-cols-3">
        {PROCESS.map((p, i) => (
          <li
            key={p.step}
            className="relative rounded-lg border border-line bg-paper p-6"
          >
            <div className="flex items-center justify-between">
              <span className="font-flow text-[0.8rem] text-signal">
                {String(i + 1).padStart(2, "0")}
              </span>
              <Icon name={p.icon} />
            </div>
            <p className="mt-4 text-[1.1rem] font-bold text-ink">{p.step}</p>
            <p className="mt-2 text-[0.95rem] leading-[1.75] text-ink-soft">{p.desc}</p>
            {i < PROCESS.length - 1 && (
              <ArrowRight
                aria-hidden
                size={18}
                strokeWidth={1.75}
                className="absolute top-1/2 -right-[1.2rem] hidden -translate-y-1/2 text-ink-soft md:block"
              />
            )}
          </li>
        ))}
      </ol>
    </SectionBand>
  );
}
