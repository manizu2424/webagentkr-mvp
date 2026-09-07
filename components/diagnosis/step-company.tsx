import { OPTIONS } from "@/lib/options";
import { TextField } from "@/components/diagnosis/fields/text-field";
import { SelectField } from "@/components/diagnosis/fields/select-field";
import { ChoiceGroup } from "@/components/diagnosis/fields/choice-group";
import type { StepProps } from "./step-props";

export function StepCompany({ values, errors, set }: StepProps) {
  return (
    <div className="flex flex-col gap-6">
      <TextField
        label="회사명"
        value={values.companyName ?? ""}
        onChange={(v) => set("companyName", v)}
        error={errors.companyName}
        maxLength={100}
      />
      <SelectField
        label="업종"
        options={OPTIONS.industry}
        value={values.industry}
        onChange={(v) => set("industry", v)}
        error={errors.industry}
      />
      <ChoiceGroup
        label="직원 수"
        options={OPTIONS.employeeCount}
        value={values.employeeCount}
        onChange={(v) => set("employeeCount", v)}
        error={errors.employeeCount}
        columns={3}
      />
      <ChoiceGroup
        label="홈페이지 유무"
        options={OPTIONS.websiteStatus}
        value={values.websiteStatus}
        onChange={(v) => set("websiteStatus", v)}
        error={errors.websiteStatus}
      />
    </div>
  );
}
