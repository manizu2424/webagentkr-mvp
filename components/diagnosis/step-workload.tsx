import { OPTIONS } from "@/lib/options";
import { ChoiceGroup } from "@/components/diagnosis/fields/choice-group";
import { TextField } from "@/components/diagnosis/fields/text-field";
import type { StepProps } from "./step-props";

export function StepWorkload({ values, errors, set }: StepProps) {
  return (
    <div className="flex flex-col gap-6">
      <ChoiceGroup label="하루 반복 업무 시간" options={OPTIONS.dailyHours}
        value={values.dailyHours} onChange={(v) => set("dailyHours", v)} error={errors.dailyHours} />
      <ChoiceGroup label="담당 인원" options={OPTIONS.staffCount} columns={2}
        value={values.staffCount} onChange={(v) => set("staffCount", v)} error={errors.staffCount} />
      <ChoiceGroup label="월 처리 건수" options={OPTIONS.monthlyVolume} columns={3}
        value={values.monthlyVolume} onChange={(v) => set("monthlyVolume", v)} error={errors.monthlyVolume} />
      <TextField label="가장 불편한 업무 (선택)" value={values.painPoint ?? ""}
        onChange={(v) => set("painPoint", v)} error={errors.painPoint}
        hint="자유롭게 적어 주세요. 개인정보는 넣지 말아 주세요." maxLength={1000} />
    </div>
  );
}
