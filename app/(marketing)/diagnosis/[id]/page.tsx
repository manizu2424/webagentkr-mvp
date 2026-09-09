import type { Metadata } from "next";
import { DiagnosisResult } from "@/components/diagnosis/result/diagnosis-result";

// per-user 진단 결과 — 색인 금지.
export const metadata: Metadata = {
  title: "진단 결과",
  robots: { index: false, follow: false },
};

// (marketing) 레이아웃이 SiteHeader · SiteFooter · Pretendard · <main> 을 제공한다 → 여기서는 <div>.
export default async function DiagnosisResultPage({
  params,
}: PageProps<"/diagnosis/[id]">) {
  const { id } = await params;
  return (
    <div className="mx-auto w-full max-w-xl px-5 py-10 sm:py-14">
      <p className="font-flow text-xs text-ink-soft">진단 번호 · {id}</p>
      {/* key={id}: 두 /diagnosis/[id] 사이를 클라이언트 네비게이션해도 아일랜드가 remount 되어
          view 가 polling 으로 초기화된다(stale-view flash 방지). */}
      <DiagnosisResult key={id} diagnosisId={id} />
    </div>
  );
}
