# 상담 흐름 구현 계획 (Phase 3 · 묶음 A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 방문자가 `/consultation`(진단 결과 CTA 또는 직접 진입)에서 상담을 신청하면 `consultations` 행(`status=NEW`)이 생기고 Telegram 관리자 채널에 신규 상담 알림이 간다.

**Architecture:** `POST /api/consultations`(공개, 스팸 방어)가 `diagnosisId` 유무로 분기한다 — 있으면 그 진단의 lead 를 `diagnoses.lead_id` 역참조로 재사용하고 `lib/serviceTagging.ts`로 `suggested_service_type`을 도출, 없으면 연락처를 새로 받아 `leads`를 email 기준 upsert 하고 태그는 `null`. 상담 폼은 Phase 1·2 패턴대로 **서버 컴포넌트 shell + 클라이언트 폼 아일랜드**(단일 화면, wizard 아님). `lib/serviceTagging.ts`는 시크릿을 만지지 않는 순수 함수.

**Tech Stack:** Next.js 16.3.4 (App Router, RSC), React 19.2.8, TypeScript 5, Tailwind v4(CSS 설정), zod 4.5, `@supabase/supabase-js` 2.x. 유닛 테스트는 러너 없이 throwaway `_wak_*.mts` + `node --experimental-strip-types`.

**Spec:** `docs/superpowers/specs/2026-09-08-consultation-flow-design.md` (executor 는 이 스펙과 계획을 함께 읽는다)

## Global Constraints

- **Next 16**: `params`·`searchParams`는 Promise. `PageProps<'/route'>`·`RouteContext<'/route'>`는 `next dev`/`next build`가 생성하는 전역 타입 — **import 하지 않는다**. 린트는 `npm run lint`(eslint 직접, `next lint` 없음).
- **테스트 러너 없음**: 순수 로직은 프로젝트 루트에 `_wak_*.mts`를 만들어 `node --experimental-strip-types _wak_*.mts`로 실행하고 **통과 확인 후 삭제**한다(Phase 0·2 패턴). `.mts`가 import 하는 모듈(및 그 모듈이 다시 import 하는 것)은 값(런타임) import 에 `@/` 별칭·확장자 없는 상대경로·`import "server-only"`를 쓰면 안 된다(plain node 가 해석 못 함). **`import type`은 별칭이든 상대경로든 허용** — node 타입 스트리핑이 통째로 제거하므로 경로를 해석하지 않는다. `lib/serviceTagging.ts`는 이 이유로 `ServiceType`을 `import type { ServiceType } from "./options"`(상대경로 타입-only)로 가져온다. 라우트·컴포넌트는 `npm run build` + `npm run lint` + `npx tsc --noEmit` + curl/Playwright.
- **`lib/serviceTagging.ts`는 `import "server-only"`를 넣지 않는다** — 시크릿을 만지지 않는 순수 함수이고 러너 없는 유닛 테스트 대상이다(`lib/diagnosisResult.ts`와 동일 사유).
- **PII 경계** (기획서 §16.1, 법적 요구): `POST /api/consultations`는 응답 바디에 lead 정보(이름·전화·이메일)를 **절대** 넣지 않는다. `diagnosisId` 경로에서 `diagnoses`는 `lead_id, purpose, budget_range, website_status`만 select 한다. Telegram 문구에 **회사명은 허용**(CLAUDE.md §16.1 기존 정책) — 이 경우에만 `leads.company_name` 단일 컬럼을 추가 select 한다. 이름·전화·이메일은 어떤 경로에서도 select 하지 않는다.
- **service_role 키**: `SUPABASE_SERVICE_ROLE_KEY`는 클라이언트 번들 / `NEXT_PUBLIC_*` / 클라이언트 컴포넌트에 들어가면 안 된다. API 라우트는 `lib/supabase/server.ts`의 `createServiceClient()`만 쓴다. 이 함수는 env 누락 시 **throw** 하므로 try/catch 로 감싸 500 `{error:"internal"}` 로 마감한다(Phase 2 패턴).
- **로그**: Supabase/PostgREST 오류는 항상 `error.code` + `error.message`만 남긴다 — 원본 오류 객체를 통째로 로그하지 않는다(PII 가 `details`에 섞일 수 있음).
- **에러 키는 기존 코드와 통일** (`app/api/diagnoses/route.ts` 규약): JSON 파싱 실패 = `invalid_json`, zod 실패 = `{error:"validation", issues}`. 스펙 §4.4의 `bad_json`/`invalid`는 이 이름으로 대체한다. 나머지: `consent_required`(400), `rate_limited`(429), `diagnosis_not_found`(404), `internal`(500).
- **rate limit**: `checkRateLimit("consult:" + getClientIp(req), 5, 60*60*1000)`. 진단 제출(`getClientIp(req)` 순수 키)과 **별도 버킷**.
- **상태**: 새 `consultations` 행은 항상 `status: "NEW"`. `preferred_date`·`consultation_type`은 `lib/options.ts`의 `preferredDate`·`consultingMethod` 라벨을 그대로 저장(D2 — 라벨이 곧 저장값).
- **serviceTagging 우선순위** (스펙 §3.2, 사용자 확정 — §11.3 원문 순서에서 재배치): ① "방향성 파악"(purpose/budget) → `AI Consulting` ② `websiteStatus==="없음"` 또는 website 키워드 → `Smart Website` ③ agent 키워드 → `AI Agent` ④ 스택에 `n8n` 포함 **그리고 LLM 마커 없음** → `n8n Automation` ⑤ 그 외 → `AI Automation`. `r === null` → `null`.
- **마이그레이션 없음.** `consultations`·`leads`·enum 전부 그대로.
- **사용자 문구는 한국어.** 디자인은 라이트 전용, `--wak-*` 토큰(`text-ink` / `text-ink-soft` / `border-line` / `bg-panel` / `bg-paper` / `text-signal` / `text-danger` / `font-flow` / `font-display`), Pretendard + IBM Plex Mono. 진단 폼 필드 프리미티브(`components/diagnosis/fields/*`)와 시각·a11y 를 그대로 따른다.
- **커밋 트레일러** (매 커밋 끝에):
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01Vq88uPS2SMUNvuCLiwyv4n
  ```
  커밋은 현재 브랜치 `feat/consultation-flow`에 로컬로 한다. **push 금지.**

---

## 파일 구조

**신규**
| 경로 | 책임 |
|---|---|
| `lib/serviceTagging.ts` | `computeServiceType(d, r)` — `diagnoses`+`diagnosis_results` 필드 → `ServiceType \| null` 순수 매핑. 타입 `TaggingDiagnosis`·`TaggingResult` export |
| `components/consultation/consultation-form.tsx` | `"use client"` 폼 아일랜드. 상태(useState) 소유, 두 경로(diagnosisId 유무) 필드 분기, 제출·성공/오류 렌더 |
| `components/consultation/submit.ts` | `submitConsultation(values, fetchImpl?)` — `POST /api/consultations` 호출 + 응답 매핑 |
| `components/consultation/success-view.tsx` | 제출 성공 화면 (접수 안내 + 홈 링크) |

**수정**
| 경로 | 변경 |
|---|---|
| `lib/validation.ts` | `consultationSubmissionSchema`에 `consentAgreed: z.literal(true, …)` 추가, `superRefine` 필수 목록에 `industry`·`employeeCount` 추가, `preferredDate`·`consultationType`·`diagnosisId`에 한글 `error:` 메시지 |
| `app/api/consultations/route.ts` | 501 스텁 → 전체 구현 (스팸 방어 → 분기 → 태깅 → insert → Telegram) |
| `app/consultation/page.tsx` | 스텁 → 서버 shell(헤더 워드마크 + Pretendard/Plex) + `<ConsultationForm diagnosisId={…} />` |
| `components/diagnosis/result/result-view.tsx` | `completed` 케이스에서 `<ResultCards>`에 `diagnosisId` 전달 |
| `components/diagnosis/result/result-cards.tsx` | `diagnosisId` prop 추가, 하단에 상담 CTA `<Link>` + `track("consultation_cta_click", {from:"result"})` |
| `task.md` | 묶음 A A1~A6 체크 + 이탈·메모 |

**임시(태스크 내 생성 후 삭제)**
| 경로 | 용도 |
|---|---|
| `_wak_tagging.mts` | Task 1 유닛 검증. 통과 후 `rm`. |
| `_wak_consult_schema.mts` | Task 2 스키마 검증. 통과 후 `rm`. |

**재사용 (변경 없음, import 만)**: `components/diagnosis/fields/{text-field,select-field,consent-checkbox,honeypot}.tsx`, `lib/analytics.ts`(`track`), `lib/options.ts`(`OPTIONS`, `SERVICE_TYPES`, `ServiceType`), `lib/clientIp.ts`, `lib/rateLimit.ts`, `lib/telegram.ts`, `lib/supabase/server.ts`.

> **`ConsentCheckbox` 참고**: 현재 `/privacy` 링크만 있고 "(필수)" 문구 포함. 이 계획은 **그대로 재사용**한다. `/terms` 링크 추가와 상담용 동의 문구 확정은 묶음 C 범위.

---

## Task 1: `lib/serviceTagging.ts` — 서비스 유형 태깅 순수 함수

**Files:**
- Create: `lib/serviceTagging.ts`
- Test: `_wak_tagging.mts` (repo root, 통과 후 삭제)

**Interfaces:**
- Consumes: `import type { ServiceType } from "./options"` (상대경로, 타입만 — `SERVICE_TYPES` 값은 import 하지 않는다. `@/` 별칭도 안 씀 — `_wak` 실행 안정성)
- Produces:
  - `interface TaggingDiagnosis { purpose: string | null; budgetRange: string | null; websiteStatus: string | null }`
  - `interface TaggingResult { recommendedStack: string[]; priorityTasks: { name: string; reason: string }[] }`
  - `function computeServiceType(d: TaggingDiagnosis, r: TaggingResult | null): ServiceType | null`

- [ ] **Step 1: `_wak_tagging.mts` 작성 (실패하는 테스트)**

```ts
// _wak_tagging.mts — 통과 후 삭제. node --experimental-strip-types _wak_tagging.mts
import { computeServiceType } from "./lib/serviceTagging.ts";
import assert from "node:assert/strict";

