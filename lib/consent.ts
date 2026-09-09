/**
 * 분석 쿠키(GA4) 동의 상태 — 클라이언트 전용, localStorage 1개 키.
 *
 * 개인정보처리방침 §11 계약: GA4 는 "이용자가 분석 쿠키에 동의한 경우에만" 로드된다.
 * 따라서 동의 모드(Consent Mode)가 아니라 동의 전 완전 미주입이다. 미결정(null)도
 * 거부와 동일하게 아무것도 로드하지 않으며, 배너만 계속 노출한다.
 *
 * 재시작·다른 브라우저·시크릿 창에서는 값이 사라질 수 있고, 일부 환경(썸네일 캡처 등)에서는
 * 접근 자체가 throw 하므로 모든 읽기·쓰기를 try/catch 로 감싼다.
 */

export type AnalyticsConsent = "granted" | "denied";

const STORAGE_KEY = "wak.analyticsConsent";

/** 동의 상태가 바뀌면 window 에 디스패치된다(배너·로더가 리로드 없이 반응). */
export const CONSENT_CHANGE_EVENT = "wak:consent-change";
/** 푸터 "쿠키 설정" 링크가 배너를 다시 열 때 디스패치된다. */
export const CONSENT_REOPEN_EVENT = "wak:consent-reopen";

export function getConsent(): AnalyticsConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value: AnalyticsConsent): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // 저장 실패해도 아래 이벤트로 현재 세션 동작은 이어간다.
  }
  window.dispatchEvent(
    new CustomEvent<AnalyticsConsent>(CONSENT_CHANGE_EVENT, { detail: value }),
  );
}

export function reopenConsentBanner(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CONSENT_REOPEN_EVENT));
}

/**
 * `useSyncExternalStore` 구독자 — 같은 탭의 `setConsent` 와 다른 탭의 `storage`
 * 이벤트 양쪽에 반응한다.
 */
export function subscribeConsent(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CONSENT_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
