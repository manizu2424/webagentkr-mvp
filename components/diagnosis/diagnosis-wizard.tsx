"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  wizardReducer,
  initialWizardState,
  type Field,
} from "./reducer";
import { submitDiagnosis } from "./submit";
import { track } from "@/lib/analytics";
import { WizardProgress } from "./wizard-progress";
import { StepCompany } from "./step-company";
import { StepTools } from "./step-tools";
import { StepTasks } from "./step-tasks";
import { StepWorkload } from "./step-workload";
import { StepContact } from "./step-contact";
import { Honeypot } from "./fields/honeypot";

const STEP_TITLES = [
  "회사 정보",
  "지금 쓰는 도구",
  "반복하는 업무",
  "업무량과 문제",
  "상담 정보",
] as const;

export function DiagnosisWizard() {
  const router = useRouter();
  const [state, dispatch] = useReducer(wizardReducer, initialWizardState);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const prevStepRef = useRef(state.step);

  // step{N}_view — 각 단계 진입 시 1회 (첫 마운트 + 뒤로가기 재진입 포함)
  useEffect(() => {
    track(`step${state.step}_view`);
  }, [state.step]);

  // step{N}_complete — step 이 앞으로 이동한 경우에만 (NEXT 동기 검증 통과)
  useEffect(() => {
    if (state.step > prevStepRef.current) {
      track(`step${prevStepRef.current}_complete`);
    }
    prevStepRef.current = state.step;
  }, [state.step]);

  const set = (field: Field, value: unknown) =>
    dispatch({ type: "SET_VALUE", field, value });

  const onSubmit = async () => {
    dispatch({ type: "SUBMIT_START" });
    const r = await submitDiagnosis(state.values, idempotencyKey);
    if (r.kind === "ok") {
      track("step5_submit");
      router.push(`/diagnosis/${r.diagnosisId}`);
      return;
    }
    if (r.kind === "validation") {
      dispatch({
        type: "SUBMIT_FAIL",
        errors: r.errors,
        jumpTo: r.jumpTo ?? undefined,
        message: "입력값을 다시 확인해 주세요.",
      });
      return;
    }
    dispatch({
      type: "SUBMIT_FAIL",
      message:
        r.kind === "rate_limited"
          ? "요청이 많습니다. 잠시 후 다시 시도해 주세요."
          : "제출 중 문제가 발생했습니다. 다시 시도해 주세요.",
    });
  };

  const StepView = [StepCompany, StepTools, StepTasks, StepWorkload, StepContact][
    state.step - 1
  ];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 px-5 py-10">
      <WizardProgress step={state.step} />

      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-ink">
          {STEP_TITLES[state.step - 1]}
        </h1>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (state.step < 5) dispatch({ type: "NEXT" });
          else void onSubmit();
        }}
        className="flex flex-col gap-8"
      >
        <StepView values={state.values} errors={state.errors} set={set} />
        <Honeypot
          value={(state.values.hp_field as string) ?? ""}
          onChange={(v) => set("hp_field", v)}
        />

        {state.submitError && (
          <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.submitError}
          </p>
        )}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => dispatch({ type: "PREV" })}
            disabled={state.step === 1 || state.submitting}
            className="rounded-md px-4 py-2.5 text-sm text-ink-soft hover:text-ink disabled:opacity-40"
          >
            이전
          </button>
          <button
            type="submit"
            disabled={state.submitting}
            className="rounded-md bg-signal px-5 py-2.5 text-sm font-medium text-white hover:bg-[#182fc0] disabled:opacity-60"
          >
            {state.step < 5 ? "다음" : state.submitting ? "제출 중…" : "무료 진단 신청"}
          </button>
        </div>
      </form>
    </div>
  );
}