const noWeb = { websiteStatus: "있음 (운영 중)", purpose: "업무 시간 절감", budgetRange: "300~500만원" };

// r === null → null
assert.equal(computeServiceType({ ...noWeb }, null), null);

// ① 방향성 파악 (purpose) → AI Consulting — n8n 스택이 있어도 먼저 단락
assert.equal(
  computeServiceType(
    { ...noWeb, purpose: "방향성 파악 (무엇부터 할지 모름)" },
    { recommendedStack: ["n8n", "Supabase"], priorityTasks: [{ name: "x", reason: "y" }] },
  ),
  "AI Consulting",
);
// ① 방향성 파악 (budget) → AI Consulting
assert.equal(
  computeServiceType(
    { ...noWeb, budgetRange: "미정 (방향성부터 파악)" },
    { recommendedStack: ["n8n"], priorityTasks: [] },
  ),
  "AI Consulting",
);

// ② websiteStatus "없음" → Smart Website
assert.equal(
  computeServiceType(
    { ...noWeb, websiteStatus: "없음" },
    { recommendedStack: ["n8n"], priorityTasks: [] },
  ),
  "Smart Website",
);
// ② website 키워드 → Smart Website
assert.equal(
  computeServiceType(
    { ...noWeb },
    { recommendedStack: ["Website 빌더"], priorityTasks: [] },
  ),
  "Smart Website",
);

// ③ agent 키워드 → AI Agent
assert.equal(
  computeServiceType(
    { ...noWeb },
    { recommendedStack: ["n8n"], priorityTasks: [{ name: "사내 문서 검색 봇", reason: "RAG" }] },
  ),
  "AI Agent",
);

// ④ n8n 포함 + LLM 마커 없음 → n8n Automation
assert.equal(
  computeServiceType(
    { ...noWeb },
    { recommendedStack: ["n8n", "Supabase", "Telegram"], priorityTasks: [{ name: "견적서 발행", reason: "정형 입력" }] },
  ),
  "n8n Automation",
);
// ⑤ n8n 포함 + LLM 마커 있음(OpenAI) → AI Automation (기본값)
assert.equal(
  computeServiceType(
    { ...noWeb },
    { recommendedStack: ["n8n", "OpenAI API"], priorityTasks: [{ name: "문의 분류", reason: "유형 자동 분류" }] },
  ),
  "AI Automation",
);
// ⑤ n8n 없음 → AI Automation
assert.equal(
  computeServiceType(
    { ...noWeb },
    { recommendedStack: ["Zapier"], priorityTasks: [] },
  ),
  "AI Automation",
);

console.log("OK _wak_tagging");
```

- [ ] **Step 2: 실패 확인**

Run: `node --experimental-strip-types _wak_tagging.mts`
Expected: FAIL — `Cannot find module './lib/serviceTagging.ts'` (아직 없음)

- [ ] **Step 3: `lib/serviceTagging.ts` 구현**

```ts
// 상담 신청 시점 서비스 유형 자동 태깅 (기획서 §11.3, docs/decisions.md D3, 결함 #8).
// 이 값은 확정이 아니라 "상담 시작 전 가설"이다 — 상담 중 검증한다.
// n8n 이 아니라 POST /api/consultations 에서 계산한다.
// "server-only" 를 넣지 않는다(러너 없는 유닛 테스트 대상, 순수 함수).
// ServiceType 은 상대경로 타입-only import — _wak_*.mts 가 node 로 직접 실행되므로
// @/ 별칭·값 import 를 피한다(node 타입 스트리핑이 import type 을 통째로 제거).
import type { ServiceType } from "./options";

