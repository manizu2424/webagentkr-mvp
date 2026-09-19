import { CtaLink } from "@/components/marketing/cta-link";
import { FINAL_CTA } from "@/content/marketing";

// 마지막 CTA — 히어로와 짝을 이루는 딥 잉크 밴드. (중간 CTA 는 없앴다.)
export function FinalCta() {
  return (
    <section className="wak-on-deep relative w-full overflow-hidden bg-deep">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(560px_260px_at_18%_100%,rgb(12_139_119/0.30),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-[1120px] px-5 py-20 sm:px-8 lg:py-24">
        <h2 className="max-w-[30rem] text-[1.8rem] leading-tight font-extrabold tracking-tight text-balance text-ink sm:text-[2.2rem]">
          {FINAL_CTA.heading}
        </h2>
        <p className="mt-4 max-w-[32rem] text-[1rem] leading-[1.75] text-ink-soft">
          {FINAL_CTA.body}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <CtaLink href="/diagnosis">{FINAL_CTA.button}</CtaLink>
          <span className="text-[0.85rem] text-ink-soft">{FINAL_CTA.note}</span>
        </div>
      </div>
    </section>
  );
}
