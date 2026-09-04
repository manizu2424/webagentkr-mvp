// 마케팅 네비게이션 링크. 블로그는 콘텐츠가 없어 제외(Phase 4).
// 대상 라우트 일부는 아직 스텁 — 다음 라운드에 채운다.
export const NAV_LINKS = [
  { href: "/diagnosis", label: "무료 진단" },
  { href: "/cases", label: "자동화 사례" },
  { href: "/about", label: "회사소개" },
  { href: "/consultation", label: "상담 신청" },
] as const;

export const PRIMARY_CTA = { href: "/diagnosis", label: "무료 자동화 진단" } as const;