export interface TaggingDiagnosis {
  purpose: string | null; // diagnoses.purpose
  budgetRange: string | null; // diagnoses.budget_range
  websiteStatus: string | null; // diagnoses.website_status
}

export interface TaggingResult {
  recommendedStack: string[]; // diagnosis_results.recommended_stack
  priorityTasks: { name: string; reason: string }[]; // diagnosis_results.recommended_tasks (부분)
}

// 아래 라벨 리터럴은 lib/options.ts 의 purpose / budgetRange 값과 동기화돼 있어야 한다(D2).
const PURPOSE_DIRECTION = "방향성 파악 (무엇부터 할지 모름)";
const BUDGET_UNDECIDED = "미정 (방향성부터 파악)";

const WEBSITE_KEYWORDS = ["website", "웹사이트", "홈페이지", "랜딩", "smart website"];
const AGENT_KEYWORDS = ["문서 검색", "사내 문서", "상담 ai", "챗봇", "rag", "지식베이스", "ai agent"];
const LLM_MARKERS = ["openai", "gpt", "llm", " ai "];

export function computeServiceType(
  d: TaggingDiagnosis,
  r: TaggingResult | null,
): ServiceType | null {
  if (r === null) return null;

  const haystack = [
    ...r.recommendedStack,
    ...r.priorityTasks.flatMap((t) => [t.name, t.reason]),
  ]
    .join(" ")
    .toLowerCase();
  const stackLower = r.recommendedStack.map((s) => s.toLowerCase());

  // ① 고객 의도 신호를 먼저 단락
  if (d.purpose === PURPOSE_DIRECTION || d.budgetRange === BUDGET_UNDECIDED) {
    return "AI Consulting";
  }
  // ② 홈페이지
  if (d.websiteStatus === "없음" || WEBSITE_KEYWORDS.some((k) => haystack.includes(k))) {
    return "Smart Website";
  }
  // ③ 에이전트성
  if (AGENT_KEYWORDS.some((k) => haystack.includes(k))) {
    return "AI Agent";
  }
  // ④ 순수 워크플로 자동화 (n8n 있고 LLM 요소 없음)
  if (stackLower.includes("n8n") && !LLM_MARKERS.some((m) => haystack.includes(m))) {
    return "n8n Automation";
  }
  // ⑤ 기본값 — AI 가 개입하는 일반 반복 업무 자동화
  return "AI Automation";
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --experimental-strip-types _wak_tagging.mts`
Expected: `OK _wak_tagging`

- [ ] **Step 5: lint + 타입 확인**

Run: `npx eslint lib/serviceTagging.ts && npx tsc --noEmit`
Expected: exit 0, 출력 없음

- [ ] **Step 6: 임시 테스트 삭제 + 커밋**

```bash
rm _wak_tagging.mts
git add lib/serviceTagging.ts
git commit -m "$(cat <<'EOF'
feat(consultation): 서비스 유형 태깅 순수 함수 (A1)

diagnoses + diagnosis_results → ServiceType | null. 우선순위는
"방향성 파악"(purpose/budget) 먼저 단락 → Website → Agent →
n8n(LLM 마커 없을 때만) → AI Automation(기본). 결과 없으면 null.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Vq88uPS2SMUNvuCLiwyv4n
EOF
)"
```

- [ ] **Step 7: `git status` 클린 확인** — `_wak_tagging.mts` 흔적이 커밋/트리에 없어야 한다.

---

## Task 2: `consultationSubmissionSchema` 보강 (`lib/validation.ts`)

**Files:**
- Modify: `lib/validation.ts` (`consultationSubmissionSchema` 정의 — 현재 파일의 `// ── POST /api/consultations` 블록)
- Test: `_wak_consult_schema.mts` (repo root, 통과 후 삭제)

**Interfaces:**
- Consumes: 기존 `opt`, `email`, `phone`, `honeypot` 헬퍼 (같은 파일)
- Produces: `consultationSubmissionSchema` (zod), `type ConsultationSubmission = z.infer<...>` — 추가 필드:
  - `consentAgreed: true` (literal)
  - `superRefine`: `diagnosisId` 없으면 `companyName, contactName, email, phone, industry, employeeCount` 전부 필수

- [ ] **Step 1: `_wak_consult_schema.mts` 작성 (실패하는 테스트)**

```ts
// _wak_consult_schema.mts — 통과 후 삭제.
// 이 파일은 @/ 값 import 를 못 쓰므로 zod 스키마를 직접 재현하지 않고,
// 컴파일된 스키마를 상대경로로 불러 동작만 검증한다. lib/validation.ts 는 "zod" 만
// 런타임 import 하고 "@/lib/options" 는 값 import 이므로 node 가 해석 못 한다 →
// 대신 tsc 로 타입, 그리고 라우트 curl(Task 3)로 런타임을 검증한다.
// 여기서는 "스키마 파일이 tsc 를 통과하는지"만 확인하는 스텁을 둔다.
console.log("SKIP _wak_consult_schema — 런타임 검증은 Task 3 curl 로 (아래 Step 2 참조)");
```

> **주의:** `lib/validation.ts`는 `import { OPTIONS } from "@/lib/options"`(값 import)를 하므로 `node --experimental-strip-types`로 직접 불러올 수 없다. 이 태스크의 실질 검증은 **(a) `npx tsc --noEmit` 통과 + (b) Task 3 의 curl 케이스**(동의 누락 → 400, 직접경로 필수 누락 → 400)로 한다. `_wak_consult_schema.mts`는 형식상 두되 로직을 넣지 않는다.

- [ ] **Step 2: 현재 `consultationSubmissionSchema` 확인**

Run: `sed -n '/POST \/api\/consultations/,/ConsultationSubmission/p' lib/validation.ts`
Expected: `diagnosisId`, `companyName?`, `contactName?`, `email?`, `phone?`, `industry?`, `employeeCount?`, `preferredDate`, `consultationType`, `hp_field` + `superRefine`(현재 company/name/email/phone 만 필수). `consentAgreed` **없음**.

- [ ] **Step 3: 스키마 수정**

`lib/validation.ts`의 `consultationSubmissionSchema`를 아래로 교체 (블록 전체):

