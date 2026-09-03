// [스텁] GET /api/diagnoses/[id] — Phase 2.1 에서 구현 (기술 스펙 §4.2 + 결함 #12)
// 응답: { status } | { status, result }  ·  SUBMITTED 는 PROCESSING 으로 취급
// lead 정보(이름·연락처·이메일)는 절대 포함하지 않는다 (기획서 §16.1)
// 구현 시 시그니처: GET(req: NextRequest, ctx: RouteContext<"/api/diagnoses/[id]">)
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
