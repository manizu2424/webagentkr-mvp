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
    <div className="mx-auto flex w-full max-w-[36rem] flex-col gap-9 px-5 py-10 sm:py-14">
      <WizardProgress step={state.step} />

      <div className="border-t-2 border-ink pt-3">
        <h1 className="text-[1.5rem] leading-tight font-extrabold tracking-tight text-ink sm:text-[1.75rem]">
          {STEP_TITLES[state.step - 1]}
        </h1>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (state.step < 5) dispatch({ type: "NEXT" });
          else void onSubmit();
        }}
        className="flex flex-col gap-9"
      >
        <StepView values={state.values} errors={state.errors} set={set} />
        <Honeypot
          value={(state.values.hp_field as string) ?? ""}
          onChange={(v) => set("hp_field", v)}
        />

        {state.submitError && (
          <p className="border-l-2 border-danger bg-danger/[0.05] px-4 py-3 text-[0.9rem] leading-relaxed text-danger">
            {state.submitError}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-line pt-6">
          <button
            type="button"
            onClick={() => dispatch({ type: "PREV" })}
            disabled={state.step === 1 || state.submitting}
            className="inline-flex min-h-11 items-center rounded-md px-4 text-[0.95rem] text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:opacity-30 motion-reduce:transition-none"
          >
            이전
          </button>
          <button
            type="submit"
            disabled={state.submitting}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-signal px-6 text-[0.95rem] font-medium text-white transition-colors hover:bg-[#182fc0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:opacity-60 motion-reduce:transition-none"
          >
            {state.step < 5 ? "다음" : state.submitting ? "제출 중…" : "무료 진단 신청"}
          </button>
        </div>
      </form>
    </div>
  );
}