```ts
// ── POST /api/consultations (기술 스펙 §4.3 + 결함 #11) ─────────────
// diagnosisId 가 있으면 그 진단의 lead 를 재사용, 없으면 연락처를 재입력받는다.
export const consultationSubmissionSchema = z
  .object({
    diagnosisId: z.uuid({ error: "잘못된 요청입니다" }).optional(),
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
```

- [ ] **Step 4: 타입 + 린트 확인**

Run: `npx tsc --noEmit && npx eslint lib/validation.ts`
Expected: exit 0

- [ ] **Step 5: 임시 파일 삭제 + 커밋**

```bash
rm _wak_consult_schema.mts
git add lib/validation.ts
git commit -m "$(cat <<'EOF'
feat(consultation): consultationSubmissionSchema 에 동의·필수필드 보강 (A3)

- consentAgreed: z.literal(true) 추가 (서버 재검증)
- diagnosisId 없는 경로에 industry·employeeCount 필수 추가
  (leads.industry / employee_count 가 NOT NULL)
- diagnosisId·preferredDate·consultationType 한글 error 메시지

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Vq88uPS2SMUNvuCLiwyv4n
EOF
)"
```

---

## Task 3: `POST /api/consultations` 구현

**Files:**
- Modify: `app/api/consultations/route.ts` (501 스텁 → 전체 구현)

**Interfaces:**
- Consumes:
  - `computeServiceType`, `TaggingDiagnosis`, `TaggingResult` (Task 1, `@/lib/serviceTagging`)
  - `consultationSubmissionSchema` (Task 2, `@/lib/validation`)
  - `createServiceClient` (`@/lib/supabase/server`), `getClientIp` (`@/lib/clientIp`), `checkRateLimit` (`@/lib/rateLimit`), `sendTelegram` (`@/lib/telegram`)
- Produces (HTTP 계약 — Task 4 의 `submitConsultation` 이 의존):
  - `200 { consultationId: string }` — 성공
  - `200 { ok: true }` — 허니팟
  - `400 { error: "invalid_json" }` / `400 { error: "consent_required" }` / `400 { error: "validation", issues }`
  - `429 { error: "rate_limited", retryAfterSec }` (헤더 `Retry-After`)
  - `404 { error: "diagnosis_not_found" }`
  - `500 { error: "internal" }`

- [ ] **Step 1: 라우트 구현**

`app/api/consultations/route.ts` 전체를 아래로 교체:

```ts
// POST /api/consultations — 공개, 스팸 방어 (기술 스펙 §4.3 + 결함 #11 + D3).
// diagnosisId 있으면 그 진단의 lead 재사용 + serviceTagging, 없으면 email upsert + 태그 null.
// 관리자 콜백/알림은 이 라우트가 직접 한다(상담은 n8n 경로를 안 탄다).
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/clientIp";
import { checkRateLimit } from "@/lib/rateLimit";
import { consultationSubmissionSchema } from "@/lib/validation";
import {
  computeServiceType,
  type TaggingDiagnosis,
  type TaggingResult,
} from "@/lib/serviceTagging";
import { sendTelegram } from "@/lib/telegram";

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  // 1. JSON 파싱
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // 2. 허니팟 — present + non-empty 는 전부 봇. 200 반환하되 저장하지 않는다.
  const hp = (body as { hp_field?: unknown })?.hp_field;
  if (hp !== undefined && hp !== null && hp !== "") {
    console.warn("[consultations] 허니팟 채워짐 — 무시");
    return NextResponse.json({ ok: true });
  }

  // 3. 동의 — zod 전에 명시적으로 400 (기존 diagnoses 규약)
  if ((body as { consentAgreed?: unknown })?.consentAgreed !== true) {
    return NextResponse.json({ error: "consent_required" }, { status: 400 });
  }

  // 4. rate limit — 진단과 별도 버킷
  const rl = checkRateLimit("consult:" + getClientIp(req), RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSec: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  // 5. zod
  const parsed = consultationSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // 6. Supabase
  let supabase;
  try {
    supabase = createServiceClient();
  } catch (e) {
    console.error(
      "[consultations] 클라이언트 생성 실패:",
      e instanceof Error ? e.message : String(e),
    );
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  let leadId: string;
  let companyName: string | null = null;
  let suggested: ReturnType<typeof computeServiceType> = null;

  if (data.diagnosisId) {
    // 6a. 진단 경로 — lead 재사용 + 태깅
    const diag = await supabase
      .from("diagnoses")
      .select("lead_id, purpose, budget_range, website_status")
      .eq("id", data.diagnosisId)
      .maybeSingle();
    if (diag.error) {
      console.error("[consultations] diagnoses 조회 실패:", diag.error.code, diag.error.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    if (!diag.data) {
      return NextResponse.json({ error: "diagnosis_not_found" }, { status: 404 });
    }
    leadId = diag.data.lead_id as string;

    // 회사명만 별도 select (Telegram 문구용 — PII 경계상 회사명은 허용)
    const leadRow = await supabase
      .from("leads")
      .select("company_name")
      .eq("id", leadId)
      .maybeSingle();
    companyName = (leadRow.data?.company_name as string | undefined) ?? null;

    // diagnosis_results 는 없을 수 있다 (FAILED/미완 진단)
    const resRow = await supabase
      .from("diagnosis_results")
      .select("recommended_stack, recommended_tasks")
      .eq("diagnosis_id", data.diagnosisId)
      .maybeSingle();

    const taggingDiag: TaggingDiagnosis = {
      purpose: (diag.data.purpose as string | null) ?? null,
      budgetRange: (diag.data.budget_range as string | null) ?? null,
      websiteStatus: (diag.data.website_status as string | null) ?? null,
    };
    const taggingResult: TaggingResult | null = resRow.data
      ? {
          recommendedStack: Array.isArray(resRow.data.recommended_stack)
            ? (resRow.data.recommended_stack as string[])
            : [],
          priorityTasks: Array.isArray(resRow.data.recommended_tasks)
            ? (resRow.data.recommended_tasks as { name: string; reason: string }[])
            : [],
        }
      : null;
    suggested = computeServiceType(taggingDiag, taggingResult);
  } else {
    // 6b. 직접 경로 — email upsert. superRefine 이 이미 전 필드 존재를 보장.
    const up = await supabase
      .from("leads")
      .upsert(
        {
          company_name: data.companyName,
          industry: data.industry,
          employee_count: data.employeeCount,
          contact_name: data.contactName,
          email: data.email,
          phone: data.phone,
          consulting_method: data.consultationType, // 미러
        },
        { onConflict: "email" },
      )
      .select("id")
      .single();
    if (up.error || !up.data) {
      console.error("[consultations] leads upsert 실패:", up.error?.code, up.error?.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    leadId = up.data.id as string;
    companyName = data.companyName ?? null;
  }

  // 7. consultations insert
  const ins = await supabase
    .from("consultations")
    .insert({
      lead_id: leadId,
      diagnosis_id: data.diagnosisId ?? null,
      suggested_service_type: suggested,
      preferred_date: data.preferredDate,
      consultation_type: data.consultationType,
      status: "NEW",
    })
    .select("id")
    .single();
  if (ins.error || !ins.data) {
    console.error("[consultations] insert 실패:", ins.error?.code, ins.error?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  // 8. Telegram — 회사명은 허용, 이름·전화·이메일은 넣지 않는다
  await sendTelegram(
    `[신규 상담] ${companyName ?? "(회사명 미상)"}\n` +
      `방식: ${data.consultationType} / 시기: ${data.preferredDate}\n` +
      `추정 서비스 유형: ${suggested ?? "미정 (진단 없음/미완)"}` +
      (data.diagnosisId ? `\n진단: ${data.diagnosisId}` : ""),
    process.env.TELEGRAM_ADMIN_CHAT_ID,
  ).catch(() => {});

  return NextResponse.json({ consultationId: ins.data.id });
}
```

