import { N8N_PAYLOAD_KEYS, type DiagnosisSubmission } from "@/lib/validation";
import { pick } from "@/lib/pick";

/**
 * n8n webhook 바디 조립. PII(회사명·이름·이메일·전화·동의)는 절대 넣지 않는다
 * (기획서 §16.1 — 법적 요구). 허용 목록은 N8N_PAYLOAD_KEYS.
 * pain_point 는 자유 텍스트라 사용자가 PII 를 넣을 수 있으나 스펙상 포함은 허용된다.
 */
export function buildWebhookBody(
  diagnosisId: string,
  data: DiagnosisSubmission,
): Record<string, unknown> {
  return { diagnosisId, ...pick(data, N8N_PAYLOAD_KEYS) };
}
