import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteMeta";

/**
 * 색인 대상 공개 라우트만. 제외: 스텁(`/about`·`/cases` — Phase 4.2), per-user 결과
 * (`/diagnosis/[id]`), 관리자(`/admin/*`), API. `/cases` 는 4.2 구현 후 추가한다.
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
      url: `${SITE_URL}/consultation`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
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
