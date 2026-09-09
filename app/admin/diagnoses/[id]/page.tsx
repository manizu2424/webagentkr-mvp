import Link from "next/link";
import { notFound } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/session-client";
import { StatusBadge } from "@/components/admin/status-badge";

type Diagnosis = {
  id: string;
  status: string;
  website_status: string | null;
  current_tools: string[];
  repetitive_tasks: string[];
  daily_hours: string | null;
  staff_count: string | null;
  monthly_volume: string | null;
  purpose: string | null;
  budget_range: string | null;
  pain_point: string | null;
  created_at: string;
  leads: { company_name: string; industry: string; employee_count: string; contact_name: string; email: string; phone: string } | null;
};
type Result = {
  automation_score: number | null;
  recommended_tasks: { name: string; reason: string; difficulty?: string; estimatedMonthlySavedHours?: number }[];
  estimated_saved_hours: { min: number; max: number } | null;
  recommended_stack: string[] | null;
  implementation_steps: string[] | null;
  ai_summary: string | null;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-1.5 text-[0.88rem]">
      <span className="w-28 shrink-0 text-ink-soft">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-4">
      <h2 className="text-[0.8rem] font-semibold tracking-tight text-ink-soft">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export default async function DiagnosisDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSessionClient();

  const { data, error } = await supabase
    .from("diagnoses")
    .select(
      "id,status,website_status,current_tools,repetitive_tasks,daily_hours,staff_count,monthly_volume," +
        "purpose,budget_range,pain_point,created_at," +
        "leads(company_name,industry,employee_count,contact_name,email,phone)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return <p className="text-[0.9rem] text-danger">데이터를 불러오지 못했습니다.</p>;
  if (!data) notFound();
  const d = data as unknown as Diagnosis;

  const { data: rRow } = await supabase
    .from("diagnosis_results")
    .select("automation_score,recommended_tasks,estimated_saved_hours,recommended_stack,implementation_steps,ai_summary")
    .eq("diagnosis_id", id)
    .maybeSingle();
  const r = rRow as unknown as Result | null;
  const lead = d.leads;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[1.2rem] font-extrabold tracking-tight text-ink">{lead?.company_name ?? "진단"}</h1>
        <StatusBadge kind="diagnosis" value={d.status} />
      </div>

      <Section title="연락처">
        <Field label="이름" value={lead?.contact_name ?? "—"} />
        <Field label="전화" value={lead?.phone ?? "—"} />
        <Field label="이메일" value={lead?.email ?? "—"} />
      </Section>

      <Section title="진단 입력값">
        <Field label="업종" value={lead?.industry ?? "—"} />
        <Field label="직원 수" value={lead?.employee_count ?? "—"} />
        <Field label="홈페이지" value={d.website_status ?? "—"} />
        <Field label="사용 도구" value={d.current_tools.length ? d.current_tools.join(", ") : "—"} />
        <Field label="반복 업무" value={d.repetitive_tasks.length ? d.repetitive_tasks.join(", ") : "—"} />
        <Field label="하루 시간" value={d.daily_hours ?? "—"} />
        <Field label="담당 인원" value={d.staff_count ?? "—"} />
        <Field label="월 건수" value={d.monthly_volume ?? "—"} />
        <Field label="도입 목적" value={d.purpose ?? "—"} />
        <Field label="예산" value={d.budget_range ?? "—"} />
        <Field label="불편한 업무" value={d.pain_point ?? "—"} />
      </Section>

      <Section title="AI 결과">
        {r ? (
          <div className="flex flex-col gap-2 text-[0.88rem] text-ink">
            <p>자동화 준비도: {r.automation_score ?? "—"} / 100</p>
            <p>
              예상 절감 시간: {r.estimated_saved_hours ? `월 ${r.estimated_saved_hours.min}~${r.estimated_saved_hours.max}시간` : "—"}
            </p>
            <div>
              <p className="text-ink-soft">추천 업무</p>
              <ul className="mt-1 list-disc pl-5">
                {r.recommended_tasks.map((t, i) => (
                  <li key={i}>
                    {t.name}
                    {t.difficulty ? ` (난이도 ${t.difficulty}` : ""}
                    {t.estimatedMonthlySavedHours != null ? `${t.difficulty ? ", " : " ("}월 ${t.estimatedMonthlySavedHours}시간` : ""}
                    {t.difficulty || t.estimatedMonthlySavedHours != null ? ")" : ""}
                    {t.reason ? ` — ${t.reason}` : ""}
                  </li>
                ))}
              </ul>
            </div>
            <p>추천 스택: {r.recommended_stack?.length ? r.recommended_stack.join(", ") : "—"}</p>
            <div>
              <p className="text-ink-soft">실행 단계</p>
              <ol className="mt-1 list-decimal pl-5">
                {(r.implementation_steps ?? []).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
            <p className="text-ink-soft">요약</p>
            <p>{r.ai_summary ?? "—"}</p>
          </div>
        ) : (
          <p className="text-[0.88rem] text-ink-soft">결과 없음 (진단 상태: {d.status})</p>
        )}
      </Section>

      <Link href="/admin" className="mt-2 text-[0.82rem] text-ink-soft hover:text-ink">
        ← 상담 목록으로
      </Link>
    </div>
  );
}
