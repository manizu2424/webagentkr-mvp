// POST /api/diagnoses — 공개, 스팸 방어 (기술 스펙 §4.1, §5 + 결함 #1 #3 #11 #13)
// 초기 저장 + PROCESSING 선전이 + n8n webhook 트리거만 담당. 콜백 API 없음 —
// 이후 COMPLETED/FAILED 는 n8n 이 service_role 로 diagnoses 에 직접 기록한다.
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/clientIp";
import { checkRateLimit } from "@/lib/rateLimit";
import { diagnosisSubmissionSchema } from "@/lib/validation";
import { buildWebhookBody } from "@/lib/diagnosisWebhook";
import { sendTelegram } from "@/lib/telegram";

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const WEBHOOK_TIMEOUT_MS = 10_000;

export async function POST(req: Request) {
  // 1. JSON 파싱
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // 2. 허니팟 — 값이 있으면 봇. 200 반환하되 아무것도 저장하지 않는다.
  const hp = (body as { hp_field?: unknown })?.hp_field;
  if (typeof hp === "string" && hp.length > 0) {
    console.warn("[diagnoses] 허니팟 채워짐 — 무시");
    return NextResponse.json({ ok: true });
  }

  // 3. rate limit — 소켓 IP 가 아니라 프록시 헤더 기반 실제 IP (결함 #2)
  const rl = checkRateLimit(getClientIp(req), RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSec: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  // 4. zod 검증 (consentAgreed !== true 도 여기서 400)
  const parsed = diagnosisSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const data = parsed.data;

  try {
    const supabase = createServiceClient();

    // 5. 멱등성 조회 — 같은 키의 진단이 이미 있으면 그대로 반환
    const existing = await supabase
      .from("diagnoses")
      .select("id")
      .eq("idempotency_key", data.idempotencyKey)
      .maybeSingle();
    if (existing.data?.id) {
      return NextResponse.json({ diagnosisId: existing.data.id });
    }

    // 6. leads upsert (email 기준 — 재방문자 중복/오류 방지, 결함 #11)
    const lead = await supabase
      .from("leads")
      .upsert(
        {
          company_name: data.companyName,
          industry: data.industry,
          employee_count: data.employeeCount,
          contact_name: data.contactName,
          email: data.email,
          phone: data.phone,
          consulting_method: data.consultingMethod,
        },
        { onConflict: "email" },
      )
      .select("id")
      .single();
    if (lead.error || !lead.data) {
      console.error("[diagnoses] leads upsert 실패:", lead.error);
      return NextResponse.json({ error: "db_lead" }, { status: 500 });
    }

    // 7. diagnoses insert (status=SUBMITTED)
    const ins = await supabase
      .from("diagnoses")
      .insert({
        lead_id: lead.data.id,
        website_status: data.websiteStatus,
        current_tools: data.currentTools,
        repetitive_tasks: data.repetitiveTasks,
        daily_hours: data.dailyHours,
        staff_count: data.staffCount,
        monthly_volume: data.monthlyVolume,
        purpose: data.purpose,
        pain_point: data.painPoint,
        budget_range: data.budgetRange,
        idempotency_key: data.idempotencyKey,
        status: "SUBMITTED",
      })
      .select("id")
      .single();

    if (ins.error || !ins.data) {
      // 멱등성 경합(동시 2요청) — 23505 면 재조회
      if (ins.error?.code === "23505") {
        const retry = await supabase
          .from("diagnoses")
          .select("id")
          .eq("idempotency_key", data.idempotencyKey)
          .maybeSingle();
        if (retry.data?.id) {
          return NextResponse.json({ diagnosisId: retry.data.id });
        }
      }
      console.error("[diagnoses] diagnoses insert 실패:", ins.error);
      return NextResponse.json({ error: "db_diagnosis" }, { status: 500 });
    }
    const diagnosisId = ins.data.id;

    // 8. PROCESSING 으로 먼저 전이 (결함 #1 — webhook 뒤에 하면 경쟁 조건)
    const toProcessing = await supabase
      .from("diagnoses")
      .update({ status: "PROCESSING" })
      .eq("id", diagnosisId);
    if (toProcessing.error) {
      console.error("[diagnoses] PROCESSING 전이 실패:", toProcessing.error);
    }

    // 9. n8n webhook
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn(
        "[diagnoses] N8N_WEBHOOK_URL 미설정 — webhook skip. diagnosisId:",
        diagnosisId,
      );
      return NextResponse.json({ diagnosisId });
    }

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-webhook-secret": process.env.N8N_WEBHOOK_SECRET ?? "",
        },
        body: JSON.stringify(buildWebhookBody(diagnosisId, data)),
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`webhook ${res.status}`);
    } catch (err) {
      // 10. webhook 실패 — FAILED + 실패 알림 (결함 #3). 그래도 200 반환.
      console.error("[diagnoses] webhook 호출 실패:", err);
      await supabase
        .from("diagnoses")
        .update({ status: "FAILED" })
        .eq("id", diagnosisId);
      await sendTelegram(
        `[진단 실패] ${diagnosisId} — webhook 호출 실패`,
        process.env.TELEGRAM_ERROR_CHAT_ID,
      ).catch(() => {});
      return NextResponse.json({ diagnosisId });
    }

    // webhook 성공 — 상태는 PROCESSING 유지, n8n 이 이후 구동
    return NextResponse.json({ diagnosisId });
  } catch (err) {
    console.error("[diagnoses] 처리 중 예외:", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
