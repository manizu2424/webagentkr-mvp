import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-3 px-5 py-8 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>
          <span className="font-semibold text-ink">WEBAGENT.KR</span>
          <span className="mx-2 text-line">·</span>
          AI로 일하는 회사를 만듭니다.
        </p>
        <nav className="flex items-center gap-5">
          <Link href="/privacy" className="hover:text-ink">
            개인정보처리방침
          </Link>
          <Link href="/terms" className="hover:text-ink">
            이용약관
          </Link>
        </nav>
      </div>
      {/* TODO: 사업자등록번호 · 상호 · 대표자 · 주소 · 연락처 (전자상거래법 표기 의무) */}
    </footer>
  );
}
