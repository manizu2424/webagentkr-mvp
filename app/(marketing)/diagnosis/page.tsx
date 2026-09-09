import type { Metadata } from "next";
import { DiagnosisWizard } from "@/components/diagnosis/diagnosis-wizard";
import { pageMetadata } from "@/lib/siteMeta";

export const metadata: Metadata = pageMetadata({
  title: "무료 자동화 진단",
  description:
    "5단계 질문에 답하면 AI가 반복 업무의 자동화 가능성과 예상 절감 시간을 진단해 드립니다. 무료.",
  path: "/diagnosis",
});

// (marketing) 레이아웃이 SiteHeader · SiteFooter · Pretendard · font-display · bg-paper 를 제공한다.
export default function DiagnosisPage() {
  return <DiagnosisWizard />;
}
