import { Hero } from "@/components/marketing/hero";
import { Problems } from "@/components/marketing/problems";
import { BeforeAfter } from "@/components/marketing/before-after";
import { Services } from "@/components/marketing/services";
import { Demos } from "@/components/marketing/demos";
import { MidCta, FinalCta } from "@/components/marketing/cta-band";
import { Process } from "@/components/marketing/process";
import { Trust } from "@/components/marketing/trust";
import { Faq } from "@/components/marketing/faq";

export default function Home() {
  return (
    <div className="relative mx-auto max-w-[1120px] px-5 pb-8 sm:px-8 lg:pr-8 lg:pl-16">
      {/* 커넥터 스파인 — 페이지 전체를 관통하는 워크플로 백본 (lg 이상) */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-8 hidden w-px bg-line lg:block"
      />

      <Hero />
      <Problems />
      <BeforeAfter />
      <Services />
      <Demos />
      <MidCta />
      <Process />
      <Trust />
      <Faq />
      <FinalCta />
    </div>
  );
}
