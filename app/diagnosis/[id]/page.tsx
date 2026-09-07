import Link from "next/link";
import { IBM_Plex_Mono } from "next/font/google";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

const PRETENDARD_CSS =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendard-variable-dynamic-subset.min.css";

// 정적 화면 — 폴링·결과 카드·FAILED UX 는 Phase 2.1~2.3.
export default async function DiagnosisResultPage({
  params,
}: PageProps<"/diagnosis/[id]">) {
  const { id } = await params;
  return (
    <div
      className={`${plexMono.variable} font-display flex min-h-full flex-col items-center bg-paper px-5 py-20 text-ink`}
    >
      <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
      <link rel="stylesheet" href={PRETENDARD_CSS} />
      <div className="w-full max-w-md">
        <p className="font-flow text-[0.7rem] text-signal">접수 완료</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
          AI가 분석하고 있습니다
        </h1>
        <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">
          보통 1~2분이면 끝납니다. 결과가 준비되면 이 페이지에서 확인할 수 있어요.
          분석 결과는 AI가 계산한 추정치입니다.
        </p>
        <p className="mt-6 font-flow text-xs text-ink-soft">진단 번호 · {id}</p>
        <div className="mt-8 flex gap-4 text-sm">
          <Link href="/" className="text-signal underline underline-offset-4">
            홈으로
          </Link>
          <Link
            href="/consultation"
            className="text-signal underline underline-offset-4"
          >
            상담 신청
          </Link>
        </div>
      </div>
    </div>
  );
}
