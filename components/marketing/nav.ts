import { withCasesGate } from "@/lib/features";

// 마케팅 네비게이션 링크. 블로그는 콘텐츠가 없어 제외(Phase 4).
// 자동화 사례는 CASES_ENABLED 가 켜졌을 때만 노출된다(lib/features.ts).
export const NAV_LINKS = withCasesGate([
  { href: "/diagnosis", label: "무료 진단" },
  { href: "/cases", label: "자동화 사례" },
  { href: "/about", label: "회사소개" },
  { href: "/consultation", label: "상담 신청" },
]);

export const PRIMARY_CTA = { href: "/diagnosis", label: "무료 자동화 진단" } as const;
