import Link from "next/link";
import { Placeholder } from "@/components/marketing/legal/shell";

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

      {/* 전자상거래법·통신판매업 표기 의무. 사업자 정보 확정 후 채운다(묶음 C). */}
      <div className="mx-auto max-w-[1120px] border-t border-line px-5 py-6 text-[0.78rem] leading-[1.9] text-ink-soft sm:px-8">
        <p>
          상호 <Placeholder>확정 필요</Placeholder> · 대표자{" "}
          <Placeholder>확정 필요</Placeholder> · 사업자등록번호{" "}
          <Placeholder>확정 필요</Placeholder> · 통신판매업신고번호{" "}
          <Placeholder>확정 필요</Placeholder>
        </p>
        <p>
          주소 <Placeholder>확정 필요</Placeholder> · 이메일{" "}
          <Placeholder>확정 필요</Placeholder> · 개인정보 보호책임자{" "}
          <Placeholder>확정 필요</Placeholder>
        </p>
      </div>
    </footer>
  );
}
