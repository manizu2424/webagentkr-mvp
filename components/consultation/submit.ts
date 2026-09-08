import type { ConsultationSubmission } from "@/lib/validation";

export type ConsultationSubmitResult =
  | { kind: "ok"; consultationId: string }
  | { kind: "validation"; errors: Partial<Record<keyof ConsultationSubmission, string>> }
  | { kind: "not_found" } // diagnosisId 가 유효하지 않음
  | { kind: "rate_limited" }
  | { kind: "error" };

/** POST /api/consultations 호출 + 응답 매핑. fetchImpl 은 테스트 주입용. */
export async function submitConsultation(
  values: Partial<ConsultationSubmission>,
  fetchImpl: typeof fetch = fetch,
): Promise<ConsultationSubmitResult> {
  try {
    const res = await fetchImpl("/api/consultations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...values, hp_field: values.hp_field ?? "" }),
    });

    if (res.status === 200) {
      const json = (await res.json()) as { consultationId?: string; ok?: boolean };
      if (json.consultationId) return { kind: "ok", consultationId: json.consultationId };
      return { kind: "error" }; // 허니팟 {ok:true} 도 여기 — 폼에선 성공처럼 보이면 안 되므로 error 취급
    }
    if (res.status === 404) return { kind: "not_found" };
    if (res.status === 429) return { kind: "rate_limited" };
    if (res.status === 400) {
      const json = (await res.json()) as {
        error?: string;
        issues?: { path: (string | number)[]; message: string }[];
      };
      if (json.error === "validation" && json.issues) {
        const errors: Partial<Record<keyof ConsultationSubmission, string>> = {};
        for (const issue of json.issues) {
          const key = issue.path[0] as keyof ConsultationSubmission | undefined;
          if (key && !errors[key]) errors[key] = issue.message;
        }
        return { kind: "validation", errors };
      }
      if (json.error === "consent_required") {
        return { kind: "validation", errors: { consentAgreed: "개인정보 수집·이용 동의가 필요합니다" } };
      }
      return { kind: "error" };
    }
    return { kind: "error" };
  } catch {
    return { kind: "error" };
  }
}