- [ ] **Step 2: 빌드 + 린트 + 타입**

Run: `npm run build && npx eslint app/api/consultations/route.ts && npx tsc --noEmit`
Expected: exit 0. 라우트 목록에 `ƒ /api/consultations`.

- [ ] **Step 3: curl — Supabase 없이 도달하는 경로 (dev 서버)**

`npm run dev` 를 띄운 별도 셸에서:

```bash
# 허니팟 → 200 {ok:true}
curl -s -XPOST localhost:3000/api/consultations -H 'content-type: application/json' \
  -d '{"hp_field":"bot","consentAgreed":true,"preferredDate":"가능한 빨리","consultationType":"전화"}'
# 기대: {"ok":true}

# 동의 없음 → 400 consent_required
curl -s -o /dev/null -w '%{http_code}\n' -XPOST localhost:3000/api/consultations \
  -H 'content-type: application/json' -d '{"preferredDate":"가능한 빨리","consultationType":"전화"}'
# 기대: 400

# zod 실패 (직접경로 필수 누락) → 400 validation
curl -s -XPOST localhost:3000/api/consultations -H 'content-type: application/json' \
  -d '{"consentAgreed":true,"preferredDate":"가능한 빨리","consultationType":"전화"}' | head -c 200
# 기대: {"error":"validation","issues":[...]}  (companyName/contactName/email/phone/industry/employeeCount)

# rate limit — 6회 연속 (유효 바디 형태, Supabase 없으면 500 이지만 rate 카운트는 됨)
for i in $(seq 1 6); do
  curl -s -o /dev/null -w "%{http_code} " -XPOST localhost:3000/api/consultations \
    -H 'content-type: application/json' \
    -d '{"consentAgreed":true,"preferredDate":"가능한 빨리","consultationType":"전화","diagnosisId":"00000000-0000-4000-8000-000000000000"}'
done; echo
# 기대: 앞 5회는 500(Supabase 미설정) 또는 404, 6번째 429
```

기대: 위 주석대로. **DB 통합**(성공 → `consultations` 행 + Telegram, `diagnosis_not_found`)은 Supabase 연결 시 검증 — 리포트에 "미검증(환경 제약)" 명시.

- [ ] **Step 4: `task.md` A1·A2·A3 체크 + 커밋**

`task.md` 묶음 A 에서 `- [ ] **A1` → `- [x] **A1`, `A2`, `A3` 동일.

```bash
git add app/api/consultations/route.ts task.md
git commit -m "$(cat <<'EOF'
feat(consultation): POST /api/consultations — 스팸 방어·태깅·insert·Telegram (A2)

diagnosisId 유무 분기: 있으면 lead_id 역참조 재사용 + computeServiceType,
없으면 leads email upsert + 태그 null. consultations insert(NEW) 후
Telegram(회사명만, 추정 서비스 유형). 에러 키는 diagnoses 라우트와 통일.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Vq88uPS2SMUNvuCLiwyv4n
EOF
)"
```

---

## Task 4: 상담 폼 — 페이지 shell + 폼 아일랜드 + submit 헬퍼 + 성공 화면

**Files:**
- Create: `components/consultation/submit.ts`
- Create: `components/consultation/success-view.tsx`
- Create: `components/consultation/consultation-form.tsx`
- Modify: `app/consultation/page.tsx` (스텁 → shell)

**Interfaces:**
- Consumes:
  - `POST /api/consultations` 계약 (Task 3)
  - `consultationSubmissionSchema`, `type ConsultationSubmission` (Task 2)
  - `components/diagnosis/fields/{text-field,select-field,consent-checkbox,honeypot}` (변경 없이 재사용)
  - `OPTIONS` (`@/lib/options`), `track` (`@/lib/analytics`)
- Produces: `<ConsultationForm diagnosisId={string | undefined} />` (default export 아님 — named)

- [ ] **Step 1: `components/consultation/submit.ts`**

```ts
import type { ConsultationSubmission } from "@/lib/validation";

export type ConsultationSubmitResult =
  | { kind: "ok"; consultationId: string }
  | { kind: "validation"; errors: Partial<Record<keyof ConsultationSubmission, string>> }
  | { kind: "not_found" } // diagnosisId 가 유효하지 않음
  | { kind: "rate_limited" }
  | { kind: "error" };

/** POST /api/consultations 호출 + 응답 매핑. fetchImpl 은 테스트 주입용. */
export async function submitConsultation(
  values: Partial<ConsultationSubmission>,
  fetchImpl: typeof fetch = fetch,
): Promise<ConsultationSubmitResult> {
  try {
    const res = await fetchImpl("/api/consultations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...values, hp_field: values.hp_field ?? "" }),
    });

    if (res.status === 200) {
      const json = (await res.json()) as { consultationId?: string; ok?: boolean };
      if (json.consultationId) return { kind: "ok", consultationId: json.consultationId };
      return { kind: "error" }; // 허니팟 {ok:true} 도 여기 — 폼에선 성공처럼 보이면 안 되므로 error 취급
    }
    if (res.status === 404) return { kind: "not_found" };
    if (res.status === 429) return { kind: "rate_limited" };
    if (res.status === 400) {
      const json = (await res.json()) as {
        error?: string;
        issues?: { path: (string | number)[]; message: string }[];
      };
      if (json.error === "validation" && json.issues) {
        const errors: Partial<Record<keyof ConsultationSubmission, string>> = {};
        for (const issue of json.issues) {
          const key = issue.path[0] as keyof ConsultationSubmission | undefined;
          if (key && !errors[key]) errors[key] = issue.message;
        }
        return { kind: "validation", errors };
      }
      if (json.error === "consent_required") {
        return { kind: "validation", errors: { consentAgreed: "개인정보 수집·이용 동의가 필요합니다" } };
      }
      return { kind: "error" };
    }
    return { kind: "error" };
  } catch {
    return { kind: "error" };
  }
}
```

