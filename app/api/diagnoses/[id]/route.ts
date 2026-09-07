// GET /api/diagnoses/[id] — 공개, 결과 페이지 폴링용 (기술 스펙 §4.2 + 결함 #12).
// lead 정보(이름·연락처·이메일)는 절대 포함하지 않는다 — diagnoses 에서 status 만 select.
import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { toApiResult, type DiagnosisResultRow } from "@/lib/diagnosisResult";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/diagnoses/[id]">,
) {
  const { id } = await ctx.params;
  let supabase;
  try {
    supabase = createServiceClient();
  } catch (e) {
    console.error("[diagnoses/[id]] 클라이언트 생성 실패:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "internal" }, { status: 500, headers: NO_STORE });
  }

  const diag = await supabase
    .from("diagnoses")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (diag.error) {
    console.error("[diagnoses/[id]] 조회 실패:", diag.error.code, diag.error.message);
    return NextResponse.json({ error: "internal" }, { status: 500, headers: NO_STORE });
  }
  if (!diag.data) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  const status = diag.data.status as string;

  if (status === "SUBMITTED" || status === "PROCESSING") {
    return NextResponse.json({ status: "PROCESSING" }, { headers: NO_STORE });
  }
  if (status === "FAILED") {
    return NextResponse.json({ status: "FAILED" }, { headers: NO_STORE });
  }

  // COMPLETED
  const res = await supabase
    .from("diagnosis_results")
    .select(
      "automation_score, recommended_tasks, estimated_saved_hours, recommended_stack, implementation_steps, ai_summary",
    )
    .eq("diagnosis_id", id)
    .maybeSingle();

  if (res.error || !res.data) {
    // 정상 흐름에선 불가능. n8n/Mock 부분 실패 대비 — 폴링을 계속시킨다.
    console.error(
      "[diagnoses/[id]] COMPLETED 인데 결과 행 없음:",
      id,
      res.error?.code,
      res.error?.message,
    );
    return NextResponse.json({ status: "PROCESSING" }, { headers: NO_STORE });
  }

  return NextResponse.json(
    { status: "COMPLETED", result: toApiResult(res.data as DiagnosisResultRow) },
    { headers: NO_STORE },
  );
}
