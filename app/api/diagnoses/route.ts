// [스텁] POST /api/diagnoses — Phase 1.5 에서 구현 (기술 스펙 §4.1 + 결함 #1·#3·#13)
// 처리 순서: 허니팟→200 무저장 / consentAgreed!==true→400 / rate limit(clientIp)→429
//   → leads insert → diagnoses insert(SUBMITTED) → status=PROCESSING 전이
//   → N8N_WEBHOOK_URL POST (PII 제외, X-Webhook-Secret) → 실패 시 FAILED + Telegram
//   → { diagnosisId } 반환
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
