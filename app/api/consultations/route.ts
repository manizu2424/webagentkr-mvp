// [스텁] POST /api/consultations — Phase 3.1 에서 구현 (기술 스펙 §4.3 + 결함 #11)
// 허니팟/rate limit → diagnosisId → diagnoses.lead_id 역참조로 lead 재사용
//   (신규는 leads.email unique 기준 upsert)
//   → lib/serviceTagging.ts 로 suggested_service_type 계산 (docs/decisions.md D3)
//   → consultations insert(NEW) → Telegram
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
