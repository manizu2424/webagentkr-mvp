"use client";

import { reopenConsentBanner } from "@/lib/consent";

/**
 * 푸터의 "쿠키 설정" 링크 — 이미 동의/거부를 선택했어도 배너를 다시 열어
 * 분석 쿠키 동의를 바꿀 수 있게 한다(개인정보처리방침 §11 "언제든 철회").
 * GA4 ID 가 없으면 배너 자체가 안 뜨므로 이 버튼도 no-op 이다.
 */
export function CookieSettingsLink() {
  return (
    <button
      type="button"
      onClick={reopenConsentBanner}
      className="text-left hover:text-ink"
    >
      쿠키 설정
    </button>
  );
}
