"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  type AnalyticsConsent as Consent,
  CONSENT_CHANGE_EVENT,
  CONSENT_REOPEN_EVENT,
  getConsent,
  setConsent,
  subscribeConsent,
} from "@/lib/consent";

const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
const ANALYTICS_CONFIGURED = Boolean(GA4_ID || CLARITY_ID);
const TOOL_LABEL = [GA4_ID && "Google Analytics 4", CLARITY_ID && "Microsoft Clarity"]
  .filter(Boolean)
  .join("와 ");

function useAnalyticsConsent(): Consent | null {
  return useSyncExternalStore(
    subscribeConsent,
    getConsent,
    () => null, // SSR: 항상 미결정으로 그린다(배너/스크립트 없음)
  );
}

/**
 * 분석 쿠키 동의 배너 + GA4/Clarity 로더. 루트 레이아웃에 1회 마운트한다.
 *
 * - 동의("granted") 전에는 어떤 분석 스크립트도 주입하지 않는다(개인정보처리방침 §11).
 * - `/admin/*` 과 분석 ID 미설정 시에는 배너도 스크립트도 없다.
 * - 철회(granted→denied)는 리로드 없이: GA4 는 `ga-disable-<ID>` 플래그, Clarity 는
 *   `clarity("stop")`. `lib/analytics.ts` 의 `track()` 도 동의 가드가 있어 이벤트 전송을 멈춘다.
 */
export function AnalyticsConsent() {
  const pathname = usePathname();
  const consent = useAnalyticsConsent();

  // "쿠키 설정" 링크로 다시 연 경우에만 true. 미결정 상태는 아래에서 따로 처리한다.
  const [manualOpen, setManualOpen] = useState(false);

  useEffect(() => {
    function onReopen() {
      setManualOpen(true);
    }
    function onChange() {
      setManualOpen(false);
    }
    window.addEventListener(CONSENT_REOPEN_EVENT, onReopen);
    window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
    return () => {
      window.removeEventListener(CONSENT_REOPEN_EVENT, onReopen);
      window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
    };
  }, []);

  // 스크립트가 이미 로드된 뒤 거부로 바뀌어도 수집을 멈춘다.
  useEffect(() => {
    const granted = consent === "granted";
    if (GA4_ID) {
      (window as unknown as Record<string, boolean>)[`ga-disable-${GA4_ID}`] =
        !granted;
    }
    if (CLARITY_ID) {
      const clarity = (window as unknown as { clarity?: (...a: unknown[]) => void })
        .clarity;
      clarity?.(granted ? "start" : "stop");
    }
  }, [consent]);

  if (!ANALYTICS_CONFIGURED || pathname?.startsWith("/admin")) return null;

  const bannerOpen = manualOpen || consent === null;

  return (
    <>
      {consent === "granted" && GA4_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA4_ID}',{anonymize_ip:true});`}
          </Script>
        </>
      )}

      {consent === "granted" && CLARITY_ID && (
        <Script id="clarity-init" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");`}
        </Script>
      )}

      {bannerOpen && <ConsentBanner current={consent} onChoice={setConsent} />}
    </>
  );
}

function ConsentBanner({
  current,
  onChoice,
}: {
  current: Consent | null;
  onChoice: (value: Consent) => void;
}) {
  return (
    <div
      role="region"
      aria-label="분석 쿠키 동의"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-panel shadow-[0_-8px_24px_-16px_rgba(22,41,43,0.35)]"
    >
      <div className="mx-auto flex max-w-[1120px] flex-col gap-3 px-5 py-4 text-sm text-ink-soft sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="leading-[1.7]">
          이용 통계·사용성 분석을 위해 {TOOL_LABEL} 분석 쿠키를 사용합니다.
          동의하지 않아도 서비스 이용에는 제한이 없습니다.{" "}
          <Link
            href="/privacy"
            target="_blank"
            className="underline decoration-line decoration-1 underline-offset-[3px] transition-colors hover:text-ink motion-reduce:transition-none"
          >
            자세히
          </Link>
          {current !== null && (
            <span className="ml-1 text-ink-soft/80">
              (현재 설정: {current === "granted" ? "동의함" : "거부함"})
            </span>
          )}
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => onChoice("denied")}
            className="inline-flex min-h-11 items-center rounded-md border border-line px-4 text-[0.95rem] text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal motion-reduce:transition-none"
          >
            거부
          </button>
          <button
            type="button"
            onClick={() => onChoice("granted")}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-signal px-5 text-[0.95rem] font-medium text-white transition-colors hover:bg-[#182fc0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal motion-reduce:transition-none"
          >
            동의
          </button>
        </div>
      </div>
    </div>
  );
}
