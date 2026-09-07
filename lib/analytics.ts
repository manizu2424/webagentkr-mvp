type TrackParams = Record<string, string | number | boolean | undefined>;

/**
 * GA4 이벤트. 이 라운드는 호출부만 심는다 — 실제 gtag.js 로드 + 쿠키/분석 동의 UI 는
 * Phase 3 (결함 #22). gtag 가 없으면 개발 중엔 콘솔에만 남긴다.
 */
export function track(event: string, params?: TrackParams): void {
  if (typeof window === "undefined") return;
  const g = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
  if (typeof g === "function") {
    g("event", event, params ?? {});
  } else if (process.env.NODE_ENV !== "production") {
    console.debug("[track]", event, params ?? {});
  }
}
