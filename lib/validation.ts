/**
 * API 라우트 요청 바디의 공유 계약 (기술 스펙 §4).
 * 클라이언트 폼 검증과 서버 재검증이 같은 스키마를 쓴다 — 클라이언트 검증은 우회 가능하므로
 * 서버에서 반드시 다시 검증한다 (기술 스펙 §5).
 */
import { z } from "zod";
import { OPTIONS } from "@/lib/options";

/** OPTIONS 의 readonly 라벨 배열 → zod enum (저장 값과 1:1) */
const opt = <K extends keyof typeof OPTIONS>(k: K) => z.enum(OPTIONS[k]);

/** 한국 휴대폰 번호 — 하이픈 유무 모두 허용 (010-1234-5678 / 01012345678) */
export const KR_PHONE_RE = /^01[016789]-?\d{3,4}-?\d{4}$/;
const phone = z
  .string()
  .trim()
  .regex(KR_PHONE_RE, { error: "휴대폰 번호 형식이 올바르지 않습니다" });

const email = z
  .email({ error: "이메일 형식이 올바르지 않습니다" })
  .trim()
  .toLowerCase();

/** 허니팟 — 봇이 채우는 필드. 항상 빈 문자열이어야 함 (기술 스펙 §5) */
const honeypot = z.string().max(0).optional().default("");

// ── POST /api/diagnoses (기술 스펙 §4.1 + docs/decisions.md D1) ──────────
export const diagnosisSubmissionSchema = z.object({
  // 1단계 회사 정보
  companyName: z.string().trim().min(1, { error: "회사명을 입력해 주세요" }).max(100),
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
  painPoint: z.string().trim().max(1000).optional().default(""),
  // 5단계 상담 정보  (D1: purpose 추가)
  purpose: opt("purpose"),
  budgetRange: opt("budgetRange"),
  consultingMethod: opt("consultingMethod"),
  contactName: z.string().trim().min(1, { error: "이름을 입력해 주세요" }).max(50),
  email,
  phone,
  // 동의 — 서버에서도 재검증 (true 아니면 400)
  consentAgreed: z.literal(true, {
    error: () => "개인정보 수집·이용 동의가 필요합니다",
  }),
  hp_field: honeypot,
});

export type DiagnosisSubmission = z.infer<typeof diagnosisSubmissionSchema>;

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
    diagnosisId: z.uuid().optional(),
    // 재입력 경로 (diagnosisId 없을 때 필수)
    companyName: z.string().trim().max(100).optional(),
    contactName: z.string().trim().max(50).optional(),
    email: email.optional(),
    phone: phone.optional(),
    industry: opt("industry").optional(),
    employeeCount: opt("employeeCount").optional(),
    // 공통
    preferredDate: opt("preferredDate"),
    consultationType: opt("consultingMethod"),
    hp_field: honeypot,
  })
  .superRefine((v, ctx) => {
    if (v.diagnosisId) return;
    for (const k of ["companyName", "contactName", "email", "phone"] as const) {
      if (!v[k]) {
        ctx.addIssue({
          code: "custom",
          path: [k],
          message: "진단 없이 상담을 신청하려면 연락처를 모두 입력해 주세요",
        });
      }
    }
  });

export type ConsultationSubmission = z.infer<typeof consultationSubmissionSchema>;
