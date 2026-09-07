import { OPTIONS } from "@/lib/options";
import { MultiSelect } from "@/components/diagnosis/fields/multi-select";
import type { StepProps } from "./step-props";

export function StepTasks({ values, errors, set }: StepProps) {
  return (
    <MultiSelect
      label="반복하는 업무"
      options={OPTIONS.repetitiveTasks}
      value={values.repetitiveTasks ?? []}
      onChange={(v) => set("repetitiveTasks", v)}
      error={errors.repetitiveTasks}
    />
  );
}
