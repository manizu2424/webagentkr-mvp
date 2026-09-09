import type { Metadata } from "next";
import { Hero } from "@/components/marketing/hero";
import { Problems } from "@/components/marketing/problems";
import { BeforeAfter } from "@/components/marketing/before-after";
import { Services } from "@/components/marketing/services";
import { Demos } from "@/components/marketing/demos";
import { MidCta, FinalCta } from "@/components/marketing/cta-band";
import { Process } from "@/components/marketing/process";
import { Trust } from "@/components/marketing/trust";
import { Faq } from "@/components/marketing/faq";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_NAME,
  SITE_URL,
  pageMetadata,
} from "@/lib/siteMeta";

export const metadata: Metadata = pageMetadata({ path: "/" });

// Organization + WebSite 구조화 데이터 (검색엔진 지식패널·사이트링크 힌트).
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/icon`,
      description: DEFAULT_DESCRIPTION,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: DEFAULT_TITLE,
      url: `${SITE_URL}/`,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "ko-KR",
    },
  ],
};

export default function Home() {
  return (
    <div className="relative mx-auto max-w-[1120px] px-5 pb-8 sm:px-8 lg:pr-8 lg:pl-16">
      <script
        type="application/ld+json"
        // 정적 상수 직렬화 — 사용자 입력 없음.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
