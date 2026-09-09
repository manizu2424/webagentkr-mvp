import { SectionBand } from "@/components/marketing/section-band";
import { Icon } from "@/components/marketing/icons";
import { SERVICES } from "@/content/marketing";

// 서비스는 항상 정확히 5종 (절대원칙 §2). 재분류·통합·번호 금지. SERVICES 배열 순서 그대로.
export function Services() {
  return (
    <SectionBand surface="paper" eyebrow="서비스" heading="다섯 가지 서비스" wide>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s) => (
          <article
            key={s.name}
            className="rounded-lg border border-line bg-panel p-5 shadow-[var(--wak-shadow-card)]"
          >
            <Icon name={s.icon} />
            <p className="mt-3 font-flow text-[0.95rem] tracking-tight text-ink">
              {s.name}
            </p>
            <p className="mt-2 text-[0.92rem] leading-relaxed text-ink-soft">
              {s.desc}
            </p>
          </article>
        ))}
      </div>
    </SectionBand>
  );
}
