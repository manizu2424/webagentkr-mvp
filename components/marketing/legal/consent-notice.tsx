import Link from "next/link";

/**
 * 진단·상담 폼 제출 버튼 근처에 노출되는 "약관 동의 간주" 문구 (묶음 C 결정 4).
 * `ConsentCheckbox`(개인정보 수집·이용 필수 동의)는 그대로 두고, 이용약관은
 * 별도 체크박스 없이 이 문구 + 링크로 갈음한다.
 */
export function ConsentNotice({ action }: { action: string }) {
  return (
    <p className="text-[0.8rem] leading-[1.7] text-ink-soft">
      {action} 신청하면 <LegalLink href="/terms">이용약관</LegalLink> 및{" "}
      <LegalLink href="/privacy">개인정보처리방침</LegalLink>에 동의한 것으로
      간주합니다.
    </p>
  );
}

function LegalLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      className="underline decoration-line decoration-1 underline-offset-[3px] transition-colors hover:text-signal hover:decoration-signal motion-reduce:transition-none"
    >
      {children}
    </Link>
  );
}
