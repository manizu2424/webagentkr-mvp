import Link from "next/link";
import { CtaLink } from "@/components/marketing/cta-link";
import { NAV_LINKS, PRIMARY_CTA } from "@/components/marketing/nav";

function Wordmark() {
  return (
    <Link
      href="/"
      className="text-[1.15rem] font-extrabold tracking-tight text-ink"
      aria-label="WEBAGENT.KR 홈"
    >
      WEBAGENT<span className="text-ink-soft">.KR</span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-5 sm:px-8">
        <Wordmark />

        {/* sm 이상: 인라인 네비 */}
        <nav className="hidden items-center gap-7 sm:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-ink-soft transition-colors hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
          <CtaLink href={PRIMARY_CTA.href} className="px-4 py-2 text-sm">
            {PRIMARY_CTA.label}
          </CtaLink>
        </nav>

        {/* sm 미만: 네이티브 disclosure (클라이언트 JS 없음) */}
        <details className="relative sm:hidden">
          <summary
            className="flex size-9 cursor-pointer list-none items-center justify-center rounded-md border border-line text-ink [&::-webkit-details-marker]:hidden"
            aria-label="메뉴 열기"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path
                d="M2 4.5h14M2 9h14M2 13.5h14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </summary>
          <div className="absolute right-0 top-11 w-52 rounded-md border border-line bg-panel p-2 shadow-[0_8px_24px_-12px_rgba(22,41,43,0.25)]">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="block rounded px-3 py-2 text-sm text-ink-soft hover:bg-paper hover:text-ink"
              >
                {l.label}
              </Link>
            ))}
            <CtaLink
              href={PRIMARY_CTA.href}
              className="mt-1 w-full px-3 py-2 text-sm"
            >
              {PRIMARY_CTA.label}
            </CtaLink>
          </div>
        </details>
      </div>
    </header>
  );
}
