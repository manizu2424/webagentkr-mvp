import { SectionBand } from "@/components/marketing/section-band";
import { Icon } from "@/components/marketing/icons";
import { SECTIONS, SERVICES } from "@/content/marketing";

// 서비스는 항상 정확히 5종 (절대원칙 §2). 재분류·통합·번호 금지. SERVICES 배열 순서 그대로.
export function Services() {
  const s = SECTIONS.services;
  return (
    <SectionBand surface="paper" eyebrow={s.eyebrow} heading={s.heading} lead={s.lead} wide>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((svc) => (
          <article
            key={svc.name}
            className="rounded-lg border border-line bg-panel p-5 shadow-[var(--wak-shadow-card)]"
          >
            <Icon name={svc.icon} />
            <p className="mt-3 font-flow text-[0.95rem] tracking-tight text-ink">{svc.name}</p>
            <p className="mt-2 text-[0.95rem] leading-[1.7] text-ink-soft">{svc.desc}</p>
          </article>
        ))}
      </div>
    </SectionBand>
  );
}
