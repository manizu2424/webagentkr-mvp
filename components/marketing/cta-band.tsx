import { CtaLink } from "@/components/marketing/cta-link";

// 중간 넛지(plain) — 페이지 흐름을 끊지 않는 조용한 밴드.
export function MidCta() {
  return (
    <section className="relative border-y border-line py-12">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[1.1rem] font-semibold text-ink">
          3분이면 우리 회사의 자동화 여지를 확인할 수 있습니다.
        </p>
        <CtaLink href="/diagnosis">무료 자동화 진단</CtaLink>
      </div>
    </section>
  );
}

// 최종 클로즈(solid) — 스파인이 끝나는 "출력" 노드.
export function FinalCta() {
  return (
    <section className="relative py-12 lg:py-16">
      <span
        aria-hidden
        className="absolute top-[2.6rem] -left-[2.4rem] hidden size-3 -translate-x-px rotate-45 bg-signal ring-4 ring-paper lg:block"
      />
      <div className="bg-ink px-6 py-14 text-paper sm:px-12">
        <p className="text-[1.5rem] font-extrabold tracking-tight sm:text-[1.8rem]">
          AI로 일하는 회사를 만듭니다.
        </p>
        <p className="mt-3 max-w-[32rem] text-[0.98rem] leading-relaxed text-paper/70">
          무료 진단은 회사·업무 정보를 입력하면 AI가 자동화 여지를 분석해 드립니다.
          결과는 추정치이며, 상담으로 이어집니다.
        </p>
        <div className="mt-8">
          <CtaLink
            href="/diagnosis"
            className="bg-paper text-ink hover:bg-white"
          >
            무료 자동화 진단
          </CtaLink>
        </div>
      </div>
    </section>
  );
}
