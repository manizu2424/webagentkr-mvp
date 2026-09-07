import { OPTIONS } from "@/lib/options";
import { MultiSelect } from "@/components/diagnosis/fields/multi-select";
import type { StepProps } from "./step-props";

export function StepTools({ values, errors, set }: StepProps) {
  return (
    <MultiSelect
      label="지금 쓰는 도구"
      options={OPTIONS.currentTools}
      value={values.currentTools ?? []}
      onChange={(v) => set("currentTools", v)}
      error={errors.currentTools}
    />
  );
}
