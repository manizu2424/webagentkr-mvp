import { CtaLink } from "@/components/marketing/cta-link";
import { FlowDiagram } from "@/components/marketing/flow-diagram";

export function Hero() {
  return (
    <section className="grid items-center gap-10 py-14 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-20 lg:py-20">
      <div>
        <h1 className="text-[2.4rem] leading-[1.15] font-extrabold tracking-tight text-ink sm:text-[3rem]">
          AI가 직원처럼
          <br />
          일하는 회사
        </h1>
        <p className="mt-6 max-w-[34rem] text-[1.05rem] leading-[1.75] text-ink-soft">
          고객 문의, 견적, 보고서, 콘텐츠 제작까지 반복 업무를 AI와 n8n으로
          연결하고 자동화합니다.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
          <CtaLink href="/diagnosis">무료 자동화 진단</CtaLink>
          <CtaLink href="/cases" variant="ghost">
            자동화 사례 보기
          </CtaLink>
        </div>
        <p className="mt-9 text-sm text-ink-soft">AI로 일하는 회사를 만듭니다.</p>
      </div>

      <FlowDiagram />
    </section>
  );
}
