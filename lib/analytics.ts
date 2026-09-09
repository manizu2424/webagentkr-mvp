import { getConsent } from "@/lib/consent";

type TrackParams = Record<string, string | number | boolean | undefined>;

/**
 * GA4 이벤트. gtag.js 로드 + 동의 배너는 `components/analytics/analytics-consent.tsx`.
 * 여기서는 두 가지를 가드한다:
 *  - 분석 쿠키 동의가 "granted" 가 아니면 아무것도 쏘지 않는다(철회 후 window.gtag
 *    객체가 남아 있어도 마찬가지 — 개인정보처리방침 §11).
 *  - gtag 가 아직 없으면 개발 중엔 콘솔에만 남긴다.
 */
export function track(event: string, params?: TrackParams): void {
  if (typeof window === "undefined") return;
  if (getConsent() !== "granted") return;
  const g = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
  if (typeof g === "function") {
    g("event", event, params ?? {});
  } else if (process.env.NODE_ENV !== "production") {
    console.debug("[track]", event, params ?? {});
  }
}
