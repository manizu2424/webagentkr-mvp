import type { DiagnosisApiResult } from "@/lib/diagnosisResult";
import { ProcessingView } from "./processing-view";
import { ErrorView } from "./error-view";
import { ResultCards } from "./result-cards";
import { FailedNotice } from "./failed-notice";

export type ResultViewState =
  | { kind: "polling" }
  | { kind: "completed"; result: DiagnosisApiResult }
  | { kind: "failed" }
  | { kind: "timeout" }
  | { kind: "error" };

export function ResultView({
  view,
  diagnosisId,
  onRetry,
}: {
  view: ResultViewState;
  diagnosisId: string;
  onRetry: () => void;
}) {
  switch (view.kind) {
    case "polling":
      return <ProcessingView />;
    case "completed":
      return <ResultCards result={view.result} />;
    case "failed":
      return <FailedNotice variant="failed" diagnosisId={diagnosisId} />;
    case "timeout":
      return <FailedNotice variant="timeout" diagnosisId={diagnosisId} />;
    case "error":
      return <ErrorView onRetry={onRetry} />;
  }
}
