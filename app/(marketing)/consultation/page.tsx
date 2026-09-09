import type { Metadata } from "next";
import { ConsultationForm } from "@/components/consultation/consultation-form";
import { pageMetadata } from "@/lib/siteMeta";

export const metadata: Metadata = pageMetadata({
  title: "상담 신청",
  description:
    "자동화 도입을 검토 중이라면 상담을 신청하세요. 진단 결과가 있으면 함께 전달됩니다.",
  path: "/consultation",
});

// (marketing) 레이아웃이 SiteHeader · SiteFooter · Pretendard · font-display · bg-paper 를 제공한다.
export default async function ConsultationPage({
  searchParams,
}: PageProps<"/consultation">) {
  const sp = await searchParams;
  const raw = sp.diagnosisId;
  const diagnosisId = typeof raw === "string" && raw.length > 0 ? raw : undefined;

  return <ConsultationForm diagnosisId={diagnosisId} />;
}
