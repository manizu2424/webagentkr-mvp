# 진단 결과 파이프라인 (Mock 우선) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/diagnosis/[id]`를 연 사용자가 3초 간격 폴링으로 진단 상태를 관찰하고, 완료 시 구조화된 결과 카드를, 실패/타임아웃 시 사과 문구 + 상담 CTA를 본다. 결과를 기록하고 상태를 전이하는 주체는 개발 전용 Mock 라우트이며, Phase B에서 n8n이 그대로 대체한다.

**Architecture:** `GET /api/diagnoses/[id]`(실제 프로덕션 코드)가 `diagnoses.status` + `diagnosis_results`를 읽어 폴링 응답을 준다. `POST /api/dev/mock-result/[id]`(개발 전용, 프로덕션 차단)가 n8n 대역으로 `diagnosis_results` insert + status 전이 + Telegram을 수행한다. 결과 페이지는 Phase 1 wizard 페이지와 동일하게 **서버 컴포넌트 shell + 클라이언트 폴링 아일랜드**. 결과 카드는 순수 프레젠테이션 컴포넌트.

**Tech Stack:** Next.js 16.3.4 (App Router, RSC), React 19.2.8, TypeScript 5, Tailwind v4(CSS 설정), `@supabase/supabase-js` 2.114. 유닛 테스트는 러너 없이 throwaway `_wak_*.mts` + `node --experimental-strip-types`.

**Spec:** `docs/superpowers/specs/2026-09-07-diagnosis-result-pipeline-design.md` (executor는 이 스펙과 계획을 함께 읽는다)

## Global Constraints

