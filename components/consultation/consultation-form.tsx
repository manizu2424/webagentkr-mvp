"use client";

import { useState, type FormEvent } from "react";
import { OPTIONS } from "@/lib/options";
import { track } from "@/lib/analytics";
import { consultationSubmissionSchema, type ConsultationSubmission } from "@/lib/validation";
import { TextField } from "@/components/diagnosis/fields/text-field";
import { SelectField } from "@/components/diagnosis/fields/select-field";
import { ConsentCheckbox } from "@/components/diagnosis/fields/consent-checkbox";
import { Honeypot } from "@/components/diagnosis/fields/honeypot";
import { ConsentNotice } from "@/components/marketing/legal/consent-notice";
import { submitConsultation } from "./submit";
import { ConsultationSuccessView } from "./success-view";

type Values = Partial<ConsultationSubmission>;
type Errors = Partial<Record<keyof ConsultationSubmission, string>>;

export function ConsultationForm({ diagnosisId }: { diagnosisId: string | undefined }) {
  const [values, setValues] = useState<Values>({ diagnosisId, consentAgreed: undefined });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = <K extends keyof Values>(k: K, v: Values[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  if (done) return <ConsultationSuccessView />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsed = consultationSubmissionSchema.safeParse({
      ...values,
      diagnosisId,
      hp_field: values.hp_field ?? "",
    });
    if (!parsed.success) {
      const fieldErrors: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ConsultationSubmission | undefined;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      setFormError("입력값을 다시 확인해 주세요.");
      return;
    }

    setSubmitting(true);
    const r = await submitConsultation({ ...values, diagnosisId });
    setSubmitting(false);
    if (r.kind === "ok") {
      track("consultation_submit");
      setDone(true);
      return;
    }
    if (r.kind === "validation") {
      setErrors(r.errors);
      setFormError("입력값을 다시 확인해 주세요.");
      return;
    }
    setFormError(
      r.kind === "rate_limited"
        ? "요청이 많습니다. 잠시 후 다시 시도해 주세요."
        : r.kind === "not_found"
          ? "진단 정보를 찾을 수 없습니다. 처음부터 다시 시도해 주세요."
          : "신청 중 문제가 발생했습니다. 다시 시도해 주세요.",
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-[36rem] flex-col gap-9 px-5 py-10 sm:py-14">
      <div className="border-t-2 border-ink pt-3">
        <p className="font-flow text-[0.7rem] text-signal">상담 신청</p>
        <h1 className="mt-1.5 text-[1.5rem] leading-tight font-extrabold tracking-tight text-ink sm:text-[1.75rem]">
          전문가 상담 신청
        </h1>
      </div>

      {diagnosisId ? (
        <p className="max-w-[34rem] border-l-2 border-line bg-panel px-4 py-3 text-[0.9rem] leading-[1.7] text-ink-soft">
          이전 진단에 입력하신 연락처로 접수됩니다. 상담 방식과 희망 시기만 선택해 주세요.
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-9">
        {!diagnosisId && (
          <div className="flex flex-col gap-5">
            <TextField label="회사명" value={values.companyName ?? ""} onChange={(v) => set("companyName", v)} error={errors.companyName} maxLength={100} />
            <SelectField label="업종" options={OPTIONS.industry} value={values.industry} onChange={(v) => set("industry", v as Values["industry"])} error={errors.industry} />
            <SelectField label="직원 수" options={OPTIONS.employeeCount} value={values.employeeCount} onChange={(v) => set("employeeCount", v as Values["employeeCount"])} error={errors.employeeCount} />
            <TextField label="담당자 이름" value={values.contactName ?? ""} onChange={(v) => set("contactName", v)} error={errors.contactName} maxLength={50} />
            <TextField label="이메일" type="email" inputMode="email" value={values.email ?? ""} onChange={(v) => set("email", v)} error={errors.email} />
            <TextField label="휴대폰 번호" type="tel" inputMode="tel" value={values.phone ?? ""} onChange={(v) => set("phone", v)} error={errors.phone} hint="010-1234-5678" />
          </div>
        )}

        <div className="flex flex-col gap-5">
          <SelectField label="상담 방식" options={OPTIONS.consultingMethod} value={values.consultationType} onChange={(v) => set("consultationType", v as Values["consultationType"])} error={errors.consultationType} />
          <SelectField label="희망 상담 시기" options={OPTIONS.preferredDate} value={values.preferredDate} onChange={(v) => set("preferredDate", v as Values["preferredDate"])} error={errors.preferredDate} />
        </div>

        <ConsentCheckbox
          checked={values.consentAgreed === true}
          onChange={(v) => set("consentAgreed", v === true ? true : undefined)}
          error={errors.consentAgreed}
        />
        <Honeypot value={(values.hp_field as string) ?? ""} onChange={(v) => set("hp_field", v)} />

        {formError && (
          <p className="border-l-2 border-danger bg-danger/[0.05] px-4 py-3 text-[0.9rem] leading-relaxed text-danger">
            {formError}
          </p>
        )}

        <ConsentNotice action="상담을" />

        <div className="flex justify-end border-t border-line pt-6">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-signal px-6 text-[0.95rem] font-medium text-white transition-colors hover:bg-[#182fc0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:opacity-60 motion-reduce:transition-none"
          >
            {submitting ? "신청 중…" : "상담 신청"}
          </button>
        </div>
      </form>
    </div>
  );
}
