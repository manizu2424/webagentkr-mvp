import Link from "next/link";
import { IBM_Plex_Mono } from "next/font/google";
import { DiagnosisWizard } from "@/components/diagnosis/diagnosis-wizard";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

const PRETENDARD_CSS =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendard-variable-dynamic-subset.min.css";

export default function DiagnosisPage() {
  return (
    <div
      className={`${plexMono.variable} font-display min-h-full bg-paper text-ink`}
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
      <DiagnosisWizard />
    </div>
  );
}
