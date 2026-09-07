// POST /api/dev/mock-result/[id]?outcome=completed|failed — 개발 전용 n8n 대역.
// n8n 이 Phase B 에서 할 일(diagnosis_results insert + status 전이 + Telegram)을 그대로 수행.
// 프로덕션에서는 라우트 자체를 404 로 숨긴다.
import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendTelegram } from "@/lib/telegram";
import { MOCK_RESULT_ROW } from "@/lib/mockDiagnosisResult";

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/dev/mock-result/[id]">,
) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const secret = process.env.MOCK_RESULT_SECRET;
  if (secret && req.headers.get("x-mock-secret") !== secret) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { id } = await ctx.params;
  const outcome =
    new URL(req.url).searchParams.get("outcome") ?? "completed";
  if (outcome !== "completed" && outcome !== "failed") {
    return NextResponse.json({ error: "bad_outcome" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const diag = await supabase
    .from("diagnoses")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (diag.error) {
    console.error("[dev/mock-result] 조회 실패:", diag.error.code, diag.error.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
  if (!diag.data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const status = diag.data.status as string;
  if (status !== "SUBMITTED" && status !== "PROCESSING") {
    return NextResponse.json({ error: "already_terminal", status }, { status: 409 });
  }

  if (outcome === "failed") {
    const upd = await supabase
      .from("diagnoses")
      .update({ status: "FAILED" })
      .eq("id", id);
    if (upd.error) {
      console.error("[dev/mock-result] status 갱신 실패:", upd.error.code, upd.error.message);
      return NextResponse.json({ error: "db_status" }, { status: 500 });
    }
    await sendTelegram(`[진단 실패] ${id} 확인 필요`, process.env.TELEGRAM_ERROR_CHAT_ID).catch(
      () => {},
    );
    return NextResponse.json({ ok: true, status: "FAILED" });
  }

  // completed
  const ins = await supabase
    .from("diagnosis_results")
    .insert({ diagnosis_id: id, ...MOCK_RESULT_ROW });
  if (ins.error) {
    if (ins.error.code === "23505") {
      return NextResponse.json({ error: "result_exists" }, { status: 409 });
    }
    console.error("[dev/mock-result] 결과 insert 실패:", ins.error.code, ins.error.message);
    return NextResponse.json({ error: "db_result" }, { status: 500 });
  }
  const upd = await supabase
    .from("diagnoses")
    .update({ status: "COMPLETED" })
    .eq("id", id);
  if (upd.error) {
    console.error("[dev/mock-result] status 갱신 실패:", upd.error.code, upd.error.message);
    return NextResponse.json({ error: "db_status" }, { status: 500 });
  }
  await sendTelegram(`신규 진단 완료: ${id}`, process.env.TELEGRAM_ADMIN_CHAT_ID).catch(() => {});
  return NextResponse.json({ ok: true, status: "COMPLETED" });
}