- [ ] **Step 2: `components/consultation/success-view.tsx`**

```tsx
import Link from "next/link";

export function ConsultationSuccessView() {
  return (
    <div className="mt-8">
      <div className="border-t-2 border-ink pt-3">
        <h1 className="text-[1.5rem] leading-tight font-extrabold tracking-tight text-ink sm:text-[1.75rem]">
          상담 신청이 접수되었습니다
        </h1>
      </div>
      <p className="mt-6 max-w-[34rem] text-[0.95rem] leading-[1.75] text-ink-soft">
        {/* TODO 문구 확정 (묶음 C) */}
        담당자가 확인 후 영업일 기준 1~2일 내에 입력하신 연락처로 연락드립니다.
      </p>
      <Link
        href="/"
        className="mt-7 inline-flex min-h-11 items-center justify-center rounded-md bg-signal px-5 py-3 text-[0.95rem] leading-none font-medium text-white transition-colors hover:bg-[#182fc0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal motion-reduce:transition-none"
      >
        홈으로
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: `components/consultation/consultation-form.tsx`**

```tsx
"use client";

import { useState } from "react";
import { OPTIONS } from "@/lib/options";
import { track } from "@/lib/analytics";
import type { ConsultationSubmission } from "@/lib/validation";
import { TextField } from "@/components/diagnosis/fields/text-field";
import { SelectField } from "@/components/diagnosis/fields/select-field";
import { ConsentCheckbox } from "@/components/diagnosis/fields/consent-checkbox";
import { Honeypot } from "@/components/diagnosis/fields/honeypot";
import { submitConsultation } from "./submit";
import { ConsultationSuccessView } from "./success-view";

type Values = Partial<ConsultationSubmission>;
type Errors = Partial<Record<keyof ConsultationSubmission, string>>;

