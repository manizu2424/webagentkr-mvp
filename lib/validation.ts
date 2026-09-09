/**
 * API 라우트 요청 바디의 공유 계약 (기술 스펙 §4).
 * 클라이언트 폼 검증과 서버 재검증이 같은 스키마를 쓴다 — 클라이언트 검증은 우회 가능하므로
 * 서버에서 반드시 다시 검증한다 (기술 스펙 §5).
 */
import { z } from "zod";
import { OPTIONS } from "@/lib/options";

/** select 미선택/잘못된 값일 때 필드별 한글 문구 (CLAUDE.md "한글 전용" 규약).
 *  폼이 미입력 필드에 undefined 를 보내므로, 누락·빈값·잘못된 enum 값을 모두 이 한 문구로 덮는다. */
const SELECT_MSG: Record<keyof typeof OPTIONS, string> = {
  industry: "업종을 선택해 주세요",
  employeeCount: "직원 수를 선택해 주세요",
  websiteStatus: "홈페이지 유무를 선택해 주세요",
  currentTools: "사용 도구를 선택해 주세요",
  repetitiveTasks: "반복 업무를 선택해 주세요",
  dailyHours: "하루 반복 업무 시간을 선택해 주세요",
  staffCount: "담당 인원을 선택해 주세요",
  monthlyVolume: "월간 처리 건수를 선택해 주세요",
  purpose: "도입 목적을 선택해 주세요",
  budgetRange: "예산 범위를 선택해 주세요",
  consultingMethod: "상담 방식을 선택해 주세요",
  preferredDate: "희망 상담 시기를 선택해 주세요",
};

/** OPTIONS 의 readonly 라벨 배열 → zod enum (저장 값과 1:1).
 *  message 미지정 시 SELECT_MSG 의 필드별 한글 문구를 쓴다. */
const opt = <K extends keyof typeof OPTIONS>(k: K, message?: string) =>
  z.enum(OPTIONS[k], { error: () => message ?? SELECT_MSG[k] });

/** 한국 휴대폰 번호 — 하이픈 유무 모두 허용 (010-1234-5678 / 01012345678) */
export const KR_PHONE_RE = /^01[016789]-?\d{3,4}-?\d{4}$/;
const phone = z
  .string({ error: "휴대폰 번호를 입력해 주세요" })
  .trim()
  .regex(KR_PHONE_RE, { error: "휴대폰 번호 형식이 올바르지 않습니다" });

const email = z
  .string({ error: "이메일을 입력해 주세요" })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "이메일 형식이 올바르지 않습니다" }));

/** 허니팟 — 봇이 채우는 필드. 항상 빈 문자열이어야 함 (기술 스펙 §5) */
const honeypot = z.string().max(0).optional().default("");

/** 필수 텍스트 — 누락(undefined)·빈값·초과를 모두 한글로. */
const requiredText = (missing: string, tooLong: string, max: number) =>
  z.string({ error: missing }).trim().min(1, { error: missing }).max(max, { error: tooLong });

// ── POST /api/diagnoses (기술 스펙 §4.1 + docs/decisions.md D1) ──────────
export const diagnosisSubmissionSchema = z.object({
  // 1단계 회사 정보
  companyName: requiredText(
    "회사명을 입력해 주세요",
    "회사명은 100자 이하로 입력해 주세요",
    100,
  ),
  industry: opt("industry"),
  employeeCount: opt("employeeCount"),
  websiteStatus: opt("websiteStatus"),
  // 2·3단계 복수 선택
  currentTools: z.array(opt("currentTools")).max(20).default([]),
  repetitiveTasks: z.array(opt("repetitiveTasks")).max(20).default([]),
  // 4단계 업무량·문제  (D1: staffCount 추가, "현재 처리 방식" 제거)
  dailyHours: opt("dailyHours"),
  staffCount: opt("staffCount"),
  monthlyVolume: opt("monthlyVolume"),
  painPoint: z
    .string()
    .trim()
    .max(1000, { error: "1000자 이하로 입력해 주세요" })
    .optional()
    .default(""),
  // 5단계 상담 정보  (D1: purpose 추가)
  purpose: opt("purpose"),
  budgetRange: opt("budgetRange"),
  consultingMethod: opt("consultingMethod"),
  contactName: requiredText(
    "이름을 입력해 주세요",
    "이름은 50자 이하로 입력해 주세요",
    50,
  ),
  email,
  phone,
  // 동의 — 서버에서도 재검증 (true 아니면 400)
  consentAgreed: z.literal(true, {
    error: () => "개인정보 수집·이용 동의가 필요합니다",
  }),
  // 멱등성 — 폼이 마운트 시 crypto.randomUUID() 로 생성. 내부 전용(N8N_PAYLOAD_KEYS 에 없음)
  idempotencyKey: z.uuid({ error: "잘못된 요청입니다" }),
  hp_field: honeypot,
});

