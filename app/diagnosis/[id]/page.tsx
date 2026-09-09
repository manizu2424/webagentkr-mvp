import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Mono } from "next/font/google";
import { DiagnosisResult } from "@/components/diagnosis/result/diagnosis-result";

// per-user 진단 결과 — 색인 금지.
export const metadata: Metadata = {
  title: "진단 결과",
  robots: { index: false, follow: false },
};

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

const PRETENDARD_CSS =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendard-variable-dynamic-subset.min.css";

export default async function DiagnosisResultPage({
  params,
}: PageProps<"/diagnosis/[id]">) {
  const { id } = await params;
  return (
    <div
      className={`${plexMono.variable} font-display flex min-h-full flex-1 flex-col bg-paper text-ink`}
    >
      <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
      <link rel="stylesheet" href={PRETENDARD_CSS} />
      <header className="border-b border-line">
        <div className="mx-auto max-w-xl px-5 py-4">
          <Link
            href="/"
            className="text-[1.05rem] font-extrabold tracking-tight text-ink"
          >
            WEBAGENT<span className="text-ink-soft">.KR</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl px-5 py-10 sm:py-14">
        <p className="font-flow text-xs text-ink-soft">진단 번호 · {id}</p>
        {/* key={id}: 두 /diagnosis/[id] 사이를 클라이언트 네비게이션해도
            아일랜드가 remount 되어 view 가 polling 으로 초기화된다(stale-view flash 방지). */}
        <DiagnosisResult key={id} diagnosisId={id} />
      </main>
    </div>
  );
}
