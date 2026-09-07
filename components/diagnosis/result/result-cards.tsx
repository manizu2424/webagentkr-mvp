import type { DiagnosisApiResult } from "@/lib/diagnosisResult";
import { ScoreCard } from "./score-card";
import { SavedHoursCard } from "./saved-hours-card";
import { PriorityTasksCard } from "./priority-tasks-card";
import { StackCard } from "./stack-card";
import { StepsCard } from "./steps-card";
import { SummaryCard } from "./summary-card";

export function ResultCards({ result }: { result: DiagnosisApiResult }) {
  return (
    <div className="mt-8 flex flex-col gap-6">
      <div className="border-t-2 border-ink pt-3">
        <h1 className="text-[1.5rem] leading-tight font-extrabold tracking-tight text-ink sm:text-[1.75rem]">
          자동화 진단 결과
        </h1>
        <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-soft">
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
    </div>
  );
}
