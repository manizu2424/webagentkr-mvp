import type { Metadata } from "next";
import { Hero } from "@/components/marketing/hero";
import { Pain } from "@/components/marketing/pain";
import { Services } from "@/components/marketing/services";
import { Process } from "@/components/marketing/process";
import { Demos } from "@/components/marketing/demos";
import { Faq } from "@/components/marketing/faq";
import { FinalCta } from "@/components/marketing/cta-band";
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

// 7섹션: 히어로 / 고민 / 서비스 / 진행 방식 / 데모 / FAQ / 마지막 CTA.
// 각 섹션이 전폭 밴드(SectionBand)라 페이지 래퍼·스파인이 없다.
export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        // 정적 상수 직렬화 — 사용자 입력 없음.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <Pain />
      <Services />
      <Process />
      <Demos />
      <Faq />
      <FinalCta />
    </>
  );
}
