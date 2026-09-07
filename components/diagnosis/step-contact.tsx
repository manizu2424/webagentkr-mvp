import { OPTIONS } from "@/lib/options";
import { ChoiceGroup } from "@/components/diagnosis/fields/choice-group";
import { TextField } from "@/components/diagnosis/fields/text-field";
import { ConsentCheckbox } from "@/components/diagnosis/fields/consent-checkbox";
import type { StepProps } from "./step-props";

export function StepContact({ values, errors, set }: StepProps) {
  return (
    <div className="flex flex-col gap-6">
      <ChoiceGroup label="도입 목적" options={OPTIONS.purpose} columns={2}
        value={values.purpose} onChange={(v) => set("purpose", v)} error={errors.purpose} />
      <ChoiceGroup label="예산 범위" options={OPTIONS.budgetRange} columns={2}
        value={values.budgetRange} onChange={(v) => set("budgetRange", v)} error={errors.budgetRange} />
      <ChoiceGroup label="상담 방식" options={OPTIONS.consultingMethod} columns={2}
        value={values.consultingMethod} onChange={(v) => set("consultingMethod", v)} error={errors.consultingMethod} />
      <TextField label="이름" value={values.contactName ?? ""}
        onChange={(v) => set("contactName", v)} error={errors.contactName} maxLength={50} />
      <TextField label="이메일" type="email" inputMode="email" value={values.email ?? ""}
        onChange={(v) => set("email", v)} error={errors.email} />
      <TextField label="휴대폰 번호" type="tel" inputMode="tel" value={values.phone ?? ""}
        onChange={(v) => set("phone", v)} error={errors.phone} hint="010-1234-5678" />
      <ConsentCheckbox checked={values.consentAgreed === true}
        onChange={(v) => set("consentAgreed", v)} error={errors.consentAgreed} />
    </div>
  );
}
