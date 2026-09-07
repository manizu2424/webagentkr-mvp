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

// 실패는 폼(diagnosis-wizard)의 오류 블록과 같은 좌측 규칙 + 옅은 틴트.
// 타임아웃은 오류가 아니라 "진행 중"이므로 danger 대신 signal 로 톤을 낮춘다.
const NOTICE = {
  failed: "border-danger bg-danger/[0.05] text-danger",
  timeout: "border-signal bg-signal/[0.05] text-ink-soft",
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
      <div className="border-t-2 border-ink pt-3">
        <h1 className="text-[1.5rem] leading-tight font-extrabold tracking-tight text-ink sm:text-[1.75rem]">
          {c.title}
        </h1>
      </div>
      <p
        className={`mt-6 max-w-[34rem] border-l-2 px-4 py-3.5 text-[0.92rem] leading-[1.75] ${NOTICE[variant]}`}
      >
        {c.body}
      </p>
      <Link
        href={`/consultation?diagnosisId=${diagnosisId}`}
        onClick={() => track("consultation_cta_click", { from: variant })}
        className="mt-7 inline-flex min-h-11 items-center justify-center rounded-md bg-signal px-5 py-3 text-[0.95rem] leading-none font-medium text-white transition-colors hover:bg-[#182fc0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal motion-reduce:transition-none"
      >
        상담 신청하기
      </Link>
    </div>
  );
}