export type DiagnosisSubmission = z.infer<typeof diagnosisSubmissionSchema>;

/** 단계별 필드 — 클라이언트 단계 검증 + 서버 400 시 점프 단계 계산에 쓴다 */
export const DIAGNOSIS_STEP_FIELDS = {
  1: ["companyName", "industry", "employeeCount", "websiteStatus"],
  2: ["currentTools"],
  3: ["repetitiveTasks"],
  4: ["dailyHours", "staffCount", "monthlyVolume", "painPoint"],
  5: [
    "purpose",
    "budgetRange",
    "consultingMethod",
    "contactName",
    "email",
    "phone",
    "consentAgreed",
  ],
} as const satisfies Record<1 | 2 | 3 | 4 | 5, readonly (keyof DiagnosisSubmission)[]>;

/** 단계별 부분 스키마 — "다음" 클릭 시 해당 단계만 검증 */
export const diagnosisStep1Schema = diagnosisSubmissionSchema.pick({
  companyName: true,
  industry: true,
  employeeCount: true,
  websiteStatus: true,
});
export const diagnosisStep2Schema = diagnosisSubmissionSchema.pick({
  currentTools: true,
});
export const diagnosisStep3Schema = diagnosisSubmissionSchema.pick({
  repetitiveTasks: true,
});
export const diagnosisStep4Schema = diagnosisSubmissionSchema.pick({
  dailyHours: true,
  staffCount: true,
  monthlyVolume: true,
  painPoint: true,
});
export const diagnosisStep5Schema = diagnosisSubmissionSchema.pick({
  purpose: true,
  budgetRange: true,
  consultingMethod: true,
  contactName: true,
  email: true,
  phone: true,
  consentAgreed: true,
});
export const diagnosisStepSchemas = {
  1: diagnosisStep1Schema,
  2: diagnosisStep2Schema,
  3: diagnosisStep3Schema,
  4: diagnosisStep4Schema,
  5: diagnosisStep5Schema,
} as const;

/** n8n webhook 으로 보낼 필드 (PII 제외 — 기술 스펙 §4.1, §16.1) */
export const N8N_PAYLOAD_KEYS = [
  "industry",
  "employeeCount",
  "websiteStatus",
  "currentTools",
  "repetitiveTasks",
  "dailyHours",
  "staffCount",
  "monthlyVolume",
  "purpose",
  "painPoint",
  "budgetRange",
] as const satisfies readonly (keyof DiagnosisSubmission)[];

// ── POST /api/consultations (기술 스펙 §4.3 + 결함 #11) ─────────────
// diagnosisId 가 있으면 그 진단의 lead 를 재사용, 없으면 연락처를 재입력받는다.
export const consultationSubmissionSchema = z
  .object({
    diagnosisId: z.uuid({ error: "잘못된 요청입니다" }).optional(),
    // 재입력 경로 (diagnosisId 없을 때 필수 — 아래 superRefine)
    companyName: z
      .string()
      .trim()
      .max(100, { error: "회사명은 100자 이하로 입력해 주세요" })
      .optional(),
    contactName: z
      .string()
      .trim()
      .max(50, { error: "이름은 50자 이하로 입력해 주세요" })
      .optional(),
    email: email.optional(),
    phone: phone.optional(),
    industry: opt("industry").optional(),
    employeeCount: opt("employeeCount").optional(),
    // 공통
    preferredDate: opt("preferredDate"),
    consultationType: opt("consultingMethod"),
    consentAgreed: z.literal(true, {
      error: () => "개인정보 수집·이용 동의가 필요합니다",
    }),
    hp_field: honeypot,
  })
  .superRefine((v, ctx) => {
    if (v.diagnosisId) return;
    const required = [
      "companyName",
      "contactName",
      "email",
      "phone",
      "industry",
      "employeeCount",
    ] as const;
    for (const k of required) {
      if (!v[k]) {
        ctx.addIssue({
          code: "custom",
          path: [k],
          message: "진단 없이 상담을 신청하려면 회사·연락처 정보를 모두 입력해 주세요",
        });
      }
    }
  });

export type ConsultationSubmission = z.infer<typeof consultationSubmissionSchema>;