- **Next 16**: `params`는 Promise. `RouteContext<'/route'>` · `PageProps<'/route'>`는 `next dev`/`next build`가 생성하는 전역 타입 — **import 하지 않는다**. `next lint` 없음 → `npm run lint`(eslint 직접).
- **테스트 러너 없음**: 순수 로직은 프로젝트 루트에 `_wak_*.mts`를 만들어 `node --experimental-strip-types _wak_*.mts`로 실행하고 **통과 확인 후 삭제**한다(Phase 0 패턴). `.mts` 테스트가 import하는 모듈은 `@/` 별칭도 `import "server-only"`도 쓰지 않아야 한다(plain node가 해석 못 함). 라우트·컴포넌트는 `npm run build` + `npm run lint` + curl/Playwright.
- **`lib/diagnosisResult.ts`는 `import "server-only"`를 넣지 않는다** — 시크릿을 만지지 않는 순수 데이터 매핑 함수이고, 러너 없는 유닛 테스트 대상이다. (스펙 §3.3의 `server-only` 표기는 이 이유로 채택하지 않는다.)
- **PII 경계** (기획서 §16.1, 법적 요구): `GET /api/diagnoses/[id]`는 lead 정보(이름·전화·이메일·회사명)를 **절대** 반환하지 않는다. `diagnoses`에서는 `status` 컬럼만 select 한다. `diagnosis_results`에는 PII가 없다.
- **service_role 키**: `SUPABASE_SERVICE_ROLE_KEY`는 클라이언트 번들 / `NEXT_PUBLIC_*` / 클라이언트 컴포넌트에 들어가면 안 된다. 서버 라우트는 `lib/supabase/server.ts`의 `createServiceClient()`만 쓴다.
- **상태 머신**: `diagnoses.status` = `SUBMITTED → PROCESSING → COMPLETED` 또는 `PROCESSING → FAILED`. `GET`은 **`SUBMITTED`와 `PROCESSING`을 모두 클라이언트에 `PROCESSING`으로** 응답한다(결함 #12). `COMPLETED`/`FAILED`는 종결.
- **개발 전용 라우트**: `POST /api/dev/mock-result/[id]`는 `process.env.NODE_ENV === "production"`이면 404. `process.env.MOCK_RESULT_SECRET`가 설정돼 있으면 `x-mock-secret` 헤더 일치 시에만 통과.
- **로그**: Supabase/PostgREST 오류는 항상 `error.code` + `error.message`만 남긴다 — 원본 오류 객체를 통째로 로그하지 않는다(Phase 1 규약, PII가 `details`에 섞일 수 있음).
- **사용자 문구는 한국어.** 디자인은 라이트 전용, `--wak-*` 토큰(`text-ink` / `text-ink-soft` / `border-line` / `bg-panel` / `text-signal` / `text-resolved` / `text-danger` / `font-flow` / `font-display`), Pretendard + IBM Plex Mono (랜딩·폼과 통일).
- **캐시**: `GET /api/diagnoses/[id]`의 모든 응답에 `Cache-Control: no-store` 헤더.
- **커밋 트레일러** (매 커밋 끝에):
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01RboFPYxKism9NYoTtYJV3F
  ```
  커밋은 현재 브랜치 `feat/diagnosis-result-pipeline`에 로컬로 한다. **push 금지.**

---

## 파일 구조

**신규**
| 경로 | 책임 |
|---|---|
| `lib/diagnosisResult.ts` | `toApiResult(row)` — `diagnosis_results` 행(DB 컬럼명) → API `result`(API 필드명) 순수 매핑. 타입 `DiagnosisResultRow`, `PriorityTask`, `DiagnosisApiResult` export |
| `lib/mockDiagnosisResult.ts` | `MOCK_RESULT_ROW` 상수 — DB 컬럼명 형태의 더미 결과. Phase B 참조 픽스처 |
| `app/api/diagnoses/[id]/route.ts` | (501 스텁 대체) `GET` — status 분기 + `diagnosis_results` 조회 + `toApiResult` |
| `app/api/dev/mock-result/[id]/route.ts` | `POST` — n8n 대역. 프로덕션 차단. `diagnosis_results` insert + status 전이 + `sendTelegram` |
| `components/diagnosis/result/result-view.tsx` | 순수 프레젠테이션 스위치 — `view` 값에 따라 아래 컴포넌트 렌더 |
| `components/diagnosis/result/processing-view.tsx` | 폴링 중 화면 |
| `components/diagnosis/result/error-view.tsx` | 오류 화면 + 재시도 버튼 |
| `components/diagnosis/result/result-cards.tsx` | 결과 6카드 컨테이너 + 추정치 고지 |
| `components/diagnosis/result/score-card.tsx` | 자동화 준비도 |
| `components/diagnosis/result/saved-hours-card.tsx` | 예상 절감 시간 |
| `components/diagnosis/result/priority-tasks-card.tsx` | 우선 추천 업무 |
| `components/diagnosis/result/stack-card.tsx` | 권장 시스템 구성 (빈 배열 → `null`) |
| `components/diagnosis/result/steps-card.tsx` | 권장 구축 단계 (빈 배열 → `null`) |
| `components/diagnosis/result/summary-card.tsx` | 종합 요약 |
| `components/diagnosis/result/failed-notice.tsx` | FAILED/timeout 공용 + 상담 CTA |
| `components/diagnosis/result/diagnosis-result.tsx` | `"use client"` 폴링 아일랜드. 상태 머신 소유, `<ResultView>` 렌더 |
| `n8n/workflows/README.md` | AI↔DB↔API 매핑표 |

**수정**
| 경로 | 변경 |
|---|---|
| `app/diagnosis/[id]/page.tsx` | 정적 "분석 중" → 서버 shell(워드마크·진단 번호) + `<DiagnosisResult diagnosisId={id} />` |
| `.env.example` | `MOCK_RESULT_SECRET=` 추가 (개발 전용 주석) |
| `task.md` | Phase 2 2.1~2.5 체크 + 이탈·메모 |

**임시(태스크 내 생성 후 삭제)**
| 경로 | 용도 |
|---|---|
| `app/result-preview/page.tsx` | Task 4·5 Playwright 시각 검증용. 각 태스크 끝에서 `rm`. 밑줄로 시작하는 폴더는 App Router가 라우팅에서 제외하므로(Phase 1 Task 6에서 확인) 밑줄 없는 이름을 쓴다 |

---

## Task 1: `lib/diagnosisResult.ts` + `lib/mockDiagnosisResult.ts` — DB↔API 매핑과 픽스처

**Files:**
- Create: `lib/diagnosisResult.ts`
- Create: `lib/mockDiagnosisResult.ts`
- Test: `_wak_result.mts` (repo root, 통과 후 삭제)

**Interfaces:**
- Consumes: 없음 (순수)
- Produces:
  - `interface DiagnosisResultRow { automation_score: number | null; recommended_tasks: unknown; estimated_saved_hours: unknown; recommended_stack: string[] | null; implementation_steps: string[] | null; ai_summary: string | null }`
  - `interface PriorityTask { name: string; reason: string; difficulty: "낮음" | "중간" | "높음"; estimatedMonthlySavedHours: number }`
  - `interface DiagnosisApiResult { automationScore: number; priorityTasks: PriorityTask[]; totalEstimatedSavedHours: { min: number; max: number }; recommendedStack: string[]; implementationSteps: string[]; summary: string }`
  - `function toApiResult(row: DiagnosisResultRow): DiagnosisApiResult`
  - `const MOCK_RESULT_ROW: DiagnosisResultRow` (from `lib/mockDiagnosisResult.ts`)

- [ ] **Step 1: `lib/diagnosisResult.ts` 작성**

```ts
// diagnosis_results 행(DB 컬럼명) → GET /api/diagnoses/[id] 의 result(API 필드명) 매핑.
// 계약: CLAUDE.md "AI 필드 ↔ DB 컬럼 ↔ API 응답 매핑" / n8n/workflows/README.md.
// 순수 함수 — 시크릿 없음. "server-only" 를 넣지 않는다(러너 없는 유닛 테스트 대상).

export interface DiagnosisResultRow {
  automation_score: number | null;
  recommended_tasks: unknown; // [{ name, reason, difficulty, estimatedMonthlySavedHours }]
  estimated_saved_hours: unknown; // { min, max }
  recommended_stack: string[] | null;
  implementation_steps: string[] | null;
  ai_summary: string | null;
}

export interface PriorityTask {
  name: string;
  reason: string;
  difficulty: "낮음" | "중간" | "높음";
  estimatedMonthlySavedHours: number;
}

export interface DiagnosisApiResult {
  automationScore: number;
  priorityTasks: PriorityTask[];
  totalEstimatedSavedHours: { min: number; max: number };
  recommendedStack: string[];
  implementationSteps: string[];
  summary: string;
}

function toSavedHours(v: unknown): { min: number; max: number } {
  if (v && typeof v === "object" && "min" in v && "max" in v) {
    const o = v as { min: unknown; max: unknown };
    return {
      min: typeof o.min === "number" ? o.min : 0,
      max: typeof o.max === "number" ? o.max : 0,
    };
  }
  return { min: 0, max: 0 };
}

export function toApiResult(row: DiagnosisResultRow): DiagnosisApiResult {
  return {
    automationScore: row.automation_score ?? 0,
    priorityTasks: Array.isArray(row.recommended_tasks)
      ? (row.recommended_tasks as PriorityTask[])
      : [],
    totalEstimatedSavedHours: toSavedHours(row.estimated_saved_hours),
    recommendedStack: row.recommended_stack ?? [],
    implementationSteps: row.implementation_steps ?? [],
    summary: row.ai_summary ?? "",
  };
}
```

- [ ] **Step 2: `lib/mockDiagnosisResult.ts` 작성**

```ts
import type { DiagnosisResultRow } from "./diagnosisResult";

// n8n 부재 시 POST /api/dev/mock-result 가 diagnosis_results 에 그대로 insert 하는 더미.
// Phase B 에서 실제 AI 출력 → 이 컬럼 형태로 매핑하는 참조 픽스처. 한국어, 실제 결과처럼.
export const MOCK_RESULT_ROW: DiagnosisResultRow = {
  automation_score: 68,
  recommended_tasks: [
    {
      name: "견적서·거래명세서 발행 자동화",
      reason:
        "지금은 담당자가 양식에 값을 옮겨 적어 PDF로 저장·전송합니다. 입력 항목이 정형화되어 있어 폼 제출 한 번으로 발행·전송·보관까지 자동화하기 쉽습니다.",
      difficulty: "낮음",
      estimatedMonthlySavedHours: 12,
    },
    {
      name: "고객 문의 1차 분류·응대",
      reason:
        "문의의 상당수가 배송 조회, 반품 절차, 영업시간 등 반복 질문입니다. 유형을 자동 분류해 표준 답변을 먼저 보내고, 애매한 건만 사람에게 넘기면 응대 시간이 크게 줄어듭니다.",
      difficulty: "중간",
      estimatedMonthlySavedHours: 20,
    },
    {
      name: "재고 현황 집계 리포트",
      reason:
        "여러 시트에 흩어진 입출고 기록을 매주 수기로 취합하고 있습니다. 소스가 고정되어 있어 정해진 시각에 자동 집계·요약 발송으로 대체할 수 있습니다.",
      difficulty: "낮음",
      estimatedMonthlySavedHours: 8,
    },
    {
      name: "월 마감 정산 데이터 취합",
      reason:
        "결제·세금계산서·매입 자료를 각기 다른 곳에서 받아 대사합니다. 예외 케이스가 있어 완전 자동화는 어렵지만, 수집과 1차 대사까지는 자동화해 검토만 사람이 하도록 만들 수 있습니다.",
      difficulty: "높음",
      estimatedMonthlySavedHours: 10,
    },
  ],
  estimated_saved_hours: { min: 40, max: 60 },
  recommended_stack: ["n8n", "Supabase", "OpenAI API", "Telegram"],
  implementation_steps: [
    "1주차: 가장 단순한 견적서 발행 흐름을 자동화해 효과를 확인합니다.",
    "2주차: 고객 문의 유형 분류와 표준 답변 자동 발송을 붙입니다.",
    "3주차: 재고 집계 리포트를 정기 실행으로 전환합니다.",
    "4주차: 월 마감 데이터 수집·1차 대사를 자동화하고 담당자 검토 단계를 남깁니다.",
  ],
  ai_summary:
    "반복 입력·집계·1차 응대에 시간이 집중되어 있어 자동화 여지가 큽니다. 난이도가 낮은 견적서 발행과 재고 집계부터 시작해 빠르게 효과를 확인하고, 이어서 문의 응대와 월 마감으로 확장하는 순서를 권장합니다. 아래 수치는 입력값 기준 추정치이며 실제 절감폭은 업무 표준화 정도에 따라 달라집니다.",
};
```

- [ ] **Step 3: 실패하는 테스트 작성 — `_wak_result.mts` (repo root)**

```ts
import assert from "node:assert/strict";
import { toApiResult, type DiagnosisResultRow } from "./lib/diagnosisResult.ts";
import { MOCK_RESULT_ROW } from "./lib/mockDiagnosisResult.ts";

// 1. 완전한 행(MOCK) → 전 필드 매핑
const full = toApiResult(MOCK_RESULT_ROW);
assert.equal(full.automationScore, 68);
assert.equal(full.priorityTasks.length, 4);
assert.equal(full.priorityTasks[0].difficulty, "낮음");
assert.equal(full.priorityTasks[0].estimatedMonthlySavedHours, 12);
assert.deepEqual(full.totalEstimatedSavedHours, { min: 40, max: 60 });
assert.equal(full.recommendedStack[0], "n8n");
assert.equal(full.implementationSteps.length, 4);
assert.ok(full.summary.length > 0);

// 2. null 필드 → 기본값
const empty: DiagnosisResultRow = {
  automation_score: null,
  recommended_tasks: null,
  estimated_saved_hours: null,
  recommended_stack: null,
  implementation_steps: null,
  ai_summary: null,
};
const d = toApiResult(empty);
assert.equal(d.automationScore, 0);
assert.deepEqual(d.priorityTasks, []);
assert.deepEqual(d.totalEstimatedSavedHours, { min: 0, max: 0 });
assert.deepEqual(d.recommendedStack, []);
assert.deepEqual(d.implementationSteps, []);
assert.equal(d.summary, "");

// 3. 비배열/깨진 값 → 방어
assert.deepEqual(toApiResult({ ...empty, recommended_tasks: "oops" }).priorityTasks, []);
assert.deepEqual(
  toApiResult({ ...empty, estimated_saved_hours: { min: "x", max: 5 } }).totalEstimatedSavedHours,
  { min: 0, max: 5 },
);

console.log("OK _wak_result");
```

- [ ] **Step 4: 테스트가 실패하는지 확인**

Run: `node --experimental-strip-types _wak_result.mts`
Expected: FAIL — `ERR_MODULE_NOT_FOUND` (`./lib/diagnosisResult.ts` 아직 없음) 또는 `toApiResult is not a function`. (Step 1·2를 먼저 만들었다면 Step 5로.)

- [ ] **Step 5: 테스트 통과 확인**

Run: `node --experimental-strip-types _wak_result.mts`
Expected: PASS — 출력 `OK _wak_result`

- [ ] **Step 6: 타입 체크 + 정리**

Run: `npm run lint && npm run build`
Expected: 둘 다 exit 0. (신규 `lib/*` 두 파일이 아직 어디서도 import되지 않아도 통과.)
그다음: `rm _wak_result.mts`

- [ ] **Step 7: 커밋**

```bash
git add lib/diagnosisResult.ts lib/mockDiagnosisResult.ts
git commit
```
메시지: `feat(result): diagnosis_results → API 매핑 함수 + Mock 픽스처` + 트레일러.

---

## Task 2: `GET /api/diagnoses/[id]` 구현

**Files:**
- Modify (스텁 전체 교체): `app/api/diagnoses/[id]/route.ts`
- Test: `npm run build` + `npm run lint` + curl (Supabase 없는 환경이므로 에러 경로 위주; DB 왕복은 "Supabase 연결 시" 항목으로 기록)

**Interfaces:**
- Consumes: `createServiceClient()` (`@/lib/supabase/server`), `toApiResult` · `DiagnosisResultRow` (`@/lib/diagnosisResult`)
- Produces (폴링 클라이언트가 의존하는 응답 계약):
  - 404 `{ error: "not_found" }` — 행 없음 / id 형식 오류
  - 500 `{ error: "internal" }` — `diagnoses` 조회 오류
  - 200 `{ status: "PROCESSING" }` — `status` ∈ {SUBMITTED, PROCESSING}, 또는 COMPLETED인데 `diagnosis_results` 없음/오류
  - 200 `{ status: "FAILED" }`
  - 200 `{ status: "COMPLETED", result: DiagnosisApiResult }`
  - 모든 응답에 `Cache-Control: no-store`

- [ ] **Step 1: 스텁을 구현으로 교체**

```ts
// GET /api/diagnoses/[id] — 공개, 결과 페이지 폴링용 (기술 스펙 §4.2 + 결함 #12).
// lead 정보(이름·연락처·이메일)는 절대 포함하지 않는다 — diagnoses 에서 status 만 select.
import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { toApiResult, type DiagnosisResultRow } from "@/lib/diagnosisResult";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/diagnoses/[id]">,
) {
  const { id } = await ctx.params;
  const supabase = createServiceClient();

  const diag = await supabase
    .from("diagnoses")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (diag.error) {
    console.error("[diagnoses/[id]] 조회 실패:", diag.error.code, diag.error.message);
    return NextResponse.json({ error: "internal" }, { status: 500, headers: NO_STORE });
  }
  if (!diag.data) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
  }

  const status = diag.data.status as string;

  if (status === "SUBMITTED" || status === "PROCESSING") {
    return NextResponse.json({ status: "PROCESSING" }, { headers: NO_STORE });
  }
  if (status === "FAILED") {
    return NextResponse.json({ status: "FAILED" }, { headers: NO_STORE });
  }

  // COMPLETED
  const res = await supabase
    .from("diagnosis_results")
    .select(
      "automation_score, recommended_tasks, estimated_saved_hours, recommended_stack, implementation_steps, ai_summary",
    )
    .eq("diagnosis_id", id)
    .maybeSingle();

  if (res.error || !res.data) {
    // 정상 흐름에선 불가능. n8n/Mock 부분 실패 대비 — 폴링을 계속시킨다.
    console.error(
      "[diagnoses/[id]] COMPLETED 인데 결과 행 없음:",
      id,
      res.error?.code,
      res.error?.message,
    );
    return NextResponse.json({ status: "PROCESSING" }, { headers: NO_STORE });
  }

  return NextResponse.json(
    { status: "COMPLETED", result: toApiResult(res.data as DiagnosisResultRow) },
    { headers: NO_STORE },
  );
}
```

- [ ] **Step 2: 빌드·린트**

Run: `npm run build && npm run lint`
Expected: 둘 다 exit 0. `/api/diagnoses/[id]`가 `ƒ (Dynamic)`으로 라우트 표에 남아 있고, TypeScript 통과(`RouteContext<"/api/diagnoses/[id]">` 전역 타입 인식).

- [ ] **Step 3: 에러 경로 curl 검증** (`npm run dev` 실행 중, 별도 셸)

```bash
# .env 에 Supabase 값이 없으면 createServiceClient() 가 throw → 500 { error:"internal" } 계열.
curl -s -i localhost:3000/api/diagnoses/00000000-0000-0000-0000-000000000000 | head -20
```
Expected: `HTTP/1.1 500` 과 `cache-control: no-store` 헤더, 바디 `{"error":"internal"}` **또는** (Supabase 값이 있고 행이 없으면) `HTTP/1.1 404 {"error":"not_found"}`. 어느 쪽이든 `Cache-Control: no-store` 가 있어야 한다. 관찰된 실제 응답을 리포트에 기록.

- [ ] **Step 4: "Supabase 연결 시" 검증 항목 기록** (리포트에 남기고 넘어감 — 이 환경에서 실행 불가)

- SUBMITTED/PROCESSING 행 → `{ status: "PROCESSING" }`
- FAILED 행 → `{ status: "FAILED" }`
- COMPLETED + `diagnosis_results` 행 → `{ status: "COMPLETED", result: {...6필드...} }`, `result`에 lead 필드 없음
- COMPLETED + `diagnosis_results` 없음 → `{ status: "PROCESSING" }` + 서버 로그

- [ ] **Step 5: 커밋**

```bash
git add app/api/diagnoses/[id]/route.ts
git commit
```
메시지: `feat(result): GET /api/diagnoses/[id] — status 폴링 + 결과 매핑 (결함 #12)` + 트레일러.

---

## Task 3: `POST /api/dev/mock-result/[id]` — n8n 대역

**Files:**
- Create: `app/api/dev/mock-result/[id]/route.ts`
- Modify: `.env.example` (`MOCK_RESULT_SECRET=` 추가)
- Test: `npm run build` + `npm run lint` + curl (가드/400 경로; DB 왕복은 "Supabase 연결 시")

**Interfaces:**
- Consumes: `createServiceClient()`, `sendTelegram` (`@/lib/telegram`), `MOCK_RESULT_ROW` (`@/lib/mockDiagnosisResult`)
- Produces (수동 QA 및 Phase 5 Playwright 가 사용):
  - 404 `{ error: "not_found" }` — 프로덕션 / 시크릿 불일치 / `diagnoses` 행 없음
  - 400 `{ error: "bad_outcome" }` — `outcome` 값이 `completed`/`failed` 외
  - 409 `{ error: "already_terminal", status }` — 이미 COMPLETED/FAILED
  - 409 `{ error: "result_exists" }` — `diagnosis_results` 중복(23505)
  - 500 `{ error: "internal" | "db_result" | "db_status" }`
  - 200 `{ ok: true, status: "COMPLETED" | "FAILED" }`

- [ ] **Step 1: 라우트 작성**

```ts
// POST /api/dev/mock-result/[id]?outcome=completed|failed — 개발 전용 n8n 대역.
// n8n 이 Phase B 에서 할 일(diagnosis_results insert + status 전이 + Telegram)을 그대로 수행.
// 프로덕션에서는 라우트 자체를 404 로 숨긴다.
import { type NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendTelegram } from "@/lib/telegram";
import { MOCK_RESULT_ROW } from "@/lib/mockDiagnosisResult";

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/dev/mock-result/[id]">,
) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const secret = process.env.MOCK_RESULT_SECRET;
  if (secret && req.headers.get("x-mock-secret") !== secret) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { id } = await ctx.params;
  const outcome =
    new URL(req.url).searchParams.get("outcome") ?? "completed";
  if (outcome !== "completed" && outcome !== "failed") {
    return NextResponse.json({ error: "bad_outcome" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const diag = await supabase
    .from("diagnoses")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (diag.error) {
    console.error("[dev/mock-result] 조회 실패:", diag.error.code, diag.error.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
  if (!diag.data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const status = diag.data.status as string;
  if (status !== "SUBMITTED" && status !== "PROCESSING") {
    return NextResponse.json({ error: "already_terminal", status }, { status: 409 });
  }

  if (outcome === "failed") {
    const upd = await supabase
      .from("diagnoses")
      .update({ status: "FAILED" })
      .eq("id", id);
    if (upd.error) {
      console.error("[dev/mock-result] status 갱신 실패:", upd.error.code, upd.error.message);
      return NextResponse.json({ error: "db_status" }, { status: 500 });
    }
    await sendTelegram(`[진단 실패] ${id} 확인 필요`, process.env.TELEGRAM_ERROR_CHAT_ID).catch(
      () => {},
    );
    return NextResponse.json({ ok: true, status: "FAILED" });
  }

  // completed
  const ins = await supabase
    .from("diagnosis_results")
    .insert({ diagnosis_id: id, ...MOCK_RESULT_ROW });
  if (ins.error) {
    if (ins.error.code === "23505") {
      return NextResponse.json({ error: "result_exists" }, { status: 409 });
    }
    console.error("[dev/mock-result] 결과 insert 실패:", ins.error.code, ins.error.message);
    return NextResponse.json({ error: "db_result" }, { status: 500 });
  }
  const upd = await supabase
    .from("diagnoses")
    .update({ status: "COMPLETED" })
    .eq("id", id);
  if (upd.error) {
    console.error("[dev/mock-result] status 갱신 실패:", upd.error.code, upd.error.message);
    return NextResponse.json({ error: "db_status" }, { status: 500 });
  }
  await sendTelegram(`신규 진단 완료: ${id}`, process.env.TELEGRAM_ADMIN_CHAT_ID).catch(() => {});
  return NextResponse.json({ ok: true, status: "COMPLETED" });
}
```

- [ ] **Step 2: `.env.example` 에 항목 추가**

`.env.example`의 Telegram 관련 줄 근처에 추가:

```
# 개발 전용 — POST /api/dev/mock-result 호출을 x-mock-secret 헤더로 보호(선택).
# 비우면 로컬(NODE_ENV != production)에서 헤더 없이 호출 가능. 프로덕션에서는 라우트 자체가 404.
MOCK_RESULT_SECRET=
```

- [ ] **Step 3: 빌드·린트**

Run: `npm run build && npm run lint`
Expected: 둘 다 exit 0. 라우트 표에 `ƒ /api/dev/mock-result/[id]` 추가됨.

- [ ] **Step 4: 가드 경로 curl 검증** (`npm run dev`, 별도 셸)

```bash
# outcome 값 오류 → 400 (Supabase 접근 전에 반환)
curl -s -i -XPOST "localhost:3000/api/dev/mock-result/abc?outcome=nope" | head -12
```
Expected: `HTTP/1.1 400` 바디 `{"error":"bad_outcome"}`.

```bash
# 정상 outcome 이지만 Supabase 미설정 → 500 {"error":"internal"} (또는 값이 있고 행 없으면 404)
curl -s -i -XPOST "localhost:3000/api/dev/mock-result/00000000-0000-0000-0000-000000000000" | head -12
```
관찰된 응답을 리포트에 기록.

- [ ] **Step 5: 프로덕션 가드 확인**

Run: `NODE_ENV=production npm run build` 후 `NODE_ENV=production npm run start &` (또는 리포트에 "빌드 산출물에서 이 라우트가 404를 반환하도록 첫 분기가 `process.env.NODE_ENV === "production"` 임을 코드로 확인" 기록). 가능하면:
```bash
curl -s -i -XPOST localhost:3000/api/dev/mock-result/x | head -5   # → 404
```

- [ ] **Step 6: "Supabase 연결 시" 검증 항목 기록**

- PROCESSING 행 + `outcome=completed` → `diagnosis_results` 1행 생성 + `status=COMPLETED` + Telegram 시도, 200
- 같은 id 재호출 → 409 `result_exists`
- PROCESSING 행 + `outcome=failed` → `status=FAILED` + Telegram, 200
- COMPLETED 행에 호출 → 409 `already_terminal`

- [ ] **Step 7: 커밋**

```bash
git add app/api/dev/mock-result/[id]/route.ts .env.example
git commit
```
메시지: `feat(result): POST /api/dev/mock-result — n8n 대역 (Mock 파이프라인)` + 트레일러.

---

## Task 4: 결과 프레젠테이션 컴포넌트 (`result-view` + 카드 8종)

**Files:**
- Create: `components/diagnosis/result/result-view.tsx`
- Create: `components/diagnosis/result/processing-view.tsx`
- Create: `components/diagnosis/result/error-view.tsx`
- Create: `components/diagnosis/result/result-cards.tsx`
- Create: `components/diagnosis/result/score-card.tsx`
- Create: `components/diagnosis/result/saved-hours-card.tsx`
- Create: `components/diagnosis/result/priority-tasks-card.tsx`
- Create: `components/diagnosis/result/stack-card.tsx`
- Create: `components/diagnosis/result/steps-card.tsx`
- Create: `components/diagnosis/result/summary-card.tsx`
- Create: `components/diagnosis/result/failed-notice.tsx`
- Create (임시): `app/result-preview/page.tsx` — 끝에서 삭제
- Test: `npm run build` + `npm run lint` + Playwright 스크린샷(임시 페이지)

**Interfaces:**
- Consumes: `DiagnosisApiResult` · `PriorityTask` (`@/lib/diagnosisResult`), `track` (`@/lib/analytics`)
- Produces:
  - `type ResultViewState = { kind: "polling" } | { kind: "completed"; result: DiagnosisApiResult } | { kind: "failed" } | { kind: "timeout" } | { kind: "error" }`
  - `function ResultView(props: { view: ResultViewState; diagnosisId: string; onRetry: () => void }): JSX.Element`
  - 각 카드/뷰 컴포넌트 (아래 시그니처)

- [ ] **Step 1: 개별 뷰·카드 컴포넌트 작성**

`components/diagnosis/result/processing-view.tsx`:
```tsx
export function ProcessingView() {
  return (
    <div className="mt-8">
      <p className="font-flow text-[0.7rem] text-signal">분석 중</p>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">
        AI가 진단 결과를 만들고 있습니다
      </h1>
      <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">
        보통 1~2분이면 끝납니다. 이 페이지에서 그대로 기다려 주세요. 결과는 AI가 계산한 추정치입니다.
      </p>
      <div aria-hidden className="mt-8 h-px w-full overflow-hidden bg-line">
        <div className="h-full w-1/3 animate-pulse bg-signal" />
      </div>
    </div>
  );
}
```

`components/diagnosis/result/error-view.tsx`:
```tsx
export function ErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mt-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">
        결과를 불러오지 못했습니다
      </h1>
      <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">
        일시적인 문제일 수 있습니다. 잠시 후 다시 시도해 주세요.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex min-h-11 items-center rounded-md bg-signal px-5 text-[0.95rem] font-medium text-white transition-colors hover:bg-[#182fc0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal motion-reduce:transition-none"
      >
        다시 시도
      </button>
    </div>
  );
}
```

`components/diagnosis/result/failed-notice.tsx`:
```tsx
import Link from "next/link";
import { track } from "@/lib/analytics";

const COPY = {
  failed: {
    title: "진단 결과 생성에 실패했습니다",
    body: "죄송합니다. AI 분석 중 문제가 발생했습니다. 상담을 신청해 주시면 담당자가 직접 진단 결과를 정리해 연락드리겠습니다.",
  },
  timeout: {
    title: "예상보다 오래 걸리고 있습니다",
    body: "결과가 준비되는 대로 이 페이지에서 확인할 수 있습니다. 지금 상담을 신청하시면 담당자가 결과와 함께 연락드립니다.",
  },
} as const;

export function FailedNotice({
  variant,
  diagnosisId,
}: {
  variant: "failed" | "timeout";
  diagnosisId: string;
}) {
  const c = COPY[variant];
  return (
    <div className="mt-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink">{c.title}</h1>
      <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">{c.body}</p>
      <Link
        href={`/consultation?diagnosisId=${diagnosisId}`}
        onClick={() => track("consultation_cta_click", { from: variant })}
        className="mt-6 inline-flex min-h-11 items-center rounded-md bg-signal px-5 text-[0.95rem] font-medium text-white transition-colors hover:bg-[#182fc0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal motion-reduce:transition-none"
      >
        상담 신청하기
      </Link>
    </div>
  );
}
```

`components/diagnosis/result/score-card.tsx`:
```tsx
export function ScoreCard({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <section className="border border-line bg-panel p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[0.9rem] font-semibold text-ink">자동화 준비도</h2>
        <span className="font-flow text-[0.7rem] text-ink-soft">추정</span>
      </div>
      <p className="mt-2 font-flow text-3xl font-medium text-signal">
        {pct}
        <span className="text-lg text-ink-soft"> / 100</span>
      </p>
      <div aria-hidden className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-signal" style={{ width: `${pct}%` }} />
      </div>
    </section>
  );
}
```

`components/diagnosis/result/saved-hours-card.tsx`:
```tsx
export function SavedHoursCard({ hours }: { hours: { min: number; max: number } }) {
  return (
    <section className="border border-line bg-panel p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[0.9rem] font-semibold text-ink">예상 절감 시간</h2>
        <span className="font-flow text-[0.7rem] text-ink-soft">추정</span>
      </div>
      <p className="mt-2 text-[0.95rem] text-ink">
        월{" "}
        <span className="font-flow text-2xl font-medium text-signal">
          {hours.min}~{hours.max}
        </span>{" "}
        시간
      </p>
      <p className="mt-1 text-[0.8rem] text-ink-soft">
        우선 추천 업무를 모두 자동화했을 때 기준입니다.
      </p>
    </section>
  );
}
```

`components/diagnosis/result/priority-tasks-card.tsx`:
```tsx
import type { PriorityTask } from "@/lib/diagnosisResult";

const DIFF_STYLE: Record<PriorityTask["difficulty"], string> = {
  낮음: "border-resolved text-resolved",
  중간: "border-signal text-signal",
  높음: "border-danger text-danger",
};

export function PriorityTasksCard({ tasks }: { tasks: PriorityTask[] }) {
  return (
    <section className="border border-line bg-panel p-5">
      <h2 className="text-[0.9rem] font-semibold text-ink">우선 추천 업무</h2>
      <ol className="mt-3 flex flex-col gap-4">
        {tasks.map((t, i) => (
          <li key={i} className="border-l-2 border-line pl-3">
            <div className="flex items-center gap-2">
              <span className="font-flow text-[0.75rem] text-ink-soft">{i + 1}</span>
              <span className="text-[0.95rem] font-medium text-ink">{t.name}</span>
              <span
                className={`ml-auto shrink-0 border px-1.5 py-0.5 text-[0.7rem] ${DIFF_STYLE[t.difficulty]}`}
              >
                {t.difficulty}
              </span>
            </div>
            <p className="mt-1 text-[0.85rem] leading-relaxed text-ink-soft">{t.reason}</p>
            <p className="mt-1 font-flow text-[0.75rem] text-ink-soft">
              월 약 {t.estimatedMonthlySavedHours}시간 절감(추정)
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

`components/diagnosis/result/stack-card.tsx`:
```tsx
export function StackCard({ stack }: { stack: string[] }) {
  if (!stack.length) return null;
  return (
    <section className="border border-line bg-panel p-5">
      <h2 className="text-[0.9rem] font-semibold text-ink">권장 시스템 구성</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {stack.map((s) => (
          <li key={s} className="border border-line px-2.5 py-1 font-flow text-[0.8rem] text-ink">
            {s}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

`components/diagnosis/result/steps-card.tsx`:
```tsx
export function StepsCard({ steps }: { steps: string[] }) {
  if (!steps.length) return null;
  return (
    <section className="border border-line bg-panel p-5">
      <h2 className="text-[0.9rem] font-semibold text-ink">권장 구축 단계</h2>
      <ol className="mt-3 flex flex-col gap-2">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-2.5 text-[0.9rem] leading-relaxed text-ink">
            <span className="font-flow text-[0.8rem] text-signal">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

`components/diagnosis/result/summary-card.tsx`:
```tsx
export function SummaryCard({ summary }: { summary: string }) {
  return (
    <section className="border border-line bg-panel p-5">
      <h2 className="text-[0.9rem] font-semibold text-ink">종합 요약</h2>
      <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">{summary}</p>
    </section>
  );
}
```

- [ ] **Step 2: `result-cards.tsx` 컨테이너 작성**

```tsx
import type { DiagnosisApiResult } from "@/lib/diagnosisResult";
import { ScoreCard } from "./score-card";
import { SavedHoursCard } from "./saved-hours-card";
import { PriorityTasksCard } from "./priority-tasks-card";
import { StackCard } from "./stack-card";
import { StepsCard } from "./steps-card";
import { SummaryCard } from "./summary-card";

export function ResultCards({ result }: { result: DiagnosisApiResult }) {
  return (
    <div className="mt-8 flex flex-col gap-6">
      <div className="border-t-2 border-ink pt-3">
        <h1 className="text-[1.5rem] leading-tight font-extrabold tracking-tight text-ink sm:text-[1.75rem]">
          자동화 진단 결과
        </h1>
        <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-soft">
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
    </div>
  );
}
```

- [ ] **Step 3: `result-view.tsx` 스위치 작성**

```tsx
import type { DiagnosisApiResult } from "@/lib/diagnosisResult";
import { ProcessingView } from "./processing-view";
import { ErrorView } from "./error-view";
import { ResultCards } from "./result-cards";
import { FailedNotice } from "./failed-notice";

export type ResultViewState =
  | { kind: "polling" }
  | { kind: "completed"; result: DiagnosisApiResult }
  | { kind: "failed" }
  | { kind: "timeout" }
  | { kind: "error" };

export function ResultView({
  view,
  diagnosisId,
  onRetry,
}: {
  view: ResultViewState;
  diagnosisId: string;
  onRetry: () => void;
}) {
  switch (view.kind) {
    case "polling":
      return <ProcessingView />;
    case "completed":
      return <ResultCards result={view.result} />;
    case "failed":
      return <FailedNotice variant="failed" diagnosisId={diagnosisId} />;
    case "timeout":
      return <FailedNotice variant="timeout" diagnosisId={diagnosisId} />;
    case "error":
      return <ErrorView onRetry={onRetry} />;
  }
}
```

- [ ] **Step 4: 임시 프리뷰 페이지 작성 — `app/result-preview/page.tsx`**

```tsx
"use client";

import { useMemo } from "react";
import { ResultView, type ResultViewState } from "@/components/diagnosis/result/result-view";
import { toApiResult } from "@/lib/diagnosisResult";
import { MOCK_RESULT_ROW } from "@/lib/mockDiagnosisResult";

// 임시 — 시각 검증 후 삭제. ?view=polling|completed|failed|timeout|error, ?empty=1
// useSearchParams 는 Suspense 경계를 요구하므로 throwaway 페이지에선 window.location 을 직접 읽는다.
export default function ResultPreview() {
  const q = useMemo(
    () => new URLSearchParams(typeof window === "undefined" ? "" : window.location.search),
    [],
  );
  const kind = (q.get("view") ?? "completed") as ResultViewState["kind"];
  const empty = q.get("empty") === "1";
  const result = empty
    ? toApiResult({ ...MOCK_RESULT_ROW, recommended_stack: [], implementation_steps: [] })
    : toApiResult(MOCK_RESULT_ROW);
  const view: ResultViewState =
    kind === "completed" ? { kind, result } : ({ kind } as ResultViewState);
  return (
    <div className="font-display mx-auto max-w-xl px-5 py-10 text-ink">
      <ResultView view={view} diagnosisId="preview-123" onRetry={() => alert("retry")} />
    </div>
  );
}
```

- [ ] **Step 5: 빌드·린트**

Run: `npm run build && npm run lint`
Expected: 둘 다 exit 0. `○ /result-preview` 가 라우트 표에 임시로 나타남(다음 단계에서 삭제).

- [ ] **Step 6: Playwright 시각 검증** (실제 `mcp__plugin_playwright_playwright__*` 도구, `npm run dev` 실행 중)

- `browser_navigate` → `localhost:3000/result-preview?view=completed` → `browser_snapshot`: 6개 섹션(자동화 준비도 / 예상 절감 시간 / 우선 추천 업무 4항목 / 권장 시스템 구성 / 권장 구축 단계 / 종합 요약) 모두 존재, "추정" 배지 2곳 + 상단 고지 1곳
- `?view=completed&empty=1` → 권장 시스템 구성·권장 구축 단계 카드가 **없음**, 나머지 4카드 존재
- `?view=polling` → "AI가 진단 결과를 만들고 있습니다"
- `?view=failed` → "진단 결과 생성에 실패했습니다" + "상담 신청하기" 링크(`href`에 `/consultation?diagnosisId=preview-123`)
- `?view=timeout` → "예상보다 오래 걸리고 있습니다" + 상담 링크
- `?view=error` → "결과를 불러오지 못했습니다" + "다시 시도" 버튼
- 390×844 + 1280×800 각 1장 스크린샷(`?view=completed`)

- [ ] **Step 7: 임시 페이지 삭제 + 재빌드**

```bash
rm -r app/result-preview
npm run build && npm run lint
```
Expected: 둘 다 exit 0, 라우트 표에서 `/result-preview` 사라짐, `git status`에 `app/result-preview` 흔적 없음.

- [ ] **Step 8: 커밋**

```bash
git add components/diagnosis/result/
git commit
```
메시지: `feat(result): 결과 프레젠테이션 컴포넌트 (카드 6종 + 뷰 스위치)` + 트레일러.

---

## Task 5: 폴링 아일랜드 + 결과 페이지 배선

**Files:**
- Create: `components/diagnosis/result/diagnosis-result.tsx`
- Modify (전체 교체): `app/diagnosis/[id]/page.tsx`
- Create (임시): `app/result-preview/page.tsx` (Task 4와 동일 목적, 상태 머신 검증용) — 끝에서 삭제. **또는** 상태 머신은 실서버 경로로만 검증하고 임시 페이지 생략(아래 Step 5 참고)
- Test: `npm run build` + `npm run lint` + Playwright (실서버 `/diagnosis/<임의 id>` → ProcessingView → ErrorView 경로)

**Interfaces:**
- Consumes: `ResultView` · `ResultViewState` (`./result-view`), `track` (`@/lib/analytics`), `GET /api/diagnoses/[id]` 응답 계약(Task 2 Produces)
- Produces: `function DiagnosisResult(props: { diagnosisId: string }): JSX.Element` — `app/diagnosis/[id]/page.tsx`가 마운트

- [ ] **Step 1: 폴링 아일랜드 작성**

```tsx
"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { ResultView, type ResultViewState } from "./result-view";
import type { DiagnosisApiResult } from "@/lib/diagnosisResult";

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 60; // 3분
const MAX_CONSECUTIVE_ERRORS = 5;

type PollResponse =
  | { status: "PROCESSING" }
  | { status: "FAILED" }
  | { status: "COMPLETED"; result: DiagnosisApiResult };

export function DiagnosisResult({ diagnosisId }: { diagnosisId: string }) {
  const [view, setView] = useState<ResultViewState>({ kind: "polling" });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let attempts = 0;
    let consecutiveErrors = 0;
    let stopped = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    // 테스트 편의: 비프로덕션에서만 폴링 파라미터 축소 허용
    let intervalMs = POLL_INTERVAL_MS;
    let maxAttempts = POLL_MAX_ATTEMPTS;
    if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search);
      const p = Number(q.get("_test_pollMs"));
      const m = Number(q.get("_test_maxAttempts"));
      if (Number.isFinite(p) && p >= 50) intervalMs = p;
      if (Number.isFinite(m) && m >= 1) maxAttempts = m;
    }

    const stop = () => {
      stopped = true;
      if (timer) clearInterval(timer);
    };

    const poll = async () => {
      if (stopped) return;
      attempts += 1;
      try {
        const res = await fetch(`/api/diagnoses/${diagnosisId}`, { cache: "no-store" });
        if (res.status === 404) {
          stop();
          setView({ kind: "error" });
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as PollResponse;
        consecutiveErrors = 0;
        if (json.status === "COMPLETED") {
          stop();
          setView({ kind: "completed", result: json.result });
          track("diagnosis_result_view");
          return;
        }
        if (json.status === "FAILED") {
          stop();
          setView({ kind: "failed" });
          return;
        }
        if (attempts >= maxAttempts) {
          stop();
          setView({ kind: "timeout" });
        }
      } catch {
        consecutiveErrors += 1;
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          stop();
          setView({ kind: "error" });
        }
      }
    };

    setView({ kind: "polling" });
    void poll(); // 즉시 1회 — 이미 COMPLETED면 스피너가 안 보인다
    timer = setInterval(() => void poll(), intervalMs);
    return stop;
  }, [diagnosisId, nonce]);

  return (
    <ResultView
      view={view}
      diagnosisId={diagnosisId}
      onRetry={() => {
        setView({ kind: "polling" });
        setNonce((n) => n + 1);
      }}
    />
  );
}
```

- [ ] **Step 2: 결과 페이지를 shell + 아일랜드로 교체**

```tsx
import Link from "next/link";
import { IBM_Plex_Mono } from "next/font/google";
import { DiagnosisResult } from "@/components/diagnosis/result/diagnosis-result";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

const PRETENDARD_CSS =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendard-variable-dynamic-subset.min.css";

export default async function DiagnosisResultPage({
  params,
}: PageProps<"/diagnosis/[id]">) {
  const { id } = await params;
  return (
    <div
      className={`${plexMono.variable} font-display flex min-h-full flex-1 flex-col bg-paper text-ink`}
    >
      <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
      <link rel="stylesheet" href={PRETENDARD_CSS} />
      <header className="border-b border-line">
        <div className="mx-auto max-w-xl px-5 py-4">
          <Link
            href="/"
            className="text-[1.05rem] font-extrabold tracking-tight text-ink"
          >
            WEBAGENT<span className="text-ink-soft">.KR</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl px-5 py-10 sm:py-14">
        <p className="font-flow text-xs text-ink-soft">진단 번호 · {id}</p>
        <DiagnosisResult diagnosisId={id} />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: 빌드·린트**

Run: `npm run build && npm run lint`
Expected: 둘 다 exit 0. `/diagnosis/[id]` 가 `ƒ (Dynamic)` 유지. `DiagnosisResult` 만 `"use client"` 아일랜드.

- [ ] **Step 4: Playwright — 실서버 폴링 상태 머신 검증** (`npm run dev`, 실제 Playwright MCP 도구)

`.env`에 Supabase 값이 없는 환경 기준(Phase 1 선례):
- `browser_navigate` → `localhost:3000/diagnosis/00000000-0000-0000-0000-000000000000?_test_pollMs=200&_test_maxAttempts=3`
- 즉시 `browser_snapshot`: "AI가 진단 결과를 만들고 있습니다"(ProcessingView) 표시
- `browser_wait_for` (약 2초) 후 `browser_snapshot`: GET 라우트가 Supabase 미설정으로 500 → 연속 5회 실패 → "결과를 불러오지 못했습니다"(ErrorView) + "다시 시도" 버튼
- `browser_console_messages`: `[track]` 로그에 `diagnosis_result_view` **없음**(완료 안 됐으므로)
- `browser_click` "다시 시도" → 다시 ProcessingView로 전환됨(폴링 재시작)

- [ ] **Step 5: COMPLETED/FAILED/timeout 뷰 — 임시 프리뷰로 확인**

Task 4의 프리뷰 페이지를 동일 내용으로 다시 만들어(`app/result-preview/page.tsx`, Task 4 Step 4 코드 그대로) 아래를 확인하고 삭제:
- `?view=completed` → `ResultCards` 6섹션
- `?view=failed` / `?view=timeout` → `FailedNotice` 문구·CTA
`rm -r app/result-preview` 후 `npm run build && npm run lint` (exit 0, 흔적 없음).

> 근거: 이 환경엔 Supabase가 없어 실서버로 COMPLETED를 만들 수 없다. 상태 머신의 전이 로직(성공/실패/타임아웃 분기)은 Step 4에서 에러 경로로, 뷰 렌더는 프리뷰로 각각 검증한다. 실 DB 왕복(제출 → PROCESSING → `curl mock-result` → COMPLETED 카드)은 "Supabase 연결 시" 항목으로 리포트에 남긴다.

- [ ] **Step 6: "Supabase 연결 시" 검증 항목 기록**

- `/diagnosis` 폼 제출 → `/diagnosis/[id]` 이동 → ProcessingView
- 다른 셸에서 `curl -XPOST localhost:3000/api/dev/mock-result/<id>` → 다음 폴링(≤3초)에 ResultCards 6섹션, `[track] diagnosis_result_view` 1회
- `curl -XPOST '.../mock-result/<id2>?outcome=failed'` → 다음 폴링에 FailedNotice("failed") + `/consultation?diagnosisId=<id2>` 링크
- `?_test_maxAttempts=2` 로 접속 후 mock-result 호출 안 함 → timeout 뷰 + 상담 CTA, 폴링 중단(`browser_console`에 추가 요청 없음)

- [ ] **Step 7: 커밋**

```bash
git add components/diagnosis/result/diagnosis-result.tsx app/diagnosis/[id]/page.tsx
git commit
```
메시지: `feat(result): 결과 페이지 폴링 아일랜드 + shell 배선 (3s×60)` + 트레일러.

---

## Task 6: `n8n/workflows/README.md` 매핑 문서 + `task.md` 갱신

**Files:**
- Create: `n8n/workflows/README.md`
- Modify: `task.md`
- Test: 없음 (문서). `npm run lint` 만 (변화 없음 확인).

**Interfaces:**
- Consumes: 없음
- Produces: 없음 (Phase B 참조 문서)

- [ ] **Step 1: `n8n/workflows/README.md` 작성**

```markdown
# n8n 워크플로우

> Phase 2 현재: 실제 워크플로우는 아직 없다. `POST /api/dev/mock-result/[id]`가
> n8n 대역으로 `diagnosis_results` insert + `diagnoses.status` 전이 + Telegram을
> 수행한다. Phase B에서 아래 매핑대로 n8n Code 노드가 이를 대체한다.

## AI 출력 ↔ DB 컬럼 ↔ API 응답 매핑

| AI 출력 (기술 스펙 §7.3) | `diagnosis_results` 컬럼 | `GET /api/diagnoses/[id]` 의 `result` 필드 | 비고 |
|---|---|---|---|
| `automationScore` (int 0–100) | `automation_score` smallint | `automationScore` | |
| `priorityTasks` (3–5개 배열) | `recommended_tasks` jsonb | `priorityTasks` | 항목별 `difficulty` = `낮음 | 중간 | 높음` (D4: 최상위 난이도 컬럼 없음) |
| `totalEstimatedSavedHours` `{min,max}` | `estimated_saved_hours` jsonb | `totalEstimatedSavedHours` | |
| `recommendedStack` (string[]) | `recommended_stack` text[] | `recommendedStack` | 빈 배열이면 결과 카드에서 생략 |
| `implementationSteps` (string[]) | `implementation_steps` text[] | `implementationSteps` | 빈 배열이면 결과 카드에서 생략 |
| `summary` (string) | `ai_summary` text | `summary` | |

- `priorityTasks[].difficulty` 외에 **최상위 `difficulty`는 없다** (`docs/decisions.md` D4).
- DB→API 매핑 구현: `lib/diagnosisResult.ts` `toApiResult()`. Mock 픽스처: `lib/mockDiagnosisResult.ts`.

## Phase B 워크플로우 (예정, 기술 스펙 §6)

```
[Webhook Trigger] POST, X-Webhook-Secret 검증
  → [Code] 입력 정리 (PII 없음 — POST /api/diagnoses 가 이미 제거)
  → [AI] OpenAI HTTP Request, Structured Output (기술 스펙 §7.3 스키마)
  → [Code] 응답 필드 검증: 6필드 존재 + priorityTasks 3~5개 + 각 항목 4키
  → [IF] 통과?
      ├─ Yes → [Supabase] diagnosis_results insert (위 매핑)
      │        → [Supabase] diagnoses.status = COMPLETED
      │        → [Telegram] "신규 진단 완료: {diagnosisId}"
      └─ No  → [Supabase] diagnoses.status = FAILED
               → [Telegram] "[진단 실패] {diagnosisId} 확인 필요"
```

- 별도 Error Trigger 워크플로우 → `TELEGRAM_ERROR_CHAT_ID` (기획서 §16.5).
- 완성 후 `n8n/workflows/{diagnosis-pipeline,error-trigger}.json` 으로 export·커밋.
```

- [ ] **Step 2: `task.md` Phase 2 항목 갱신**

`task.md`의 Phase 2 블록에서:
- `- [ ] Phase 2 — 3주차: 결과 파이프라인 (Mock 우선)` 은 그대로 두되(2.6~2.9 미완), 2.1~2.5 하위 항목에 `[x]` + 한 줄 메모:
  - `2.1` → `[x] GET /api/diagnoses/[id] — status 폴링, SUBMITTED→PROCESSING(결함 #12), lead 미포함, Cache-Control: no-store`
  - `2.2` → `[x] 결과 페이지 — 서버 shell + 클라이언트 폴링 아일랜드(3s×60=3분), 6카드(추정치 명시), stack/steps 빈 배열 생략`
  - `2.3` → `[x] FAILED/timeout UX — 사과 문구 + /consultation?diagnosisId=<id> CTA (프리필·lead 재사용은 Phase 3)`
  - `2.4` → `[x] Mock 경로 — POST /api/dev/mock-result/[id] (n8n 대역, 프로덕션 404), lib/mockDiagnosisResult.ts 픽스처`
  - `2.5` → `[x] AI↔DB↔API 매핑표 — n8n/workflows/README.md`
- Phase 2 이탈·메모 항목 추가:
  - `POST /api/diagnoses`는 webhook 미설정 시 지금도 그냥 skip(변경 없음). Mock 결과 주입은 별도 dev 라우트가 담당 — 실제 코드 경로에 mock 분기를 넣지 않음(스펙 D-B).
  - `visibilitychange` 백그라운드 폴링 일시정지: 채택 안 함(3분 상한이 안전망, YAGNI).
  - `?_test_pollMs` / `?_test_maxAttempts`: 비프로덕션에서만 동작하는 폴링 축소 쿼리(Playwright 편의).
  - DB 통합 검증(제출→PROCESSING→mock-result→COMPLETED)은 Supabase 연결 시 수행 — 이 환경에선 에러 경로 + 프리뷰로 대체(각 태스크 리포트에 기록).

- [ ] **Step 3: 린트 + 커밋**

Run: `npm run lint`
Expected: exit 0 (문서만 변경).

```bash
git add n8n/workflows/README.md task.md
git commit
```
메시지: `docs(result): AI↔DB↔API 매핑표 + task.md Phase 2 진행 반영` + 트레일러.

---

## Task 7: frontend-design 패스 — 결과 화면

**Files:**
- Modify: `components/diagnosis/result/*.tsx` (스타일만; props·상태·동작 인터페이스 불변)
- 필요 시 Modify: `app/globals.css` (`@theme`/`@keyframes` 토큰 추가만, 기존 값 변경 금지)
- Test: `npm run build` + `npm run lint` + Playwright 스크린샷(임시 프리뷰 재생성 후 삭제)

**Interfaces:**
- Consumes: Task 4·5의 컴포넌트 트리 전체
- Produces: 없음 (시각 개선만)

- [ ] **Step 1: `frontend-design` 스킬 로드**

`Skill(frontend-design)` 을 호출하고 그 지침을 따른다. 대상: `components/diagnosis/result/*`.
제약: 랜딩(`components/marketing/*`) · 폼(`components/diagnosis/*`, `wizard-progress.tsx`의 마름모 노드 + 헤어라인 커넥터 시각 언어)과 **통일**. 라이트 전용, `--wak-*` 토큰만. Pretendard + IBM Plex Mono. 탭 타깃 ≥ 44px, `motion-reduce:transition-none` 가드, 대비 ≥ 4.5:1.

- [ ] **Step 2: 임시 프리뷰 페이지 재생성**

Task 4 Step 4의 `app/result-preview/page.tsx` 를 동일하게 다시 만든다(시각 확인용).

- [ ] **Step 3: 디자인 패스 적용**

스타일 클래스만 수정. 금지: prop 시그니처 변경, `ResultViewState` 변경, 상태 머신(`diagnosis-result.tsx`의 `useEffect`) 로직 변경, `track()` 호출 위치 변경, 카드 생략 규칙(stack/steps만 `null`) 변경, 새 의존성 추가.

- [ ] **Step 4: 빌드·린트**

Run: `npm run build && npm run lint`
Expected: 둘 다 exit 0.

- [ ] **Step 5: Playwright 검증** (실제 도구)

- `?view=completed` (390×844, 1280×800) — 6섹션, 추정치 고지·배지 유지, 카드 위계 명확
- `?view=completed&empty=1` — stack/steps 카드 없음
- `?view=polling` / `?view=failed` / `?view=timeout` / `?view=error` 각 스냅샷 — 문구·CTA·버튼 유지
- 랜딩(`/`)·폼(`/diagnosis`)과 나란히 스크린샷 비교 — 타이포·여백·색이 한 시스템으로 읽히는지

- [ ] **Step 6: 임시 페이지 삭제 + 재빌드**

```bash
rm -r app/result-preview
npm run build && npm run lint
```
Expected: exit 0, `git status` 깨끗(프리뷰 흔적 없음).

- [ ] **Step 7: 커밋**

```bash
git add components/diagnosis/result/ app/globals.css
git commit
```
메시지: `style(result): frontend-design 패스 — 랜딩·폼과 통일된 결과 화면` + 트레일러.

---

## Self-Review (작성자 체크 결과)

**Spec coverage:**
- §3 `GET /api/diagnoses/[id]` → Task 2 ✅ (§3.1 시그니처, §3.2 분기, §3.3 `toApiResult` → Task 1)
- §4 `POST /api/dev/mock-result` → Task 3 ✅ (§4.1 가드, §4.2 동작, §4.3 픽스처 → Task 1)
- §5 결과 페이지(shell + 폴링 아일랜드, 3s×60, 상태 5종, `track`) → Task 5 ✅
- §6 카드 컴포넌트 11개 + 우아한 생략(stack/steps만) → Task 4 ✅ (`result-view.tsx`는 계획에서 추가한 분해 — 순수 스위치를 폴링 로직과 분리해 Supabase 없이 렌더 검증 가능)
- §7 `n8n/workflows/README.md` 매핑표 → Task 6 ✅
- §8 에러 처리 → Task 2/3/5 각 Step에 분산 반영 ✅
- §9 파일 변경 → 위 "파일 구조" 표와 일치 (`result-view.tsx` 1개 추가)
- §10 테스트 → 각 Task의 test Step (`_wak` / build+lint / curl / Playwright) ✅
- §11 열린 결정 → 확정: `?_test_pollMs`/`?_test_maxAttempts` **채택**(Task 5), `visibilitychange` **미채택**(Task 6 메모), frontend-design **별도 태스크**(Task 7)

**Placeholder scan:** "TBD"/"TODO"/"적절히 처리" 없음. 모든 코드 스텝에 실제 코드. `MOCK_RESULT_ROW`의 한국어 콘텐츠는 완성형(스펙의 `"..."` 표기를 실문장으로 채움).

**Type consistency:** `DiagnosisResultRow` / `PriorityTask` / `DiagnosisApiResult` / `toApiResult` (Task 1) → Task 2·3·4에서 동일 이름·시그니처로 소비. `ResultViewState` (Task 4) → Task 5에서 동일. `MOCK_RESULT_ROW` (Task 1) → Task 3·4. `track` 이벤트명 `diagnosis_result_view` / `consultation_cta_click` (스펙 §5.2) 일치.

## Execution Handoff

플랜은 `docs/superpowers/plans/2026-09-07-diagnosis-result-pipeline.md`에 저장.
