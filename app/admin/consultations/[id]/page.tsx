import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/session-client";
import { kstDate } from "@/lib/kst";
import { StatusBadge } from "@/components/admin/status-badge";
import { StatusSelect } from "@/components/admin/status-select";
import { MemoEditor } from "@/components/admin/memo-editor";

type Consultation = {
  id: string;
  status: string;
  consultation_type: string | null;
  preferred_date: string | null;
  suggested_service_type: string | null;
  memo: string | null;
  created_at: string;
  diagnosis_id: string | null;
  leads: {
    company_name: string;
    industry: string;
    employee_count: string;
    contact_name: string;
    email: string;
    phone: string;
  } | null;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 py-1.5 text-[0.88rem]">
      <span className="w-24 shrink-0 text-ink-soft">{label}</span>
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

export default async function ConsultationDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createSessionClient();

  const { data, error } = await supabase
    .from("consultations")
    .select(
      "id,status,consultation_type,preferred_date,suggested_service_type,memo,created_at,diagnosis_id," +
        "leads(company_name,industry,employee_count,contact_name,email,phone)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return <p className="text-[0.9rem] text-danger">데이터를 불러오지 못했습니다.</p>;
  }
  if (!data) notFound();
  const c = data as unknown as Consultation;

  let diagSummary: { score: number | null; summary: string | null } | null = null;
  let diagError = false;
  if (c.diagnosis_id) {
    const { data: dr, error: drError } = await supabase
      .from("diagnosis_results")
      .select("automation_score,ai_summary")
      .eq("diagnosis_id", c.diagnosis_id)
      .maybeSingle();
    if (drError) {
      diagError = true;
    } else {
      diagSummary = dr
        ? { score: dr.automation_score as number | null, summary: dr.ai_summary as string | null }
        : { score: null, summary: null };
    }
  }

  const lead = c.leads;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[1.2rem] font-extrabold tracking-tight text-ink">
          {lead?.company_name ?? "상담"}
        </h1>
        <StatusBadge kind="consultation" value={c.status} />
      </div>

      <Section title="연락처">
        <Field label="이름" value={lead?.contact_name ?? "—"} />
        <Field label="전화" value={lead?.phone ?? "—"} />
        <Field label="이메일" value={lead?.email ?? "—"} />
      </Section>

      <Section title="회사">
        <Field label="회사명" value={lead?.company_name ?? "—"} />
        <Field label="업종" value={lead?.industry ?? "—"} />
        <Field label="직원 수" value={lead?.employee_count ?? "—"} />
      </Section>

      <Section title="상담">
        <Field label="방식" value={c.consultation_type ?? "—"} />
        <Field label="희망 시기" value={c.preferred_date ?? "—"} />
        <Field label="추정 서비스" value={c.suggested_service_type ?? "—"} />
        <Field label="접수일" value={kstDate(c.created_at)} />
        <div className="flex gap-3 py-1.5 text-[0.88rem]">
          <span className="w-24 shrink-0 text-ink-soft">상태</span>
          <StatusSelect consultationId={c.id} current={c.status} />
        </div>
      </Section>

      <Section title="연결 진단">
        {c.diagnosis_id ? (
          <div className="text-[0.88rem]">
            <p className="text-ink">
              {diagError
                ? "진단 요약을 불러오지 못했습니다."
                : `자동화 준비도 ${diagSummary?.score ?? "—"}${
                    diagSummary?.summary ? ` · ${diagSummary.summary.slice(0, 80)}` : ""
                  }`}
            </p>
            <Link
              href={`/admin/diagnoses/${c.diagnosis_id}`}
              className="mt-1 inline-block text-signal underline underline-offset-2"
            >
              진단 상세 보기
            </Link>
          </div>
        ) : (
          <p className="text-[0.88rem] text-ink-soft">연결된 진단 없음</p>
        )}
      </Section>

      <Section title="메모">
        <MemoEditor consultationId={c.id} initial={c.memo ?? ""} />
      </Section>

      <Link href="/admin" className="mt-2 text-[0.82rem] text-ink-soft hover:text-ink">
        ← 목록으로
      </Link>
    </div>
  );
}
