// GET /api/diagnoses/[id]/pdf — 결과 PDF 다운로드 (공개, 진단 UUID 를 아는 사람만).
// lead 정보(이름·연락처·이메일·회사명)는 조회하지도 넣지도 않는다 (PII 경계).
import { type NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { toApiResult, type DiagnosisResultRow } from "@/lib/diagnosisResult";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/clientIp";
import { kstDate } from "@/lib/kst";
import { SITE_URL } from "@/lib/siteMeta";
import { attachmentDisposition } from "@/lib/pdf/filename";
import { DiagnosisPdf } from "@/lib/pdf/diagnosis-pdf";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" } as const;
const PDF_LIMIT = 20; // IP당 시간당
const HOUR_MS = 60 * 60 * 1000;

export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/diagnoses/[id]/pdf">,
) {
  const { id } = await ctx.params;

  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  const rl = checkRateLimit(`pdf:${getClientIp(req)}`, PDF_LIMIT, HOUR_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch (e) {
    console.error("[diagnoses/[id]/pdf] 클라이언트 생성 실패:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "internal" }, { status: 500, headers: NO_STORE });
  }

  const diag = await supabase
    .from("diagnoses")
    .select("status, created_at")
    .eq("id", id)
    .maybeSingle();

  if (diag.error) {
    console.error("[diagnoses/[id]/pdf] 조회 실패:", diag.error.code, diag.error.message);
    return NextResponse.json({ error: "internal" }, { status: 500, headers: NO_STORE });
  }
  if (!diag.data) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  const status = diag.data.status as string;
  if (status !== "COMPLETED") {
    return NextResponse.json(
      { error: "not_ready", status: status === "FAILED" ? "FAILED" : "PROCESSING" },
      { status: 409, headers: NO_STORE },
    );
  }

  const res = await supabase
    .from("diagnosis_results")
    .select(
      "automation_score, recommended_tasks, estimated_saved_hours, recommended_stack, implementation_steps, ai_summary",
    )
    .eq("diagnosis_id", id)
    .maybeSingle();

  if (res.error || !res.data) {
    console.error("[diagnoses/[id]/pdf] COMPLETED 인데 결과 행 없음:", id, res.error?.code, res.error?.message);
    return NextResponse.json({ error: "not_ready", status: "PROCESSING" }, { status: 409, headers: NO_STORE });
  }

  try {
    const buf = await renderToBuffer(
      <DiagnosisPdf
        result={toApiResult(res.data as DiagnosisResultRow)}
        diagnosedOn={kstDate(diag.data.created_at as string)}
        resultUrl={`${SITE_URL}/diagnosis/${id}`}
      />,
    );
    return new Response(new Uint8Array(buf), {
      headers: {
        ...NO_STORE,
        "Content-Type": "application/pdf",
        "Content-Disposition": attachmentDisposition(id),
        "Content-Length": String(buf.length),
      },
    });
  } catch (e) {
    console.error("[diagnoses/[id]/pdf] 렌더 실패:", e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: "internal" }, { status: 500, headers: NO_STORE });
  }
}
