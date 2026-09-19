import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteMeta";
import { CASES_ENABLED } from "@/lib/features";

/**
 * 색인 대상 공개 라우트만. 제외: per-user 결과(/diagnosis/[id]), 관리자(/admin/*), API. /cases 는 CASES_ENABLED 가 켜졌을 때만 포함된다.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    {
      url: `${SITE_URL}/diagnosis`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/consultation`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    ...(CASES_ENABLED
      ? [
          {
            url: `${SITE_URL}/cases`,
            lastModified: now,
            changeFrequency: "monthly" as const,
            priority: 0.7,
          },
        ]
      : []),
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
