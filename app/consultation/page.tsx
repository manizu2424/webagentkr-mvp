import type { Metadata } from "next";
import Link from "next/link";
import { IBM_Plex_Mono } from "next/font/google";
import { ConsultationForm } from "@/components/consultation/consultation-form";
import { pageMetadata } from "@/lib/siteMeta";

export const metadata: Metadata = pageMetadata({
  title: "상담 신청",
  description:
    "자동화 도입을 검토 중이라면 상담을 신청하세요. 진단 결과가 있으면 함께 전달됩니다.",
  path: "/consultation",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

const PRETENDARD_CSS =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendard-variable-dynamic-subset.min.css";

export default async function ConsultationPage({
  searchParams,
}: PageProps<"/consultation">) {
  const sp = await searchParams;
  const raw = sp.diagnosisId;
  const diagnosisId = typeof raw === "string" && raw.length > 0 ? raw : undefined;

  return (
    <div
      className={`${plexMono.variable} font-display flex min-h-full flex-1 flex-col bg-paper text-ink`}
    >
      <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
      <link rel="stylesheet" href={PRETENDARD_CSS} />
      <header className="border-b border-line">
        <div className="mx-auto max-w-xl px-5 py-4">
          <Link href="/" className="text-[1.05rem] font-extrabold tracking-tight text-ink">
            WEBAGENT<span className="text-ink-soft">.KR</span>
          </Link>
        </div>
      </header>
      <ConsultationForm diagnosisId={diagnosisId} />
    </div>
  );
}
