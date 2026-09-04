import type { ReactNode } from "react";
import { IBM_Plex_Mono } from "next/font/google";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

// 모노는 플로우 노드 라벨 · 영문 서비스명 · 다이어그램 숫자에만 쓴다 (frontend-design 규칙).
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

// 한글 본문 = Pretendard. dynamic-subset CSS 는 사용 글리프만 받아온다.
const PRETENDARD_CSS =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendard-variable-dynamic-subset.min.css";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${plexMono.variable} font-display flex min-h-full flex-col bg-paper text-ink`}
    >
      <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
      <link rel="stylesheet" href={PRETENDARD_CSS} />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
