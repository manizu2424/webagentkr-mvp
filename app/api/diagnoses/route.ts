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

  // 2. 허니팟 — 값이 있으면(문자열이 아니어도) 봇. 200 반환하되 아무것도 저장하지 않는다.
  //    배열/객체 등 비문자열로 우회하면 zod 400 이 hp_field 를 issues 에 노출해 트랩을 알려주므로,
  //    present + non-empty 는 전부 봇으로 처리한다.
  const hp = (body as { hp_field?: unknown })?.hp_field;
  if (hp !== undefined && hp !== null && hp !== "") {
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
    if (existing.error) {
      // SELECT 자체가 실패(스키마 누락·스키마 캐시 미스·일시 장애)한 경우를 "행 없음"과
      // 구분하지 못하면, leads(PII) 를 먼저 쓰고 나서 diagnoses insert 에서 500 이 난다.
      // 여기서 즉시 종료해 PII 선기록을 막는다.
      console.error(
        "[diagnoses] 멱등성 조회 실패:",
        existing.error.code,
        existing.error.message,
      );
      return NextResponse.json({ error: "db_diagnosis" }, { status: 500 });
    }
    if (existing.data?.id) {
      return NextResponse.json({ diagnosisId: existing.data.id });
    }

    // 6. leads upsert (email 기준 — 재방문자 중복/오류 방지, 결함 #11)
    // 알려진 MVP 한계: onConflict "email" 은 "마지막 연락처가 이긴다" 의미다. 같은 이메일
    // (info@ / ceo@ 같은 공용 메일함)로 다시 제출하면 contact_name·phone·company_name 이
    // 덮어써져, 먼저 접수된 diagnoses 행이 다른 사람의 연락처와 묶일 수 있다. 스펙 §5.1
    // 6단계·결함 #11 이 재방문자 500 방지를 위해 이 방식을 명시하므로 지금은 유지한다.
    // post-MVP 에서 leads 를 append-only 로 바꿔 재검토한다. (docs/decisions.md D2-c 메모)
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
      console.error("[diagnoses] leads upsert 실패:", lead.error?.code, lead.error?.message);
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
      console.error("[diagnoses] diagnoses insert 실패:", ins.error?.code, ins.error?.message);
      return NextResponse.json({ error: "db_diagnosis" }, { status: 500 });
    }
    const diagnosisId = ins.data.id;

    // 8. PROCESSING 으로 먼저 전이 (결함 #1 — webhook 뒤에 하면 경쟁 조건)
    const toProcessing = await supabase
      .from("diagnoses")
      .update({ status: "PROCESSING" })
      .eq("id", diagnosisId);
    if (toProcessing.error) {
      console.error(
        "[diagnoses] PROCESSING 전이 실패:",
        toProcessing.error.code,
        toProcessing.error.message,
      );
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
      // status 가드는 두 선행 상태(SUBMITTED·PROCESSING)를 모두 포함한다: PROCESSING 전이
      // 자체가 실패해 행이 아직 SUBMITTED 일 수도 있고(그 경우도 FAILED 로 마감해야 결함 #3
      // 증상 — 끝나지 않는 폴링 — 을 막는다), 반대로 n8n 이 fetch 타임아웃 이후 워크플로우를
      // 마치고 COMPLETED 를 먼저 기록했을 수도 있어(그 경우 이 update 는 no-op) 종료 상태는
      // 건드리지 않는다.
      console.error("[diagnoses] webhook 호출 실패:", err);
      const toFailed = await supabase
        .from("diagnoses")
        .update({ status: "FAILED" })
        .eq("id", diagnosisId)
        .in("status", ["SUBMITTED", "PROCESSING"]);
      if (toFailed.error) {
        console.error(
          "[diagnoses] FAILED 전이 실패:",
          toFailed.error.code,
          toFailed.error.message,
        );
      }
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
