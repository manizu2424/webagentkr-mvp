import Link from "next/link";
import { track } from "@/lib/analytics";

const COPY = {
  failed: {
    title: "진단 결과 생성에 실패했습니다",
    body: "죄송합니다. AI 분석 중 문제가 발생했습니다. 상담을 신청해 주시면 담당자가 직접 진단 결과를 정리해 연락드리겠습니다.",
  },
  timeout: {
    title: "예상보다 오래 걸리고 있습니다",
    body: "결과가 준비되는 대로 이 페이지에서 확인할 수 있습니다. 지금 상담을 신청하시면 담당자가 결과와 함께 연락드립니다.",
  },
} as const;

export function FailedNotice({
  variant,
  diagnosisId,
}: {
  variant: "failed" | "timeout";
  diagnosisId: string;
}) {
  const c = COPY[variant];
  return (
    <div className="mt-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">{c.title}</h1>
      <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">{c.body}</p>
      <Link
        href={`/consultation?diagnosisId=${diagnosisId}`}
        onClick={() => track("consultation_cta_click", { from: variant })}
        className="mt-6 inline-flex min-h-11 items-center rounded-md bg-signal px-5 text-[0.95rem] font-medium text-white transition-colors hover:bg-[#182fc0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal motion-reduce:transition-none"
      >
        상담 신청하기
      </Link>
    </div>
  );
}
