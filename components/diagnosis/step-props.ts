import type { DiagnosisSubmission } from "@/lib/validation";
import type { Field, FieldErrors } from "./reducer";

export type StepProps = {
  values: Partial<DiagnosisSubmission>;
  errors: FieldErrors;
  set: (field: Field, value: unknown) => void;
};
