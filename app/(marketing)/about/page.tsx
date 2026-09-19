import type { Metadata } from "next";
import { CtaLink } from "@/components/marketing/cta-link";
import { SectionBand } from "@/components/marketing/section-band";
import { ABOUT } from "@/content/marketing";
import { pageMetadata } from "@/lib/siteMeta";

export const metadata: Metadata = pageMetadata({
  title: "회사소개",
  description:
    "WEBAGENT.KR은 중소기업의 반복 업무를 AI와 자동화로 대신하도록 돕는 곳이에요.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <>
      <SectionBand surface="paper" eyebrow="회사소개" heading="반복 업무는 AI에게, 판단은 사람에게" headingAs="h1">
        <p className="text-[1.02rem] leading-[1.85] text-ink">{ABOUT.mission}</p>
      </SectionBand>

      <SectionBand surface="tint" eyebrow="원칙" heading="이렇게 하지 않아요">
        <ul className="flex flex-col gap-3">
          {ABOUT.notDoing.map((line) => (
            <li
              key={line}
              className="rounded-lg border border-line bg-panel p-4 text-[0.98rem] leading-[1.75] text-ink"
            >
              {line}
            </li>
          ))}
        </ul>
      </SectionBand>

      <SectionBand surface="paper" eyebrow="운영" heading="기술과 운영 방식">
        <p className="text-[1rem] leading-[1.85] text-ink">{ABOUT.stack}</p>
        <p className="mt-4 text-[1rem] leading-[1.85] text-ink-soft">{ABOUT.solo}</p>
        <div className="mt-8">
          <CtaLink href="/diagnosis">무료 진단 시작</CtaLink>
        </div>
      </SectionBand>
    </>
  );
}