export function ConsultationForm({ diagnosisId }: { diagnosisId: string | undefined }) {
  const [values, setValues] = useState<Values>({ diagnosisId, consentAgreed: undefined });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = <K extends keyof Values>(k: K, v: Values[K]) => {
    setValues((s) => ({ ...s, [k]: v }));
    setErrors((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  if (done) return <ConsultationSuccessView />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    const r = await submitConsultation({ ...values, diagnosisId });
    setSubmitting(false);
    if (r.kind === "ok") {
      track("consultation_submit");
      setDone(true);
      return;
    }
    if (r.kind === "validation") {
      setErrors(r.errors);
      setFormError("입력값을 다시 확인해 주세요.");
      return;
    }
    setFormError(
      r.kind === "rate_limited"
        ? "요청이 많습니다. 잠시 후 다시 시도해 주세요."
        : r.kind === "not_found"
          ? "진단 정보를 찾을 수 없습니다. 처음부터 다시 시도해 주세요."
          : "신청 중 문제가 발생했습니다. 다시 시도해 주세요.",
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-[36rem] flex-col gap-9 px-5 py-10 sm:py-14">
      <div className="border-t-2 border-ink pt-3">
        <p className="font-flow text-[0.7rem] text-signal">상담 신청</p>
        <h1 className="mt-1.5 text-[1.5rem] leading-tight font-extrabold tracking-tight text-ink sm:text-[1.75rem]">
          전문가 상담 신청
        </h1>
      </div>

      {diagnosisId ? (
        <p className="max-w-[34rem] border-l-2 border-line bg-panel px-4 py-3 text-[0.9rem] leading-[1.7] text-ink-soft">
          이전 진단에 입력하신 연락처로 접수됩니다. 상담 방식과 희망 시기만 선택해 주세요.
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-9">
        {!diagnosisId && (
          <div className="flex flex-col gap-5">
            <TextField label="회사명" value={values.companyName ?? ""} onChange={(v) => set("companyName", v)} error={errors.companyName} maxLength={100} />
            <SelectField label="업종" options={OPTIONS.industry} value={values.industry} onChange={(v) => set("industry", v as Values["industry"])} error={errors.industry} />
            <SelectField label="직원 수" options={OPTIONS.employeeCount} value={values.employeeCount} onChange={(v) => set("employeeCount", v as Values["employeeCount"])} error={errors.employeeCount} />
            <TextField label="담당자 이름" value={values.contactName ?? ""} onChange={(v) => set("contactName", v)} error={errors.contactName} maxLength={50} />
            <TextField label="이메일" type="email" inputMode="email" value={values.email ?? ""} onChange={(v) => set("email", v)} error={errors.email} />
            <TextField label="휴대폰 번호" type="tel" inputMode="tel" value={values.phone ?? ""} onChange={(v) => set("phone", v)} error={errors.phone} hint="010-1234-5678" />
          </div>
        )}

        <div className="flex flex-col gap-5">
          <SelectField label="상담 방식" options={OPTIONS.consultingMethod} value={values.consultationType} onChange={(v) => set("consultationType", v as Values["consultationType"])} error={errors.consultationType} />
          <SelectField label="희망 상담 시기" options={OPTIONS.preferredDate} value={values.preferredDate} onChange={(v) => set("preferredDate", v as Values["preferredDate"])} error={errors.preferredDate} />
        </div>

        <ConsentCheckbox
          checked={values.consentAgreed === true}
          onChange={(v) => set("consentAgreed", v === true ? true : undefined)}
          error={errors.consentAgreed}
        />
        <Honeypot value={(values.hp_field as string) ?? ""} onChange={(v) => set("hp_field", v)} />

        {formError && (
          <p className="border-l-2 border-danger bg-danger/[0.05] px-4 py-3 text-[0.9rem] leading-relaxed text-danger">
            {formError}
          </p>
        )}

        <div className="flex justify-end border-t border-line pt-6">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-signal px-6 text-[0.95rem] font-medium text-white transition-colors hover:bg-[#182fc0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:opacity-60 motion-reduce:transition-none"
          >
            {submitting ? "신청 중…" : "상담 신청"}
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: `app/consultation/page.tsx` — shell**

```tsx
import Link from "next/link";
import { IBM_Plex_Mono } from "next/font/google";
import { ConsultationForm } from "@/components/consultation/consultation-form";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

const PRETENDARD_CSS =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendard-variable-dynamic-subset.min.css";

export default async function ConsultationPage({
  searchParams,
}: PageProps<"/consultation">) {
  const sp = await searchParams;
  const raw = sp.diagnosisId;
  const diagnosisId = typeof raw === "string" && raw.length > 0 ? raw : undefined;

  return (
    <div
      className={`${plexMono.variable} font-display flex min-h-full flex-1 flex-col bg-paper text-ink`}
    >
      <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
      <link rel="stylesheet" href={PRETENDARD_CSS} />
      <header className="border-b border-line">
        <div className="mx-auto max-w-xl px-5 py-4">
          <Link href="/" className="text-[1.05rem] font-extrabold tracking-tight text-ink">
            WEBAGENT<span className="text-ink-soft">.KR</span>
          </Link>
        </div>
      </header>
      <ConsultationForm diagnosisId={diagnosisId} />
    </div>
  );
}
```

- [ ] **Step 5: 빌드 + 린트 + 타입**

Run: `npm run build && npx eslint app/consultation components/consultation && npx tsc --noEmit`
Expected: exit 0. 라우트 목록에 `ƒ /consultation` (searchParams 사용으로 동적).

- [ ] **Step 6: Playwright — 두 경로 렌더 + 검증**

`npm run dev` 후 Playwright(또는 `mcp__plugin_playwright_playwright__*`)로:
1. `/consultation` 열기 → 회사명·업종·직원수·이름·이메일·전화·상담방식·희망시기·동의 체크박스 렌더. 안내 배너 **없음**.
2. `/consultation?diagnosisId=abc` 열기 → 연락처 6필드 **없음**, 안내 배너("이전 진단에 입력하신 연락처로 접수됩니다") 있음, 상담방식·희망시기·동의만.
3. `/consultation`에서 아무것도 안 채우고 "상담 신청" → HTML5 required 없이 제출됨 → 서버 400 → `formError` "입력값을 다시 확인해 주세요." + 필드별 오류 메시지 노출(Supabase 없어도 zod 400 은 도달).
4. 허니팟 input 이 뷰포트 밖(`left:-9999px`)인지 스냅샷으로 확인.
5. 제출 버튼이 `신청 중…`으로 바뀌고 `disabled` 되는지(네트워크 지연 중).

기대: 위 5개 통과. **성공 화면 전환**은 Supabase 연결 시(200 응답) 검증 — 리포트에 명시.

- [ ] **Step 7: `task.md` A4 체크 + 커밋**

```bash
git add app/consultation/page.tsx components/consultation/ task.md
git commit -m "$(cat <<'EOF'
feat(consultation): 상담 폼 — shell + 폼 아일랜드 + submit + 성공 화면 (A4)

단일 화면. diagnosisId 있으면 연락처 생략(안내 배너), 없으면 회사·연락처
전체 입력. 진단 폼 필드 프리미티브 재사용. 성공 시 track("consultation_submit").

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Vq88uPS2SMUNvuCLiwyv4n
EOF
)"
```

---

## Task 5: 결과 페이지 상담 CTA 배선 + 묶음 A 마무리

**Files:**
- Modify: `components/diagnosis/result/result-view.tsx` (`completed` 케이스)
- Modify: `components/diagnosis/result/result-cards.tsx` (`diagnosisId` prop + CTA)
- Modify: `task.md` (A5·A6 체크 + 이탈·메모)

**Interfaces:**
- Consumes: `track` (`@/lib/analytics`), `next/link`. `FailedNotice`는 이미 `/consultation?diagnosisId=` + `track("consultation_cta_click",{from})` 연결됨 — 변경 없음(확인만).
- Produces: 없음 (묶음 A 종료)

- [ ] **Step 1: `FailedNotice` 확인 (변경 없음)**

Run: `grep -n "consultation" components/diagnosis/result/failed-notice.tsx`
Expected: `href={\`/consultation?diagnosisId=${diagnosisId}\`}` + `track("consultation_cta_click", { from: variant })` 존재. 손대지 않는다.

- [ ] **Step 2: `result-view.tsx` — `diagnosisId` 전달**

`components/diagnosis/result/result-view.tsx`의 `completed` 케이스 한 줄 수정:

```tsx
    case "completed":
      return <ResultCards result={view.result} diagnosisId={diagnosisId} />;
```

(`ResultView`는 이미 `diagnosisId: string` prop 을 받는다 — 시그니처 변경 없음.)

- [ ] **Step 3: `result-cards.tsx` — prop + CTA**

`components/diagnosis/result/result-cards.tsx`:

```tsx
import Link from "next/link";
import { track } from "@/lib/analytics";
import type { DiagnosisApiResult } from "@/lib/diagnosisResult";
import { ScoreCard } from "./score-card";
import { SavedHoursCard } from "./saved-hours-card";
import { PriorityTasksCard } from "./priority-tasks-card";
import { StackCard } from "./stack-card";
import { StepsCard } from "./steps-card";
import { SummaryCard } from "./summary-card";

// 상자 6개 대신 랜딩과 같은 규칙(rule) 체계: 굵은 ink 선이 문서를 열고,
// 이후 섹션은 헤어라인으로 나뉜다. 점수는 매스트헤드 바로 아래 붙어 하나의 "판정" 단위를 이룬다.
export function ResultCards({
  result,
  diagnosisId,
}: {
  result: DiagnosisApiResult;
  diagnosisId: string;
}) {
  return (
    <div className="mt-8 flex flex-col gap-8">
      <div className="border-t-2 border-ink pt-3">
        <h1 className="text-[1.5rem] leading-tight font-extrabold tracking-tight text-ink sm:text-[1.75rem]">
          자동화 진단 결과
        </h1>
        <p className="mt-2.5 max-w-[34rem] text-[0.85rem] leading-[1.7] text-ink-soft">
          아래 수치는 입력하신 정보를 바탕으로 AI가 계산한{" "}
          <strong className="font-semibold text-ink">추정치</strong>입니다. 실제 결과는 상담을 통해 구체화됩니다.
        </p>
      </div>
      <ScoreCard score={result.automationScore} />
      <SavedHoursCard hours={result.totalEstimatedSavedHours} />
      <PriorityTasksCard tasks={result.priorityTasks} />
      <StackCard stack={result.recommendedStack} />
      <StepsCard steps={result.implementationSteps} />
      <SummaryCard summary={result.summary} />

      <div className="border-t border-line pt-6">
        <p className="max-w-[34rem] text-[0.92rem] leading-[1.75] text-ink-soft">
          이 결과를 바탕으로 무엇부터 시작하면 좋을지, 전문가가 함께 정리해 드립니다.
        </p>
        <Link
          href={`/consultation?diagnosisId=${diagnosisId}`}
          onClick={() => track("consultation_cta_click", { from: "result" })}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-signal px-5 py-3 text-[0.95rem] leading-none font-medium text-white transition-colors hover:bg-[#182fc0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal motion-reduce:transition-none"
        >
          전문가 상담 신청하기
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 빌드 + 린트 + 타입**

Run: `npm run build && npx eslint components/diagnosis/result && npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 5: Playwright — 결과 페이지 CTA**

`npm run dev` 후, Phase 2 의 결과 프리뷰 방식(임시 `app/result-preview/page.tsx` 생성 후 삭제, 밑줄 없는 이름) 또는 mock 경로로 `completed` 뷰를 렌더해:
- 하단에 "전문가 상담 신청하기" 링크가 `href="/consultation?diagnosisId=..."` 로 렌더되는지
- 클릭 시 `/consultation?diagnosisId=...` 로 이동하고 그 페이지에 안내 배너가 뜨는지(Task 4 와 연결 확인)

임시 프리뷰 페이지를 만들었으면 **검증 후 `rm -r` + 재빌드 + `git status` 클린**.

- [ ] **Step 6: `task.md` 마무리 — A5·A6 체크 + 이탈·메모**

`task.md` 묶음 A 섹션: `A5`, `A6` 체크. 묶음 A 아래에 이탈·메모 블록 추가:

```markdown
### 묶음 A 이탈·메모 (2026-09-08)
- 에러 키를 스펙 §4.4(`bad_json`/`invalid`)가 아니라 기존 `POST /api/diagnoses` 규약(`invalid_json`/`validation`)으로 통일.
- `consultationSubmissionSchema`에 `leadId` 필드는 원래 없었음(스펙 §8의 "제거" 항목은 무효) — `diagnosisId` 역참조 / email upsert 만 씀.
- 상담 폼 동의 체크박스는 진단 폼 `ConsentCheckbox` 를 그대로 재사용(현재 `/privacy` 링크만). `/terms` 링크 + 상담용 문구는 묶음 C.
- 성공 화면 안내 문구는 `{/* TODO 묶음 C */}` — 확정 대기.
- DB 통합(제출→`consultations` 행 + Telegram, `diagnosis_not_found`, 성공 화면)은 이 환경에 Supabase 없어 미검증 — curl 에러 경로 + Playwright 렌더로 대체. 묶음 B 착수 전 1회 관통 권장.
- serviceTagging ④ n8n Automation 판정에 "LLM 마커 없음" 조건 추가(스펙 §3.2 해석) — Mock 픽스처 스택이 항상 n8n 을 포함해 기본값이 죽는 문제 회피.
```

- [ ] **Step 7: 커밋**

```bash
git add components/diagnosis/result/result-view.tsx components/diagnosis/result/result-cards.tsx task.md
git commit -m "$(cat <<'EOF'
feat(consultation): 결과 페이지 상담 CTA 배선 + 묶음 A 마무리 (A5·A6)

ResultCards 에 diagnosisId prop + 하단 상담 CTA(track consultation_cta_click,
from:"result"). result-view 가 completed 케이스에서 전달. FailedNotice 는
Phase 2 에서 이미 연결됨(변경 없음). task.md 묶음 A 체크 + 이탈·메모.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Vq88uPS2SMUNvuCLiwyv4n
EOF
)"
```

---

## Self-Review

**1. Spec coverage**

| 스펙 절 | 태스크 |
|---|---|
| §3 `lib/serviceTagging.ts` (시그니처·규칙·우선순위·키워드) | Task 1 |
| §4.1 라우트 시그니처 / §4.2 요청 바디 (`consentAgreed` 추가, `industry`·`employeeCount` 필수) | Task 2(스키마) + Task 3(라우트) |
| §4.3 처리 순서 1~9 (허니팟·동의·rate limit·zod·분기·insert·Telegram) | Task 3 Step 1 |
| §4.4 응답 요약 (에러 키는 Global Constraints 에서 codebase 규약으로 매핑) | Task 3 Interfaces |
| §5.1 페이지 shell (searchParams → diagnosisId) | Task 4 Step 4 |
| §5.2 폼 아일랜드 (두 경로 필드, 스키마 재사용, 성공/오류, 버튼 비활성화) | Task 4 Step 1~3 |
| §5.3 결과 CTA 배선 (`result-cards` prop + Link + track) | Task 5 Step 2~3 |
| §6 에러 처리 (createServiceClient throw→500, 조회 실패 vs 행 없음, result 없음→null, Telegram catch) | Task 3 Step 1 |
| §7 검증 (build/lint/tsc, `_wak` 태깅 유닛, curl 에러 경로, Playwright) | Task 1 Step 4·5 / Task 3 Step 2·3 / Task 4 Step 5·6 / Task 5 Step 4·5 |
| §8 미해결 (성공 문구·동의 문구 TODO, `leadId` 무효) | Task 5 Step 6 이탈·메모 |

**2. Placeholder scan**: 코드 스텝은 모두 실제 코드. `{/* TODO 묶음 C */}` 2곳은 의도적(문구 확정이 묶음 C 범위 — 스펙 §8 명시). "handle edge cases" 류 없음.

**3. Type consistency**:
- `computeServiceType(d: TaggingDiagnosis, r: TaggingResult | null): ServiceType | null` — Task 1 정의, Task 3 에서 `import("@/lib/serviceTagging").TaggingDiagnosis` 로 참조. 일치.
- `ConsultationSubmitResult` — Task 4 Step 1 정의, 같은 파일 Step 3 에서 소비. `kind` 값: `ok`/`validation`/`not_found`/`rate_limited`/`error` 일관.
- `consultationSubmissionSchema` 필드 (`diagnosisId`, `companyName`, `contactName`, `email`, `phone`, `industry`, `employeeCount`, `preferredDate`, `consultationType`, `consentAgreed`, `hp_field`) — Task 2 정의, Task 3(`data.*`)·Task 4(`values.*`, `OPTIONS.*` 키) 참조 일치. `consultationType` ↔ `OPTIONS.consultingMethod`(스키마가 `opt("consultingMethod")`), `preferredDate` ↔ `OPTIONS.preferredDate`.
- `ResultCards` prop: Task 5 에서 `{ result, diagnosisId }` 로 확장, `result-view.tsx` 호출부도 같은 스텝에서 `diagnosisId={diagnosisId}` 추가. 일치.
- 에러 키: `invalid_json` / `validation` / `consent_required` / `rate_limited` / `diagnosis_not_found` / `internal` — Task 3 라우트와 Task 4 `submit.ts` 매핑 일치(`submit.ts`는 404→`not_found`, 429→`rate_limited`, 400+`validation`→필드오류, 400+`consent_required`→`consentAgreed` 오류).

이슈 없음.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-09-08-consultation-flow.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — 태스크마다 새 서브에이전트 디스패치, 태스크 간 2단계 리뷰, 빠른 반복

**2. Inline Execution** — 이 세션에서 `executing-plans`로 체크포인트마다 배치 실행

**Which approach?**
