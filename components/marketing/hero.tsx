import { CtaLink } from "@/components/marketing/cta-link";
import { HeroFlow } from "@/components/marketing/illustrations/hero-flow";
import { GridTexture } from "@/components/marketing/illustrations/grid-texture";
import { HERO } from "@/content/marketing";

// 딥 잉크 히어로 — .wak-on-deep 스코프라 내부의 text-ink / border-line / text-signal 이 자동으로 어두운 배경용 값이 된다.
export function Hero() {
  return (
    <section className="wak-on-deep relative w-full overflow-hidden bg-deep">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(640px_300px_at_78%_35%,rgb(59_91_255/0.30),transparent_70%)]"
      />
      <GridTexture className="pointer-events-none absolute inset-0 text-ink opacity-[0.07]" />
      <div className="relative mx-auto grid max-w-[1120px] items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16 lg:py-24">
        <div>
          <p className="font-flow text-[0.75rem] tracking-[0.14em] text-resolved">
            WEBAGENT.KR
          </p>
          <h1 className="mt-4 text-[2.4rem] leading-[1.15] font-extrabold tracking-tight text-balance text-ink sm:text-[3.1rem]">
            {HERO.headline.map((l, i) => (
              <span key={i} className="block">
                {l}
              </span>
            ))}
          </h1>
          <p className="mt-6 max-w-[34rem] text-[1.05rem] leading-[1.75] text-ink-soft">
            {HERO.sub}
          </p>
          <ul className="mt-7 flex flex-wrap gap-2">
            {HERO.facts.map((f) => (
              <li
                key={f}
                className="rounded-full border border-line px-3 py-1 text-[0.78rem] text-ink-soft"
              >
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
            <CtaLink href="/diagnosis">무료 진단 시작</CtaLink>
            <CtaLink href="/#demos" variant="ghost">
              자동화 데모 보기
            </CtaLink>
          </div>
        </div>
        <HeroFlow />
      </div>
    </section>
  );
}
