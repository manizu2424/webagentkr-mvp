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
  | { kind: "notfound" }
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
    case "notfound":
      return <ErrorView variant="notfound" />;
    case "error":
      return <ErrorView variant="transient" onRetry={onRetry} />;
    default: {
      // ResultViewState 에 kind 를 추가하면 여기서 컴파일 에러가 난다.
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}
