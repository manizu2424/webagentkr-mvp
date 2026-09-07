import type { DiagnosisSubmission } from "@/lib/validation";
import { firstStepWithError, type FieldErrors, type Step } from "./reducer";

export type SubmitResult =
  | { kind: "ok"; diagnosisId: string }
  | { kind: "validation"; errors: FieldErrors; jumpTo: Step | null }
  | { kind: "rate_limited" }
  | { kind: "error" };

/**
 * POST /api/diagnoses 호출 + 응답 매핑. fetchImpl 은 테스트 주입용(기본 globalThis.fetch).
 * 네트워크 재시도해도 같은 idempotencyKey 라 서버가 같은 diagnosisId 를 준다.
 */
export async function submitDiagnosis(
  values: Partial<DiagnosisSubmission>,
  idempotencyKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SubmitResult> {
  try {
    const res = await fetchImpl("/api/diagnoses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...values, hp_field: values.hp_field ?? "", idempotencyKey }),
    });

    if (res.status === 200) {
      const json = (await res.json()) as { diagnosisId?: string };
      if (json.diagnosisId) return { kind: "ok", diagnosisId: json.diagnosisId };
      return { kind: "error" };
    }
    if (res.status === 400) {
      const json = (await res.json()) as {
        error?: string;
        issues?: { path: (string | number)[]; message: string }[];
      };
      if (json.error === "validation" && json.issues) {
        const errors: FieldErrors = {};
        for (const issue of json.issues) {
          const key = issue.path[0] as keyof FieldErrors | undefined;
          if (key && !errors[key]) errors[key] = issue.message;
        }
        return {
          kind: "validation",
          errors,
          jumpTo: firstStepWithError(Object.keys(errors)),
        };
      }
      return { kind: "error" };
    }
    if (res.status === 429) return { kind: "rate_limited" };
    return { kind: "error" };
  } catch {
    return { kind: "error" };
  }
}
