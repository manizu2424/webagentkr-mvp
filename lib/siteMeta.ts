import type { Metadata } from "next";

/**
 * SEO 메타데이터 단일 소스 (task.md 4.4). 페이지는 `pageMetadata()` 로 canonical·OG·twitter
 * 보일러플레이트를 한 줄에 얻는다. 절대 URL 은 전부 `SITE_URL` 기준.
 */

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://webagent.kr"
).replace(/\/+$/, "");

export const SITE_NAME = "WEBAGENT.KR";
export const TITLE_TEMPLATE = "%s · WEBAGENT.KR";
export const DEFAULT_TITLE = "WEBAGENT.KR — AI로 일하는 회사를 만듭니다";
export const DEFAULT_DESCRIPTION =
  "중소기업 반복 업무를 AI가 분석해 자동화 가능성을 진단하고 맞춤 결과를 보여드립니다.";

/** `app/opengraph-image.tsx` 가 생성하는 이미지. 파일 컨벤션 자동 병합에 기대지 않고 명시한다. */
export const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: DEFAULT_TITLE,
};

type PageMetaInput = {
  /** 페이지 고유 제목. 루트 레이아웃의 template 이 " · WEBAGENT.KR" 를 붙인다. 생략 시 기본 제목. */
  title?: string;
  description?: string;
  /** "/diagnosis" 같은 사이트 절대 경로. canonical·og:url 에 쓰인다. */
  path: string;
  /** false 면 noindex,nofollow (per-user 결과·스텁·관리자). */
  index?: boolean;
};

export function pageMetadata({
  title,
  description,
  path,
  index = true,
}: PageMetaInput): Metadata {
  const url = SITE_URL + path;
  const desc = description ?? DEFAULT_DESCRIPTION;
  const ogTitle = title ? `${title} · ${SITE_NAME}` : DEFAULT_TITLE;
  return {
    // title 을 넘기지 않으면 루트 레이아웃의 title.default 가 그대로 쓰인다.
    ...(title ? { title } : {}),
    description: desc,
    alternates: { canonical: path },
    ...(index ? {} : { robots: { index: false, follow: false } }),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "ko_KR",
      url,
      title: ogTitle,
      description: desc,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: desc,
      images: [OG_IMAGE.url],
    },
  };
}
