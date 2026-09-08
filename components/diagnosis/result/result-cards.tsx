import Link from "next/link";
import { track } from "@/lib/analytics";
import type { DiagnosisApiResult } from "@/lib/diagnosisResult";
import { ScoreCard } from "./score-card";
import { SavedHoursCard } from "./saved-hours-card";
import { PriorityTasksCard } from "./priority-tasks-card";
import { StackCard } from "./stack-card";
import { StepsCard } from "./steps-card";
import { SummaryCard } from "./summary-card";

// 상자 6개 대신 랜딩과 같은 규칙(rule) 체계: 굵은 ink 선이 문서를 열고,
// 이후 섹션은 헤어라인으로 나뉜다. 점수는 매스트헤드 바로 아래 붙어 하나의 "판정" 단위를 이룬다.
export function ResultCards({
  result,
  diagnosisId,
}: {
  result: DiagnosisApiResult;
  diagnosisId: string;
}) {
  return (
    <div className="mt-8 flex flex-col gap-8">
      <div className="border-t-2 border-ink pt-3">
        <h1 className="text-[1.5rem] leading-tight font-extrabold tracking-tight text-ink sm:text-[1.75rem]">
          자동화 진단 결과
        </h1>
        <p className="mt-2.5 max-w-[34rem] text-[0.85rem] leading-[1.7] text-ink-soft">
          아래 수치는 입력하신 정보를 바탕으로 AI가 계산한{" "}
          <strong className="font-semibold text-ink">추정치</strong>입니다. 실제 결과는 상담을 통해 구체화됩니다.
        </p>
      </div>
      <ScoreCard score={result.automationScore} />
      <SavedHoursCard hours={result.totalEstimatedSavedHours} />
      <PriorityTasksCard tasks={result.priorityTasks} />
      <StackCard stack={result.recommendedStack} />
      <StepsCard steps={result.implementationSteps} />
      <SummaryCard summary={result.summary} />

      <div className="border-t border-line pt-6">
        <p className="max-w-[34rem] text-[0.92rem] leading-[1.75] text-ink-soft">
          이 결과를 바탕으로 무엇부터 시작하면 좋을지, 전문가가 함께 정리해 드립니다.
        </p>
        <Link
          href={`/consultation?diagnosisId=${diagnosisId}`}
          onClick={() => track("consultation_cta_click", { from: "result" })}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-signal px-5 py-3 text-[0.95rem] leading-none font-medium text-white transition-colors hover:bg-[#182fc0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal motion-reduce:transition-none"
        >
          전문가 상담 신청하기
        </Link>
      </div>
    </div>
  );
}
