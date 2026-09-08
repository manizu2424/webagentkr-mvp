// POST /api/consultations — 공개, 스팸 방어 (기술 스펙 §4.3 + 결함 #11 + D3).
// diagnosisId 있으면 그 진단의 lead 재사용 + serviceTagging, 없으면 email upsert + 태그 null.
// 관리자 콜백/알림은 이 라우트가 직접 한다(상담은 n8n 경로를 안 탄다).
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/clientIp";
import { checkRateLimit } from "@/lib/rateLimit";
import { consultationSubmissionSchema } from "@/lib/validation";
import {
  computeServiceType,
  type TaggingDiagnosis,
  type TaggingResult,
} from "@/lib/serviceTagging";
import { sendTelegram } from "@/lib/telegram";

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  // 1. JSON 파싱
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // 2. 허니팟 — present + non-empty 는 전부 봇. 200 반환하되 저장하지 않는다.
  const hp = (body as { hp_field?: unknown })?.hp_field;
  if (hp !== undefined && hp !== null && hp !== "") {
    console.warn("[consultations] 허니팟 채워짐 — 무시");
    return NextResponse.json({ ok: true });
  }

  // 3. 동의 — zod 전에 명시적으로 400 (기존 diagnoses 규약)
  if ((body as { consentAgreed?: unknown })?.consentAgreed !== true) {
    return NextResponse.json({ error: "consent_required" }, { status: 400 });
  }

  // 4. rate limit — 진단과 별도 버킷
  const rl = checkRateLimit("consult:" + getClientIp(req), RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSec: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  // 5. zod
  const parsed = consultationSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // 6. Supabase
  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch (e) {
    console.error(
      "[consultations] 클라이언트 생성 실패:",
      e instanceof Error ? e.message : String(e),
    );
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  let leadId: string;
  let companyName: string | null = null;
  let suggested: ReturnType<typeof computeServiceType> = null;

  if (data.diagnosisId) {
    // 6a. 진단 경로 — lead 재사용 + 태깅
    const diag = await supabase
      .from("diagnoses")
      .select("lead_id, purpose, budget_range, website_status")
      .eq("id", data.diagnosisId)
      .maybeSingle();
    if (diag.error) {
      console.error("[consultations] diagnoses 조회 실패:", diag.error.code, diag.error.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    if (!diag.data) {
      return NextResponse.json({ error: "diagnosis_not_found" }, { status: 404 });
    }
    leadId = diag.data.lead_id as string;

    // 회사명만 별도 select (Telegram 문구용 — PII 경계상 회사명은 허용)
    const leadRow = await supabase
      .from("leads")
      .select("company_name")
      .eq("id", leadId)
      .maybeSingle();
    companyName = (leadRow.data?.company_name as string | undefined) ?? null;

    // diagnosis_results 는 없을 수 있다 (FAILED/미완 진단)
    const resRow = await supabase
      .from("diagnosis_results")
      .select("recommended_stack, recommended_tasks")
      .eq("diagnosis_id", data.diagnosisId)
      .maybeSingle();

    const taggingDiag: TaggingDiagnosis = {
      purpose: (diag.data.purpose as string | null) ?? null,
      budgetRange: (diag.data.budget_range as string | null) ?? null,
      websiteStatus: (diag.data.website_status as string | null) ?? null,
    };
    const taggingResult: TaggingResult | null = resRow.data
      ? {
          recommendedStack: Array.isArray(resRow.data.recommended_stack)
            ? (resRow.data.recommended_stack as string[])
            : [],
          priorityTasks: Array.isArray(resRow.data.recommended_tasks)
            ? (resRow.data.recommended_tasks as { name: string; reason: string }[])
            : [],
        }
      : null;
    suggested = computeServiceType(taggingDiag, taggingResult);
  } else {
    // 6b. 직접 경로 — email upsert. superRefine 이 이미 전 필드 존재를 보장.
    const up = await supabase
      .from("leads")
      .upsert(
        {
          company_name: data.companyName,
          industry: data.industry,
          employee_count: data.employeeCount,
          contact_name: data.contactName,
          email: data.email,
          phone: data.phone,
          consulting_method: data.consultationType, // 미러
        },
        { onConflict: "email" },
      )
      .select("id")
      .single();
    if (up.error || !up.data) {
      console.error("[consultations] leads upsert 실패:", up.error?.code, up.error?.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    leadId = up.data.id as string;
    companyName = data.companyName ?? null;
  }

  // 7. consultations insert
  const ins = await supabase
    .from("consultations")
    .insert({
      lead_id: leadId,
      diagnosis_id: data.diagnosisId ?? null,
      suggested_service_type: suggested,
      preferred_date: data.preferredDate,
      consultation_type: data.consultationType,
      status: "NEW",
    })
    .select("id")
    .single();
  if (ins.error || !ins.data) {
    console.error("[consultations] insert 실패:", ins.error?.code, ins.error?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  // 8. Telegram — 회사명은 허용, 이름·전화·이메일은 넣지 않는다
  await sendTelegram(
    `[신규 상담] ${companyName ?? "(회사명 미상)"}\n` +
      `방식: ${data.consultationType} / 시기: ${data.preferredDate}\n` +
      `추정 서비스 유형: ${suggested ?? "미정 (진단 없음/미완)"}` +
      (data.diagnosisId ? `\n진단: ${data.diagnosisId}` : ""),
    process.env.TELEGRAM_ADMIN_CHAT_ID,
  ).catch(() => {});

  return NextResponse.json({ consultationId: ins.data.id });
}
