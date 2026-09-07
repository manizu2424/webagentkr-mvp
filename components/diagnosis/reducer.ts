import {
  DIAGNOSIS_STEP_FIELDS,
  diagnosisStepSchemas,
  type DiagnosisSubmission,
} from "@/lib/validation";

export type Step = 1 | 2 | 3 | 4 | 5;
export type Field = keyof DiagnosisSubmission;
export type FieldErrors = Partial<Record<Field, string>>;

export interface WizardState {
  step: Step;
  values: Partial<DiagnosisSubmission>;
  errors: FieldErrors;
  submitting: boolean;
  submitError: string | null;
}

export const initialWizardState: WizardState = {
  step: 1,
  values: { currentTools: [], repetitiveTasks: [], painPoint: "" },
  errors: {},
  submitting: false,
  submitError: null,
};

export type WizardAction =
  | { type: "SET_VALUE"; field: Field; value: unknown }
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_FAIL"; errors?: FieldErrors; jumpTo?: Step | null; message: string };

/** 한 단계의 값만 뽑아 해당 단계 스키마로 검증 */
export function validateStep(
  step: Step,
  values: Partial<DiagnosisSubmission>,
): { ok: boolean; errors: FieldErrors } {
  const slice: Record<string, unknown> = {};
  for (const f of DIAGNOSIS_STEP_FIELDS[step]) slice[f] = values[f];
  const r = diagnosisStepSchemas[step].safeParse(slice);
  if (r.success) return { ok: true, errors: {} };
  const errors: FieldErrors = {};
  for (const issue of r.error.issues) {
    const key = issue.path[0] as Field | undefined;
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}

/** 에러 필드 목록에서 가장 앞선 단계 번호 (단계 밖 필드뿐이면 null) */
export function firstStepWithError(keys: readonly string[]): Step | null {
  for (const step of [1, 2, 3, 4, 5] as const) {
    if (DIAGNOSIS_STEP_FIELDS[step].some((f) => keys.includes(f))) return step;
  }
  return null;
}

export function wizardReducer(
  state: WizardState,
  action: WizardAction,
): WizardState {
  switch (action.type) {
    case "SET_VALUE": {
      const errors = { ...state.errors };
      delete errors[action.field];
      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
        errors,
        submitError: null,
      };
    }
    case "NEXT": {
      const { ok, errors } = validateStep(state.step, state.values);
      if (!ok) return { ...state, errors };
      const step = Math.min(5, state.step + 1) as Step;
      return { ...state, step, errors: {} };
    }
    case "PREV": {
      const step = Math.max(1, state.step - 1) as Step;
      return { ...state, step, errors: {} };
    }
    case "SUBMIT_START":
      return { ...state, submitting: true, submitError: null };
    case "SUBMIT_FAIL":
      return {
        ...state,
        submitting: false,
        submitError: action.message,
        errors: action.errors ?? state.errors,
        step: action.jumpTo ?? state.step,
      };
    default:
      return state;
  }
}
