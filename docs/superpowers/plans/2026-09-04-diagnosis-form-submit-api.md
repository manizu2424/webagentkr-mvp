# 진단 폼 + POST /api/diagnoses 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/diagnosis` 5단계 폼에서 제출한 진단이 스팸 방어를 거쳐 `leads`+`diagnoses`로 저장되고 n8n webhook을 트리거한 뒤 `/diagnosis/[id]`로 이동한다.

**Architecture:** 폼은 단일 클라이언트 컴포넌트(`useReducer`, 지속성 없음). 서버 라우트는 초기 저장 + PROCESSING 선전이 + webhook 트리거만 담당(콜백 API 없음 — n8n이 이후 상태를 직접 기록). 멱등성은 클라이언트가 만든 `idempotencyKey` + `diagnoses` 부분 유니크 인덱스로 보장.

**Tech Stack:** Next.js 16.3.4 (App Router, RSC), React 19.2.8, TypeScript 5, Tailwind v4(CSS 설정), zod 4.5, `@supabase/supabase-js` 2.114. 유닛 테스트는 러너 없이 throwaway `.mts` + `node --experimental-strip-types`.

**Spec:** `docs/superpowers/specs/2026-09-04-diagnosis-form-submit-api-design.md` (executor는 이 스펙과 계획을 함께 읽는다)

## Global Constraints

- **Next 16**: `params`/`searchParams`는 Promise. `PageProps<'/route'>`는 `next build`/`next dev`가 생성하는 전역 타입 — 새로 import하지 않는다. `next lint` 없음 → `npm run lint`(eslint 직접).
- **테스트 러너 없음**: 순수 로직은 프로젝트 루트에 `_wak_*.mts` 를 만들어 `node --experimental-strip-types _wak_*.mts` 로 실행하고 **통과 확인 후 삭제**한다(Phase 0 패턴). 라우트·폼은 `npm run build` + `npm run lint` + 수동/Playwright 검증.
- **폼 선택지**: 전부 `lib/options.ts`의 `OPTIONS`에서 읽는다. 라벨을 하드코딩하거나 새로 만들지 않는다 (docs/decisions.md D2). 라벨 문자열이 그대로 DB에 저장된다.
- **PII 경계** (기획서 §16.1, 법적 요구): 이름·전화·이메일·회사명은 n8n webhook 바디와 AI 프롬프트에 **절대** 넣지 않는다. `N8N_PAYLOAD_KEYS`(11키)가 허용 목록이다. `pain_point`는 자유 텍스트라 PII가 섞일 수 있으나 스펙상 포함 허용 — 코드 주석만.
- **service_role 키**: `SUPABASE_SERVICE_ROLE_KEY`는 클라이언트 번들 / 어떤 `NEXT_PUBLIC_*` / 클라이언트 컴포넌트에도 들어가면 안 된다. 라우트는 `lib/supabase/server.ts`의 `createServiceClient()`만 쓴다(`import "server-only"` 포함).
- **상태 머신**: `diagnoses.status` = `SUBMITTED → PROCESSING → COMPLETED` 또는 `PROCESSING → FAILED`. **`PROCESSING`은 webhook 호출 전에 전이한다** (결함 #1 — 뒤에 하면 n8n이 먼저 끝냈을 때 `COMPLETED`를 덮어씀).
- **사용자 문구는 한국어.** 디자인은 라이트 전용, `--wak-*` 토큰, Pretendard + IBM Plex Mono (랜딩과 통일).
- **커밋 트레일러** (매 커밋 끝에):
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01QcFTmB6tN2Dab9PJic7tfV
  ```
  커밋은 현재 브랜치(`main` — Phase 0·라운드 1과 동일 패턴)에 로컬로 한다. push 금지.

---

## 파일 구조

**신규**
| 경로 | 책임 |
|---|---|
| `supabase/migrations/0002_diagnoses_idempotency.sql` | `diagnoses.idempotency_key` 컬럼 + 부분 유니크 인덱스 |
| `lib/pick.ts` | `pick(obj, keys)` — 객체에서 키 목록만 추림 |
| `lib/diagnosisWebhook.ts` | `buildWebhookBody(diagnosisId, data)` — n8n 바디 조립(PII 제외) |
| `lib/telegram.ts` | `sendTelegram(text, chatId?)` — 미설정 시 no-op |
| `lib/analytics.ts` | `track(event, params?)` — `window.gtag` 있으면 호출 |
| `components/diagnosis/reducer.ts` | wizard 상태 타입 + reducer + 단계 필드 헬퍼 |
| `components/diagnosis/submit.ts` | `submitDiagnosis(...)` — fetch + 응답 매핑 |
| `components/diagnosis/diagnosis-wizard.tsx` | 폼 전체(client). reducer 소유, 단계 렌더, 제출 |
| `components/diagnosis/wizard-progress.tsx` | 5노드 진행률 트랙 |
| `components/diagnosis/step-company.tsx` | 1단계 |
| `components/diagnosis/step-tools.tsx` | 2단계 |
| `components/diagnosis/step-tasks.tsx` | 3단계 |
| `components/diagnosis/step-workload.tsx` | 4단계 |
| `components/diagnosis/step-contact.tsx` | 5단계 |
| `components/diagnosis/fields/text-field.tsx` | label+input+error+hint |
| `components/diagnosis/fields/select-field.tsx` | 네이티브 `<select>` (긴 목록) |
| `components/diagnosis/fields/multi-select.tsx` | 체크박스 그리드 (복수 선택) |
| `components/diagnosis/fields/choice-group.tsx` | 단일 선택 짧은 버킷 |
| `components/diagnosis/fields/consent-checkbox.tsx` | 동의 + `/privacy` 링크 |
| `components/diagnosis/fields/honeypot.tsx` | 화면 밖 `hp_field` |
| `components/ui/checkbox.tsx`, `components/ui/label.tsx` | shadcn add |

**수정**
| 경로 | 변경 |
|---|---|
| `lib/validation.ts` | `idempotencyKey` 필드 + 단계별 pick 스키마 5개 + `DIAGNOSIS_STEP_FIELDS` |
| `app/api/diagnoses/route.ts` | 501 스텁 → 전체 POST 구현 |
| `app/diagnosis/page.tsx` | 스텁 → 미니멀 헤더 + `<DiagnosisWizard />` |
| `app/diagnosis/[id]/page.tsx` | 스텁 → 정적 "접수 완료 · 분석 중" |
| `.env.example` | webhook 미설정 시 동작 주석 갱신 |
| `task.md` | 1.2~1.7 완료 반영 |
| `CLAUDE.md` | 결함 #13 resolved 표기 |

---

## Task 1: 마이그레이션 0002 — 멱등성 키

**Files:**
- Create: `supabase/migrations/0002_diagnoses_idempotency.sql`

**Interfaces:**
- Produces: `diagnoses.idempotency_key uuid` 컬럼 + `diagnoses_idempotency_key_key` 부분 유니크 인덱스. Task 4가 이 컬럼에 insert/select 한다.

- [ ] **Step 1: SQL 파일 작성**

`supabase/migrations/0002_diagnoses_idempotency.sql`:

```sql
-- WEBAGENT.KR — diagnoses 멱등성 키 (결함 #13)
-- 실행: Supabase 대시보드 > SQL Editor 에 붙여넣어 1회 실행 (0001 이후)
--
-- POST /api/diagnoses 는 폼이 마운트 시 만든 UUID(idempotencyKey)를 함께 받는다.
-- 더블클릭 / 네트워크 재시도로 같은 제출이 두 번 와도 leads·diagnoses 행과
-- n8n 호출이 한 번만 일어나게 한다. 재제출 시 라우트는 기존 diagnoses.id 를 반환한다.

alter table diagnoses add column idempotency_key uuid;

-- 부분 유니크: 관리자/향후 생성 행(키 없음)은 서로 충돌하지 않는다.
create unique index diagnoses_idempotency_key_key
  on diagnoses (idempotency_key)
  where idempotency_key is not null;
```

- [ ] **Step 2: 로컬 Postgres에 0001 → 0002 순서로 적용**

Phase 0에서 쓴 방식. Docker 필요.

Run:
```bash
docker run -d --rm --name wak_verify -e POSTGRES_PASSWORD=x -p 55432:5432 postgres:16
sleep 3
PGPASSWORD=x psql -h localhost -p 55432 -U postgres -c "create database verify;"
# 0001 은 authenticated 등 Supabase 롤을 참조하므로 롤 먼저 생성
PGPASSWORD=x psql -h localhost -p 55432 -U postgres -d verify -c "create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;"
PGPASSWORD=x psql -h localhost -p 55432 -U postgres -d verify -f supabase/migrations/0001_init.sql
PGPASSWORD=x psql -h localhost -p 55432 -U postgres -d verify -f supabase/migrations/0002_diagnoses_idempotency.sql
```
Expected: 두 파일 모두 오류 없이 적용. `0002`에서 `ALTER TABLE` + `CREATE INDEX` 성공 메시지.

- [ ] **Step 3: 컬럼 + 인덱스 동작 확인**

Run:
```bash
PGPASSWORD=x psql -h localhost -p 55432 -U postgres -d verify -c "\d diagnoses" | grep -i idempotency
PGPASSWORD=x psql -h localhost -p 55432 -U postgres -d verify <<'SQL'
-- leads 1행 필요 (FK)
insert into leads (company_name, industry, employee_count, contact_name, email, phone)
  values ('t', '제조', '5-10명', 'n', 't@t.com', '010-1234-5678') returning id \gset
-- NULL 키 2행 허용
insert into diagnoses (lead_id, idempotency_key) values (:'id', null);
insert into diagnoses (lead_id, idempotency_key) values (:'id', null);
-- 동일 non-NULL 키 2번째는 거부되어야 한다
insert into diagnoses (lead_id, idempotency_key) values (:'id', '11111111-1111-1111-1111-111111111111');
insert into diagnoses (lead_id, idempotency_key) values (:'id', '11111111-1111-1111-1111-111111111111');
SQL
```
Expected: `\d` 출력에 `idempotency_key | uuid`. NULL 2행 삽입 성공. 마지막 insert가 `ERROR: duplicate key value violates unique constraint "diagnoses_idempotency_key_key"`.

- [ ] **Step 4: 정리**

Run: `docker stop wak_verify`

- [ ] **Step 5: 커밋**

```bash
git add supabase/migrations/0002_diagnoses_idempotency.sql
git commit -m "$(printf 'feat(db): diagnoses.idempotency_key + 부분 유니크 인덱스 (결함 #13)\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01QcFTmB6tN2Dab9PJic7tfV')"
```

---

## Task 2: `lib/validation.ts` — idempotencyKey + 단계별 스키마

**Files:**
- Modify: `lib/validation.ts`

**Interfaces:**
- Consumes: 기존 `diagnosisSubmissionSchema`(z.object), `DiagnosisSubmission` 타입, `opt` 헬퍼.
- Produces:
  - `diagnosisSubmissionSchema` 에 `idempotencyKey: string`(uuid) 필드 추가 — Task 4의 `safeParse`가 이걸 요구, Task 5의 `submit.ts`가 바디에 넣는다.
  - `export const DIAGNOSIS_STEP_FIELDS: Record<1|2|3|4|5, readonly (keyof DiagnosisSubmission)[]>`
  - `export const diagnosisStep1Schema … diagnosisStep5Schema` (각 z.object)
  - `export const diagnosisStepSchemas: Record<1|2|3|4|5, ZodType>` — Task 5 reducer가 단계 검증에 쓴다.

- [ ] **Step 1: 실패하는 유닛 테스트 작성**

프로젝트 루트에 `_wak_validation.mts`:

```ts
import assert from "node:assert/strict";
import {
  diagnosisSubmissionSchema,
  diagnosisStepSchemas,
  DIAGNOSIS_STEP_FIELDS,
} from "./lib/validation.ts";

const validFull = {
  companyName: "우리회사",
  industry: "제조",
  employeeCount: "5-10명",
  websiteStatus: "없음",
  currentTools: ["Excel"],
  repetitiveTasks: ["문의"],
  dailyHours: "1~2시간",
  staffCount: "1명",
  monthlyVolume: "50건 미만",
  painPoint: "",
  purpose: "업무 시간 절감",
  budgetRange: "300만원 미만",
  consultingMethod: "전화",
  contactName: "홍길동",
  email: "a@b.com",
  phone: "010-1234-5678",
  consentAgreed: true,
  hp_field: "",
  idempotencyKey: "11111111-1111-1111-1111-111111111111",
};

// 1. idempotencyKey 없으면 전체 스키마 실패
{
  const { idempotencyKey, ...noKey } = validFull;
  assert.equal(diagnosisSubmissionSchema.safeParse(noKey).success, false);
}
// 2. idempotencyKey 가 uuid 아니면 실패
assert.equal(
  diagnosisSubmissionSchema.safeParse({ ...validFull, idempotencyKey: "nope" }).success,
  false,
);
// 3. 완전한 바디는 통과
assert.equal(diagnosisSubmissionSchema.safeParse(validFull).success, true);

// 4. 각 단계 스키마: 필수 필드 누락 시 실패, 채우면 통과
const pickFields = (step: 1 | 2 | 3 | 4 | 5) =>
  Object.fromEntries(
    DIAGNOSIS_STEP_FIELDS[step].map((k) => [k, (validFull as Record<string, unknown>)[k]]),
  );

for (const step of [1, 2, 3, 4, 5] as const) {
  assert.equal(
    diagnosisStepSchemas[step].safeParse(pickFields(step)).success,
    true,
    `step ${step} 완전 입력 통과해야 함`,
  );
}
// step1 에서 industry 빼면 실패
{
  const s1 = pickFields(1);
  delete (s1 as Record<string, unknown>).industry;
  assert.equal(diagnosisStepSchemas[1].safeParse(s1).success, false);
}
// step5 에서 consentAgreed=false 면 실패
assert.equal(
  diagnosisStepSchemas[5].safeParse({ ...pickFields(5), consentAgreed: false }).success,
  false,
);
// step2 는 currentTools 0개도 통과 (필수 아님)
assert.equal(diagnosisStepSchemas[2].safeParse({ currentTools: [] }).success, true);

console.log("OK _wak_validation");
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `node --experimental-strip-types _wak_validation.mts`
Expected: FAIL — `diagnosisStepSchemas` / `DIAGNOSIS_STEP_FIELDS` export 없음, 또는 `idempotencyKey` 없어서 assert 1/2 불통.

- [ ] **Step 3: `lib/validation.ts` 수정**

`diagnosisSubmissionSchema` 의 `hp_field: honeypot,` 줄 **앞**에 추가:

```ts
  // 멱등성 — 폼이 마운트 시 crypto.randomUUID() 로 생성. 내부 전용(N8N_PAYLOAD_KEYS 에 없음)
  idempotencyKey: z.uuid({ error: "잘못된 요청입니다" }),
```

`export type DiagnosisSubmission = ...` 줄 **뒤**, `N8N_PAYLOAD_KEYS` **앞**에 추가:

```ts
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
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `node --experimental-strip-types _wak_validation.mts`
Expected: `OK _wak_validation`

- [ ] **Step 5: 타입/린트 확인 후 테스트 파일 삭제**

Run: `npx tsc --noEmit && npm run lint && rm _wak_validation.mts`
Expected: 오류 0.

- [ ] **Step 6: 커밋**

```bash
git add lib/validation.ts
git commit -m "$(printf 'feat(validation): idempotencyKey + 단계별 pick 스키마\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01QcFTmB6tN2Dab9PJic7tfV')"
```

---

## Task 3: 라우트 지원 라이브러리 — pick · webhook 바디 · telegram

**Files:**
- Create: `lib/pick.ts`, `lib/diagnosisWebhook.ts`, `lib/telegram.ts`

**Interfaces:**
- Consumes: `lib/validation.ts` 의 `N8N_PAYLOAD_KEYS`, `DiagnosisSubmission`.
- Produces:
  - `pick<T, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K>`
  - `buildWebhookBody(diagnosisId: string, data: DiagnosisSubmission): Record<string, unknown>` — `{ diagnosisId, industry, employeeCount, websiteStatus, currentTools, repetitiveTasks, dailyHours, staffCount, monthlyVolume, purpose, painPoint, budgetRange }` (PII 없음). Task 4가 webhook 바디로 쓴다.
  - `sendTelegram(text: string, chatId?: string): Promise<void>` — Task 4가 실패 알림에 쓴다. 미설정 시 no-op.

- [ ] **Step 1: 실패하는 유닛 테스트 작성**

`_wak_libs.mts`:

```ts
import assert from "node:assert/strict";
import { pick } from "./lib/pick.ts";
import { buildWebhookBody } from "./lib/diagnosisWebhook.ts";

// pick
assert.deepEqual(pick({ a: 1, b: 2, c: 3 }, ["a", "c"]), { a: 1, c: 3 });
assert.deepEqual(pick({ a: 1 }, ["a", "z" as "a"]), { a: 1 });

// buildWebhookBody — PII 경계
const data = {
  companyName: "우리회사",
  industry: "제조",
  employeeCount: "5-10명",
  websiteStatus: "없음",
  currentTools: ["Excel"],
  repetitiveTasks: ["문의"],
  dailyHours: "1~2시간",
  staffCount: "1명",
  monthlyVolume: "50건 미만",
  painPoint: "이름 섞일 수도 있는 자유텍스트",
  purpose: "업무 시간 절감",
  budgetRange: "300만원 미만",
  consultingMethod: "전화",
  contactName: "홍길동",
  email: "a@b.com",
  phone: "010-1234-5678",
  consentAgreed: true,
  hp_field: "",
  idempotencyKey: "11111111-1111-1111-1111-111111111111",
} as const;

const body = buildWebhookBody("diag-1", data as never);
assert.equal(body.diagnosisId, "diag-1");
for (const k of ["industry", "employeeCount", "websiteStatus", "currentTools", "repetitiveTasks", "dailyHours", "staffCount", "monthlyVolume", "purpose", "painPoint", "budgetRange"]) {
  assert.ok(k in body, `${k} 있어야 함`);
}
for (const pii of ["companyName", "contactName", "email", "phone", "consentAgreed", "hp_field", "idempotencyKey"]) {
  assert.ok(!(pii in body), `${pii} 없어야 함 (PII 경계)`);
}
assert.equal(Object.keys(body).length, 12); // diagnosisId + 11

console.log("OK _wak_libs");
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `node --experimental-strip-types _wak_libs.mts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: `lib/pick.ts` 작성**

```ts
/** 객체에서 주어진 키들만 골라 새 객체를 만든다. 없는 키는 무시. */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const k of keys) {
    if (k in obj) out[k] = obj[k];
  }
  return out;
}
```

- [ ] **Step 4: `lib/diagnosisWebhook.ts` 작성**

```ts
import { N8N_PAYLOAD_KEYS, type DiagnosisSubmission } from "@/lib/validation";
import { pick } from "@/lib/pick";

/**
 * n8n webhook 바디 조립. PII(회사명·이름·이메일·전화·동의)는 절대 넣지 않는다
 * (기획서 §16.1 — 법적 요구). 허용 목록은 N8N_PAYLOAD_KEYS.
 * pain_point 는 자유 텍스트라 사용자가 PII 를 넣을 수 있으나 스펙상 포함은 허용된다.
 */
export function buildWebhookBody(
  diagnosisId: string,
  data: DiagnosisSubmission,
): Record<string, unknown> {
  return { diagnosisId, ...pick(data, N8N_PAYLOAD_KEYS) };
}
```

- [ ] **Step 5: `lib/telegram.ts` 작성**

```ts
import "server-only";

/**
 * Telegram 알림. TELEGRAM_BOT_TOKEN 또는 대상 chat id 가 없으면 조용히 no-op + warn.
 * 라운드 2는 진단 실패 알림에만 쓴다(성공 "신규 진단" 알림은 n8n 담당 — Phase 2).
 * 호출부는 반드시 await ...catch 로 감싸 실패가 응답을 막지 않게 한다.
 */
export async function sendTelegram(text: string, chatId?: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const target = chatId ?? process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !target) {
    console.warn("[telegram] 미설정 — 알림 skip:", text);
    return;
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: target, text, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    console.error("[telegram] sendMessage 실패:", res.status, await res.text());
  }
}
```

- [ ] **Step 6: 실행 → 통과 확인, 타입/린트, 삭제**

Run:
```bash
node --experimental-strip-types _wak_libs.mts
npx tsc --noEmit && npm run lint && rm _wak_libs.mts
```
Expected: `OK _wak_libs`, 오류 0.
(참고: `_wak_libs.mts` 는 `@/` 별칭을 못 쓰므로 상대경로 import. `lib/diagnosisWebhook.ts` 내부의 `@/` 는 tsc/next가 처리.)

- [ ] **Step 7: 커밋**

```bash
git add lib/pick.ts lib/diagnosisWebhook.ts lib/telegram.ts
git commit -m "$(printf 'feat(lib): pick · buildWebhookBody(PII 경계) · sendTelegram\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01QcFTmB6tN2Dab9PJic7tfV')"
```

---

## Task 4: `POST /api/diagnoses` 구현

**Files:**
- Modify: `app/api/diagnoses/route.ts` (전체 교체)

**Interfaces:**
- Consumes: `createServiceClient` (`lib/supabase/server.ts`), `getClientIp` (`lib/clientIp.ts`), `checkRateLimit` (`lib/rateLimit.ts`), `diagnosisSubmissionSchema` (`lib/validation.ts`), `buildWebhookBody` (`lib/diagnosisWebhook.ts`), `sendTelegram` (`lib/telegram.ts`).
- Produces: `POST /api/diagnoses` — 요청 바디는 `diagnosisSubmissionSchema` 형태, 응답:
  - `200 { ok: true }` (허니팟)
  - `200 { diagnosisId: string }` (성공 / 멱등성 재요청 / webhook 실패)
  - `400 { error: "invalid_json" }` / `400 { error: "validation", issues: ZodIssue[] }`
  - `429 { error: "rate_limited", retryAfterSec: number }` + `Retry-After` 헤더
  - `500 { error: "db_lead" | "db_diagnosis" | "internal" }`
  Task 5의 `submit.ts` 가 이 응답들을 매핑한다.

- [ ] **Step 1: 라우트 전체 교체**

`app/api/diagnoses/route.ts`:

```ts
// POST /api/diagnoses — 공개, 스팸 방어 (기술 스펙 §4.1, §5 + 결함 #1 #3 #11 #13)
// 초기 저장 + PROCESSING 선전이 + n8n webhook 트리거만 담당. 콜백 API 없음 —
// 이후 COMPLETED/FAILED 는 n8n 이 service_role 로 diagnoses 에 직접 기록한다.
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/clientIp";
import { checkRateLimit } from "@/lib/rateLimit";
import { diagnosisSubmissionSchema } from "@/lib/validation";
import { buildWebhookBody } from "@/lib/diagnosisWebhook";
import { sendTelegram } from "@/lib/telegram";

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const WEBHOOK_TIMEOUT_MS = 10_000;

export async function POST(req: Request) {
  // 1. JSON 파싱
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // 2. 허니팟 — 값이 있으면 봇. 200 반환하되 아무것도 저장하지 않는다.
  const hp = (body as { hp_field?: unknown })?.hp_field;
  if (typeof hp === "string" && hp.length > 0) {
    console.warn("[diagnoses] 허니팟 채워짐 — 무시");
    return NextResponse.json({ ok: true });
  }

  // 3. rate limit — 소켓 IP 가 아니라 프록시 헤더 기반 실제 IP (결함 #2)
  const rl = checkRateLimit(getClientIp(req), RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterSec: rl.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  // 4. zod 검증 (consentAgreed !== true 도 여기서 400)
  const parsed = diagnosisSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const data = parsed.data;

  try {
    const supabase = createServiceClient();

    // 5. 멱등성 조회 — 같은 키의 진단이 이미 있으면 그대로 반환
    const existing = await supabase
      .from("diagnoses")
      .select("id")
      .eq("idempotency_key", data.idempotencyKey)
      .maybeSingle();
    if (existing.data?.id) {
      return NextResponse.json({ diagnosisId: existing.data.id });
    }

    // 6. leads upsert (email 기준 — 재방문자 중복/오류 방지, 결함 #11)
    const lead = await supabase
      .from("leads")
      .upsert(
        {
          company_name: data.companyName,
          industry: data.industry,
          employee_count: data.employeeCount,
          contact_name: data.contactName,
          email: data.email,
          phone: data.phone,
          consulting_method: data.consultingMethod,
        },
        { onConflict: "email" },
      )
      .select("id")
      .single();
    if (lead.error || !lead.data) {
      console.error("[diagnoses] leads upsert 실패:", lead.error);
      return NextResponse.json({ error: "db_lead" }, { status: 500 });
    }

    // 7. diagnoses insert (status=SUBMITTED)
    const ins = await supabase
      .from("diagnoses")
      .insert({
        lead_id: lead.data.id,
        website_status: data.websiteStatus,
        current_tools: data.currentTools,
        repetitive_tasks: data.repetitiveTasks,
        daily_hours: data.dailyHours,
        staff_count: data.staffCount,
        monthly_volume: data.monthlyVolume,
        purpose: data.purpose,
        pain_point: data.painPoint,
        budget_range: data.budgetRange,
        idempotency_key: data.idempotencyKey,
        status: "SUBMITTED",
      })
      .select("id")
      .single();

    let diagnosisId: string;
    if (ins.error || !ins.data) {
      // 멱등성 경합(동시 2요청) — 23505 면 재조회
      if (ins.error?.code === "23505") {
        const retry = await supabase
          .from("diagnoses")
          .select("id")
          .eq("idempotency_key", data.idempotencyKey)
          .maybeSingle();
        if (retry.data?.id) {
          return NextResponse.json({ diagnosisId: retry.data.id });
        }
      }
      console.error("[diagnoses] diagnoses insert 실패:", ins.error);
      return NextResponse.json({ error: "db_diagnosis" }, { status: 500 });
    }
    diagnosisId = ins.data.id;

    // 8. PROCESSING 으로 먼저 전이 (결함 #1 — webhook 뒤에 하면 경쟁 조건)
    const toProcessing = await supabase
      .from("diagnoses")
      .update({ status: "PROCESSING" })
      .eq("id", diagnosisId);
    if (toProcessing.error) {
      console.error("[diagnoses] PROCESSING 전이 실패:", toProcessing.error);
    }

    // 9. n8n webhook
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn(
        "[diagnoses] N8N_WEBHOOK_URL 미설정 — webhook skip. diagnosisId:",
        diagnosisId,
      );
      return NextResponse.json({ diagnosisId });
    }

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-webhook-secret": process.env.N8N_WEBHOOK_SECRET ?? "",
        },
        body: JSON.stringify(buildWebhookBody(diagnosisId, data)),
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`webhook ${res.status}`);
    } catch (err) {
      // 10. webhook 실패 — FAILED + 실패 알림 (결함 #3). 그래도 200 반환.
      console.error("[diagnoses] webhook 호출 실패:", err);
      await supabase
        .from("diagnoses")
        .update({ status: "FAILED" })
        .eq("id", diagnosisId);
      await sendTelegram(
        `[진단 실패] ${diagnosisId} — webhook 호출 실패`,
        process.env.TELEGRAM_ERROR_CHAT_ID,
      ).catch(() => {});
      return NextResponse.json({ diagnosisId });
    }

    // webhook 성공 — 상태는 PROCESSING 유지, n8n 이 이후 구동
    return NextResponse.json({ diagnosisId });
  } catch (err) {
    console.error("[diagnoses] 처리 중 예외:", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
```

- [ ] **Step 2: 빌드 · 린트 · 타입**

Run: `npm run build && npm run lint`
Expected: 성공. `/api/diagnoses` 가 `ƒ (Dynamic)`.

- [ ] **Step 3: DB 없이 검증 가능한 경로 — curl**

`npm run dev` 실행 후 다른 터미널에서. `.env` 없거나 Supabase 미설정이어도 아래 3개는 DB 접근 전에 반환되므로 통과해야 한다.

Run:
```bash
# 허니팟 → 200 { ok: true }, 무저장
curl -s -X POST localhost:3000/api/diagnoses -H 'content-type: application/json' \
  -d '{"hp_field":"i-am-bot"}'
# → {"ok":true}

# 동의 없음 / 필드 부족 → 400 validation
curl -s -X POST localhost:3000/api/diagnoses -H 'content-type: application/json' \
  -d '{"hp_field":"","consentAgreed":false}'
# → {"error":"validation","issues":[...]}

# 깨진 JSON → 400 invalid_json
curl -s -X POST localhost:3000/api/diagnoses -H 'content-type: application/json' -d 'not json'
# → {"error":"invalid_json"}

# rate limit — 유효하지 않은 바디로 6번 (검증 400 전에 rate limit 체크가 먼저이므로 429 관측)
for i in $(seq 1 6); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:3000/api/diagnoses \
    -H 'content-type: application/json' -d '{"hp_field":""}'
done
# → 400 400 400 400 400 429  (6번째가 429)
```
Expected: 위 주석대로.

- [ ] **Step 4: (Supabase 연결 시) 통합 검증 체크리스트 — 문서화만, 실행은 환경 있을 때**

> 아래는 `.env` 에 동작하는 Supabase(로컬 `npx supabase start` 또는 클라우드 프로젝트, `0001`+`0002` 적용)가 있을 때 실행한다. 없으면 이 단계는 Supabase 연결 시점으로 이월하고, Step 2·3 통과 + 리뷰로 Task 4를 마감한다.

- 유효한 전체 바디(`idempotencyKey` 포함) → `200 {diagnosisId}`. `leads` 1행, `diagnoses` 1행 `status`=`PROCESSING`(webhook 미설정) 또는 `FAILED`(webhook 실패 URL).
- 같은 `idempotencyKey` 로 2회 → 같은 `diagnosisId`, `diagnoses` 여전히 1행, `leads` 여전히 1행.
- 같은 `email` + 다른 `idempotencyKey` → `leads` 1행(정보 갱신됨), `diagnoses` 2행.
- `N8N_WEBHOOK_URL=https://httpstat.us/500` 설정 → 제출 후 해당 `diagnoses.status`=`FAILED`, 콘솔에 `[telegram] 미설정` 또는 전송 로그.
- 동일 IP 6회(유효 바디, 서로 다른 `idempotencyKey`) → 6번째 `429` + `Retry-After`.

- [ ] **Step 5: 커밋**

```bash
git add app/api/diagnoses/route.ts
git commit -m "$(printf 'feat(api): POST /api/diagnoses — 스팸 방어 + PROCESSING 선전이 + webhook (결함 #1 #3 #11 #13)\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01QcFTmB6tN2Dab9PJic7tfV')"
```

---

## Task 5: 폼 로직 — reducer · submit · analytics

**Files:**
- Create: `components/diagnosis/reducer.ts`, `components/diagnosis/submit.ts`, `lib/analytics.ts`

**Interfaces:**
- Consumes: `DiagnosisSubmission`, `DIAGNOSIS_STEP_FIELDS`, `diagnosisStepSchemas` (`lib/validation.ts`).
- Produces:
  - `type WizardState = { step: 1|2|3|4|5; values: Partial<DiagnosisSubmission>; errors: Partial<Record<keyof DiagnosisSubmission, string>>; submitting: boolean; submitError: string | null }`
  - `initialWizardState: WizardState`
  - `type WizardAction` (아래 정의) + `wizardReducer(state, action): WizardState`
  - `validateStep(step, values): { ok: boolean; errors: Partial<Record<keyof DiagnosisSubmission, string>> }`
  - `firstStepWithError(errorKeys): 1|2|3|4|5 | null`
  - `submitDiagnosis(values, idempotencyKey, fetchImpl?): Promise<SubmitResult>` where `SubmitResult = { kind: "ok"; diagnosisId: string } | { kind: "validation"; errors: Partial<Record<keyof DiagnosisSubmission,string>>; jumpTo: 1|2|3|4|5 | null } | { kind: "rate_limited" } | { kind: "error" }`
  - `track(event: string, params?): void` (`lib/analytics.ts`) — Task 6·7이 호출.

- [ ] **Step 1: 실패하는 유닛 테스트 작성**

`_wak_form.mts`:

```ts
import assert from "node:assert/strict";
import {
  wizardReducer,
  initialWizardState,
  validateStep,
  firstStepWithError,
} from "./components/diagnosis/reducer.ts";
import { submitDiagnosis } from "./components/diagnosis/submit.ts";

// reducer: SET_VALUE 는 값 병합 + 해당 필드 에러 제거
{
  let s = { ...initialWizardState, errors: { companyName: "필요" } };
  s = wizardReducer(s, { type: "SET_VALUE", field: "companyName", value: "회사" });
  assert.equal(s.values.companyName, "회사");
  assert.equal(s.errors.companyName, undefined);
}
// reducer: NEXT 는 검증 실패 시 step 유지 + errors 세팅
{
  const s = wizardReducer(initialWizardState, { type: "NEXT" });
  assert.equal(s.step, 1);
  assert.ok(Object.keys(s.errors).length > 0);
}
// reducer: NEXT 는 검증 통과 시 step+1
{
  let s = initialWizardState;
  for (const [f, v] of [
    ["companyName", "회사"],
    ["industry", "제조"],
    ["employeeCount", "5-10명"],
    ["websiteStatus", "없음"],
  ] as const) {
    s = wizardReducer(s, { type: "SET_VALUE", field: f, value: v });
  }
  s = wizardReducer(s, { type: "NEXT" });
  assert.equal(s.step, 2);
}
// reducer: PREV 는 검증 없이 step-1 (1에서는 그대로)
{
  const s2 = { ...initialWizardState, step: 3 as const };
  assert.equal(wizardReducer(s2, { type: "PREV" }).step, 2);
  assert.equal(wizardReducer(initialWizardState, { type: "PREV" }).step, 1);
}
// validateStep
{
  const r = validateStep(1, {});
  assert.equal(r.ok, false);
  assert.ok(r.errors.industry);
}
// firstStepWithError
assert.equal(firstStepWithError(["phone"]), 5);
assert.equal(firstStepWithError(["industry", "phone"]), 1);
assert.equal(firstStepWithError(["idempotencyKey"]), null);

// submitDiagnosis: 200 → ok
{
  const fake = async () =>
    new Response(JSON.stringify({ diagnosisId: "d1" }), { status: 200 });
  const r = await submitDiagnosis({}, "key", fake as typeof fetch);
  assert.deepEqual(r, { kind: "ok", diagnosisId: "d1" });
}
// submitDiagnosis: 400 validation → validation + jumpTo
{
  const fake = async () =>
    new Response(
      JSON.stringify({ error: "validation", issues: [{ path: ["phone"], message: "형식" }] }),
      { status: 400 },
    );
  const r = await submitDiagnosis({}, "key", fake as typeof fetch);
  assert.equal(r.kind, "validation");
  if (r.kind === "validation") {
    assert.equal(r.errors.phone, "형식");
    assert.equal(r.jumpTo, 5);
  }
}
// submitDiagnosis: 429 → rate_limited
{
  const fake = async () => new Response("{}", { status: 429 });
  assert.equal((await submitDiagnosis({}, "k", fake as typeof fetch)).kind, "rate_limited");
}
// submitDiagnosis: 500 → error
{
  const fake = async () => new Response("{}", { status: 500 });
  assert.equal((await submitDiagnosis({}, "k", fake as typeof fetch)).kind, "error");
}
// submitDiagnosis: throw → error
{
  const fake = async () => {
    throw new Error("net");
  };
  assert.equal((await submitDiagnosis({}, "k", fake as typeof fetch)).kind, "error");
}

console.log("OK _wak_form");
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `node --experimental-strip-types _wak_form.mts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: `lib/analytics.ts` 작성**

```ts
type TrackParams = Record<string, string | number | boolean | undefined>;

/**
 * GA4 이벤트. 이 라운드는 호출부만 심는다 — 실제 gtag.js 로드 + 쿠키/분석 동의 UI 는
 * Phase 3 (결함 #22). gtag 가 없으면 개발 중엔 콘솔에만 남긴다.
 */
export function track(event: string, params?: TrackParams): void {
  if (typeof window === "undefined") return;
  const g = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
  if (typeof g === "function") {
    g("event", event, params ?? {});
  } else if (process.env.NODE_ENV !== "production") {
    console.debug("[track]", event, params ?? {});
  }
}
```

- [ ] **Step 4: `components/diagnosis/reducer.ts` 작성**

```ts
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
  | { type: "GO"; step: Step }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_FAIL"; errors?: FieldErrors; jumpTo?: Step | null; message: string }
  | { type: "SUBMIT_DONE" };

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
    case "GO":
      return { ...state, step: action.step, errors: {} };
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
    case "SUBMIT_DONE":
      return { ...state, submitting: false };
    default:
      return state;
  }
}
```

- [ ] **Step 5: `components/diagnosis/submit.ts` 작성**

```ts
import type { DiagnosisSubmission } from "@/lib/validation";
import { firstStepWithError, type FieldErrors, type Step } from "@/lib/../components/diagnosis/reducer";

export type SubmitResult =
  | { kind: "ok"; diagnosisId: string }
  | { kind: "validation"; errors: FieldErrors; jumpTo: Step | null }
  | { kind: "rate_limited" }
  | { kind: "error" };

/**
 * POST /api/diagnoses 호출 + 응답 매핑. fetchImpl 은 테스트 주입용(기본 globalThis.fetch).
 * 네트워크 재시도해도 같은 idempotencyKey 라 서버가 같은 diagnosisId 를 준다.
 */
export async function submitDiagnosis(
  values: Partial<DiagnosisSubmission>,
  idempotencyKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SubmitResult> {
  try {
    const res = await fetchImpl("/api/diagnoses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...values, hp_field: "", idempotencyKey }),
    });

    if (res.status === 200) {
      const json = (await res.json()) as { diagnosisId?: string };
      if (json.diagnosisId) return { kind: "ok", diagnosisId: json.diagnosisId };
      return { kind: "error" };
    }
    if (res.status === 400) {
      const json = (await res.json()) as {
        error?: string;
        issues?: { path: (string | number)[]; message: string }[];
      };
      if (json.error === "validation" && json.issues) {
        const errors: FieldErrors = {};
        for (const issue of json.issues) {
          const key = issue.path[0] as keyof FieldErrors | undefined;
          if (key && !errors[key]) errors[key] = issue.message;
        }
        return {
          kind: "validation",
          errors,
          jumpTo: firstStepWithError(Object.keys(errors)),
        };
      }
      return { kind: "error" };
    }
    if (res.status === 429) return { kind: "rate_limited" };
    return { kind: "error" };
  } catch {
    return { kind: "error" };
  }
}
```

> 주의: `submit.ts` 의 `reducer` import 경로는 상대경로 `./reducer` 로 쓴다. 위 스니펫의 `@/lib/../components/...` 는 피하고 `import { firstStepWithError, type FieldErrors, type Step } from "./reducer";` 로 작성할 것.

- [ ] **Step 6: import 경로 정정**

`components/diagnosis/submit.ts` 상단 import 를 다음으로:

```ts
import type { DiagnosisSubmission } from "@/lib/validation";
import { firstStepWithError, type FieldErrors, type Step } from "./reducer";
```

- [ ] **Step 7: 실행 → 통과, 타입/린트, 삭제**

Run:
```bash
node --experimental-strip-types _wak_form.mts
npx tsc --noEmit && npm run lint && rm _wak_form.mts
```
Expected: `OK _wak_form`, 오류 0.
(`_wak_form.mts` 는 `@/` 별칭 미지원 — 상대경로 import 사용. `reducer.ts`/`submit.ts` 내부의 `@/lib/validation` 은 tsc/next 가 해석.)

- [ ] **Step 8: 커밋**

```bash
git add components/diagnosis/reducer.ts components/diagnosis/submit.ts lib/analytics.ts
git commit -m "$(printf 'feat(diagnosis): wizard reducer · submit 매핑 · track() 스텁\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01QcFTmB6tN2Dab9PJic7tfV')"
```

---

## Task 6: 필드 프리미티브 + shadcn checkbox/label

**Files:**
- Create: `components/diagnosis/fields/{text-field,select-field,multi-select,choice-group,consent-checkbox,honeypot}.tsx`
- Create (shadcn): `components/ui/checkbox.tsx`, `components/ui/label.tsx`

**Interfaces:**
- Produces (Task 7이 소비):
  - `TextField({ label, value, onChange, error?, hint?, type?, placeholder?, maxLength? })`
  - `SelectField({ label, options, value, onChange, error?, placeholder? })`
  - `MultiSelect({ label, options, value, onChange, error? })` — `value: string[]`, `onChange(next: string[])`
  - `ChoiceGroup({ label, options, value, onChange, error?, columns? })`
  - `ConsentCheckbox({ checked, onChange, error? })` — `/privacy` 링크 포함
  - `Honeypot()` — 인자 없음. 폼 `<form>` 내부 어디든 1개.

- [ ] **Step 1: shadcn 컴포넌트 추가**

Run: `npx shadcn@latest add checkbox label`
Expected: `components/ui/checkbox.tsx`, `components/ui/label.tsx` 생성. (프롬프트가 나오면 기본값 수락.)

- [ ] **Step 2: `honeypot.tsx` 작성**

```tsx
// 화면 밖 숨김 입력. display:none 은 일부 봇이 걸러내므로 쓰지 않는다 (기술 스펙 §5).
export function Honeypot() {
  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", left: "-9999px", top: "auto" }}
    >
      <label htmlFor="hp_field">이 칸은 비워 두세요</label>
      <input
        id="hp_field"
        name="hp_field"
        type="text"
        tabIndex={-1}
        autoComplete="off"
      />
    </div>
  );
}
```

> `hp_field` 는 서버가 요청 바디에서 직접 읽는다(빈 문자열 전송). 이 컴포넌트는 사람이 채우면 감지되도록 존재만 하면 되고, wizard 는 이 input 값을 상태로 관리하지 않는다 — 제출 시 `submit.ts` 가 항상 `hp_field: ""` 를 보내고, 봇이 자동완성으로 채운 경우는… (아래 주의)

- [ ] **Step 3: 허니팟 실효화 — wizard 연결 방식 확정**

`submit.ts` 는 항상 `hp_field: ""` 를 보내므로, 위 비제어 input 만으로는 봇 감지가 안 된다. **`Honeypot` 을 제어 컴포넌트로 바꾸고 wizard 상태에 넣는다.** `honeypot.tsx` 를 다음으로 교체:

```tsx
export function Honeypot({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", left: "-9999px", top: "auto" }}
    >
      <label htmlFor="hp_field">이 칸은 비워 두세요</label>
      <input
        id="hp_field"
        name="hp_field"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
```

그리고 `submit.ts` 의 body 를 `{ ...values, hp_field: values.hp_field ?? "", idempotencyKey }` 로 바꾼다(Task 7에서 wizard 가 `hp_field` 를 `values` 에 넣음). `reducer.ts` 의 `Field` 타입은 이미 `keyof DiagnosisSubmission` 이라 `hp_field` 포함.

- [ ] **Step 4: `text-field.tsx` 작성**

```tsx
import { useId } from "react";

export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  type = "text",
  placeholder,
  maxLength,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  type?: string;
  placeholder?: string;
  maxLength?: number;
  inputMode?: "text" | "email" | "tel";
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className="rounded-md border border-line bg-panel px-3 py-2.5 text-[0.95rem] text-ink outline-none focus-visible:border-signal focus-visible:ring-2 focus-visible:ring-signal/30 aria-[invalid=true]:border-red-500"
      />
      {hint && !error && <p className="text-xs text-ink-soft">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 5: `select-field.tsx` 작성**

```tsx
import { useId } from "react";

export function SelectField({
  label,
  options,
  value,
  onChange,
  error,
  placeholder = "선택해 주세요",
}: {
  label: string;
  options: readonly string[];
  value: string | undefined;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <select
        id={id}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        className="rounded-md border border-line bg-panel px-3 py-2.5 text-[0.95rem] text-ink outline-none focus-visible:border-signal focus-visible:ring-2 focus-visible:ring-signal/30 aria-[invalid=true]:border-red-500"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 6: `choice-group.tsx` 작성**

```tsx
export function ChoiceGroup({
  label,
  options,
  value,
  onChange,
  error,
  columns = 2,
}: {
  label: string;
  options: readonly string[];
  value: string | undefined;
  onChange: (v: string) => void;
  error?: string;
  columns?: 1 | 2 | 3;
}) {
  const cols = { 1: "grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" }[columns];
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium text-ink">{label}</legend>
      <div className={`grid gap-2 ${cols}`}>
        {options.map((o) => {
          const active = value === o;
          return (
            <label
              key={o}
              className={`cursor-pointer rounded-md border px-3 py-2.5 text-[0.92rem] transition-colors ${
                active
                  ? "border-signal bg-signal/[0.06] text-ink"
                  : "border-line bg-panel text-ink-soft hover:border-ink-soft"
              }`}
            >
              <input
                type="radio"
                name={label}
                value={o}
                checked={active}
                onChange={() => onChange(o)}
                className="sr-only"
              />
              {o}
            </label>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </fieldset>
  );
}
```

- [ ] **Step 7: `multi-select.tsx` 작성**

```tsx
export function MultiSelect({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  const toggle = (o: string) =>
    onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium text-ink">
        {label} <span className="text-ink-soft">(복수 선택)</span>
      </legend>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((o) => {
          const active = value.includes(o);
          return (
            <label
              key={o}
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-[0.92rem] transition-colors ${
                active
                  ? "border-signal bg-signal/[0.06] text-ink"
                  : "border-line bg-panel text-ink-soft hover:border-ink-soft"
              }`}
            >
              <input
                type="checkbox"
                checked={active}
                onChange={() => toggle(o)}
                className="size-4 accent-[var(--wak-signal)]"
              />
              {o}
            </label>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </fieldset>
  );
}
```

- [ ] **Step 8: `consent-checkbox.tsx` 작성**

```tsx
import Link from "next/link";

export function ConsentCheckbox({
  checked,
  onChange,
  error,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-start gap-2.5 text-[0.92rem] text-ink">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 size-4 accent-[var(--wak-signal)]"
        />
        <span>
          <Link
            href="/privacy"
            target="_blank"
            className="underline decoration-line underline-offset-2 hover:decoration-signal"
          >
            개인정보 수집·이용
          </Link>
          에 동의합니다. (필수)
        </span>
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 9: 임시 프리뷰로 렌더 확인**

`app/diagnosis/__preview/page.tsx` 임시 생성:

```tsx
"use client";
import { useState } from "react";
import { OPTIONS } from "@/lib/options";
import { TextField } from "@/components/diagnosis/fields/text-field";
import { SelectField } from "@/components/diagnosis/fields/select-field";
import { ChoiceGroup } from "@/components/diagnosis/fields/choice-group";
import { MultiSelect } from "@/components/diagnosis/fields/multi-select";
import { ConsentCheckbox } from "@/components/diagnosis/fields/consent-checkbox";
import { Honeypot } from "@/components/diagnosis/fields/honeypot";

export default function Preview() {
  const [s, setS] = useState<Record<string, unknown>>({ tools: [] });
  return (
    <div className="mx-auto max-w-lg space-y-5 p-8 font-display">
      <TextField label="회사명" value={(s.c as string) ?? ""} onChange={(v) => setS({ ...s, c: v })} error="예시 오류" />
      <SelectField label="업종" options={OPTIONS.industry} value={s.i as string} onChange={(v) => setS({ ...s, i: v })} />
      <ChoiceGroup label="홈페이지 유무" options={OPTIONS.websiteStatus} value={s.w as string} onChange={(v) => setS({ ...s, w: v })} />
      <MultiSelect label="사용 도구" options={OPTIONS.currentTools} value={s.tools as string[]} onChange={(v) => setS({ ...s, tools: v })} />
      <ConsentCheckbox checked={!!s.a} onChange={(v) => setS({ ...s, a: v })} />
      <Honeypot value={(s.hp as string) ?? ""} onChange={(v) => setS({ ...s, hp: v })} />
    </div>
  );
}
```

Run: `npm run dev` → 브라우저 `localhost:3000/diagnosis/__preview` 또는 Playwright 스크린샷.
Expected: 모든 필드가 `--wak-*` 토큰(종이색 배경, signal 포커스)으로 렌더. 오류 문구 빨강. 허니팟은 화면에 안 보임.

- [ ] **Step 10: 프리뷰 삭제 · 빌드 · 린트**

Run: `rm -rf app/diagnosis/__preview && npm run build && npm run lint`
Expected: 성공.

- [ ] **Step 11: 커밋**

```bash
git add components/diagnosis/fields components/ui/checkbox.tsx components/ui/label.tsx
git commit -m "$(printf 'feat(diagnosis): 필드 프리미티브 (text/select/choice/multi/consent/honeypot)\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01QcFTmB6tN2Dab9PJic7tfV')"
```

---

## Task 7: 단계 컴포넌트 + wizard + 라우트

**Files:**
- Create: `components/diagnosis/step-company.tsx`, `step-tools.tsx`, `step-tasks.tsx`, `step-workload.tsx`, `step-contact.tsx`, `wizard-progress.tsx`, `diagnosis-wizard.tsx`
- Modify: `app/diagnosis/page.tsx`, `app/diagnosis/[id]/page.tsx`

**Interfaces:**
- Consumes: Task 5 (`wizardReducer`, `initialWizardState`, `validateStep`, `submitDiagnosis`, `track`), Task 6 (필드 프리미티브), `OPTIONS` (`lib/options.ts`).
- Produces: 동작하는 `/diagnosis` 폼. `/diagnosis/[id]` 정적 화면.

- [ ] **Step 1: 공통 step props 타입 + `step-company.tsx`**

각 step 컴포넌트는 동일 시그니처:
```ts
type StepProps = {
  values: Partial<DiagnosisSubmission>;
  errors: FieldErrors;
  set: (field: Field, value: unknown) => void;
};
```

`step-company.tsx`:

```tsx
import { OPTIONS } from "@/lib/options";
import { TextField } from "@/components/diagnosis/fields/text-field";
import { SelectField } from "@/components/diagnosis/fields/select-field";
import { ChoiceGroup } from "@/components/diagnosis/fields/choice-group";
import type { StepProps } from "./step-props";

export function StepCompany({ values, errors, set }: StepProps) {
  return (
    <div className="flex flex-col gap-6">
      <TextField
        label="회사명"
        value={values.companyName ?? ""}
        onChange={(v) => set("companyName", v)}
        error={errors.companyName}
        maxLength={100}
      />
      <SelectField
        label="업종"
        options={OPTIONS.industry}
        value={values.industry}
        onChange={(v) => set("industry", v)}
        error={errors.industry}
      />
      <ChoiceGroup
        label="직원 수"
        options={OPTIONS.employeeCount}
        value={values.employeeCount}
        onChange={(v) => set("employeeCount", v)}
        error={errors.employeeCount}
        columns={3}
      />
      <ChoiceGroup
        label="홈페이지 유무"
        options={OPTIONS.websiteStatus}
        value={values.websiteStatus}
        onChange={(v) => set("websiteStatus", v)}
        error={errors.websiteStatus}
      />
    </div>
  );
}
```

`components/diagnosis/step-props.ts`:
```ts
import type { DiagnosisSubmission } from "@/lib/validation";
import type { Field, FieldErrors } from "./reducer";

export type StepProps = {
  values: Partial<DiagnosisSubmission>;
  errors: FieldErrors;
  set: (field: Field, value: unknown) => void;
};
```

- [ ] **Step 2: `step-tools.tsx` / `step-tasks.tsx`**

`step-tools.tsx`:
```tsx
import { OPTIONS } from "@/lib/options";
import { MultiSelect } from "@/components/diagnosis/fields/multi-select";
import type { StepProps } from "./step-props";

export function StepTools({ values, errors, set }: StepProps) {
  return (
    <MultiSelect
      label="지금 쓰는 도구"
      options={OPTIONS.currentTools}
      value={values.currentTools ?? []}
      onChange={(v) => set("currentTools", v)}
      error={errors.currentTools}
    />
  );
}
```

`step-tasks.tsx`: 위와 동일 구조, `label="반복하는 업무"`, `options={OPTIONS.repetitiveTasks}`, `value={values.repetitiveTasks ?? []}`, `onChange={(v) => set("repetitiveTasks", v)}`, `error={errors.repetitiveTasks}`.

- [ ] **Step 3: `step-workload.tsx`**

```tsx
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
```

- [ ] **Step 4: `step-contact.tsx`**

```tsx
import { OPTIONS } from "@/lib/options";
import { ChoiceGroup } from "@/components/diagnosis/fields/choice-group";
import { TextField } from "@/components/diagnosis/fields/text-field";
import { ConsentCheckbox } from "@/components/diagnosis/fields/consent-checkbox";
import type { StepProps } from "./step-props";

export function StepContact({ values, errors, set }: StepProps) {
  return (
    <div className="flex flex-col gap-6">
      <ChoiceGroup label="도입 목적" options={OPTIONS.purpose} columns={2}
        value={values.purpose} onChange={(v) => set("purpose", v)} error={errors.purpose} />
      <ChoiceGroup label="예산 범위" options={OPTIONS.budgetRange} columns={2}
        value={values.budgetRange} onChange={(v) => set("budgetRange", v)} error={errors.budgetRange} />
      <ChoiceGroup label="상담 방식" options={OPTIONS.consultingMethod} columns={2}
        value={values.consultingMethod} onChange={(v) => set("consultingMethod", v)} error={errors.consultingMethod} />
      <TextField label="이름" value={values.contactName ?? ""}
        onChange={(v) => set("contactName", v)} error={errors.contactName} maxLength={50} />
      <TextField label="이메일" type="email" inputMode="email" value={values.email ?? ""}
        onChange={(v) => set("email", v)} error={errors.email} />
      <TextField label="휴대폰 번호" type="tel" inputMode="tel" value={values.phone ?? ""}
        onChange={(v) => set("phone", v)} error={errors.phone} hint="010-1234-5678" />
      <ConsentCheckbox checked={values.consentAgreed === true}
        onChange={(v) => set("consentAgreed", v)} error={errors.consentAgreed} />
    </div>
  );
}
```

- [ ] **Step 5: `wizard-progress.tsx`**

```tsx
const LABELS = ["회사", "도구", "업무", "업무량", "상담"] as const;

export function WizardProgress({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label={`5단계 중 ${step}단계`}>
      {LABELS.map((label, i) => {
        const n = i + 1;
        const state = n < step ? "done" : n === step ? "current" : "todo";
        return (
          <li key={label} className="flex flex-1 flex-col items-center gap-1.5">
            <span
              className={`h-1 w-full rounded-full ${
                state === "done"
                  ? "bg-resolved"
                  : state === "current"
                    ? "bg-signal"
                    : "bg-line"
              }`}
            />
            <span
              className={`font-flow text-[0.68rem] ${
                state === "current" ? "text-ink" : "text-ink-soft"
              }`}
            >
              {String(n).padStart(2, "0")} {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 6: `diagnosis-wizard.tsx`**

```tsx
"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  wizardReducer,
  initialWizardState,
  type Field,
  type Step,
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
```

> import 에서 `useRef` 는 위 코드가 쓰므로 유지. `step1_view` 는 첫 마운트 시 첫 useEffect 로 발생. `SUBMIT_DONE` 액션은 성공 시 `router.push` 로 화면을 떠나므로 호출하지 않는다(정의만 존재).

- [ ] **Step 7: `app/diagnosis/page.tsx` 교체**

```tsx
import Link from "next/link";
import { IBM_Plex_Mono } from "next/font/google";
import { DiagnosisWizard } from "@/components/diagnosis/diagnosis-wizard";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

const PRETENDARD_CSS =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendard-variable-dynamic-subset.min.css";

export default function DiagnosisPage() {
  return (
    <div
      className={`${plexMono.variable} font-display min-h-full bg-paper text-ink`}
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
      <DiagnosisWizard />
    </div>
  );
}
```

- [ ] **Step 8: `app/diagnosis/[id]/page.tsx` 교체 (정적 "분석 중")**

```tsx
import Link from "next/link";
import { IBM_Plex_Mono } from "next/font/google";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

const PRETENDARD_CSS =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendard-variable-dynamic-subset.min.css";

// 정적 화면 — 폴링·결과 카드·FAILED UX 는 Phase 2.1~2.3.
export default async function DiagnosisResultPage({
  params,
}: PageProps<"/diagnosis/[id]">) {
  const { id } = await params;
  return (
    <div
      className={`${plexMono.variable} font-display flex min-h-full flex-col items-center bg-paper px-5 py-20 text-ink`}
    >
      <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
      <link rel="stylesheet" href={PRETENDARD_CSS} />
      <div className="w-full max-w-md">
        <p className="font-flow text-[0.7rem] text-signal">접수 완료</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
          AI가 분석하고 있습니다
        </h1>
        <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-soft">
          보통 1~2분이면 끝납니다. 결과가 준비되면 이 페이지에서 확인할 수 있어요.
          분석 결과는 AI가 계산한 추정치입니다.
        </p>
        <p className="mt-6 font-flow text-xs text-ink-soft">진단 번호 · {id}</p>
        <div className="mt-8 flex gap-4 text-sm">
          <Link href="/" className="text-signal underline underline-offset-4">
            홈으로
          </Link>
          <Link
            href="/consultation"
            className="text-signal underline underline-offset-4"
          >
            상담 신청
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: 빌드 · 린트**

Run: `npm run build && npm run lint`
Expected: 성공. `/diagnosis` 는 client 컴포넌트 포함(`ƒ` 또는 `○` 로 뜨되 wizard 는 클라이언트 청크). `/diagnosis/[id]` 는 `ƒ` (동적 params).

- [ ] **Step 10: Playwright 흐름 검증**

`npm run dev` 후:
1. `localhost:3000/diagnosis` — 1단계(회사 정보) 렌더, 진행률 `01 회사` 활성
2. 아무것도 안 넣고 "다음" → 인라인 오류(회사명/업종/직원 수/홈페이지), 단계 유지
3. 1단계 채우고 "다음" → 2단계. 콘솔에 `[track] step1_complete`, `[track] step2_view`
4. 2·3단계는 선택 없이도 "다음" 통과
5. 4단계 필수(시간/인원/건수) 미입력 시 오류
6. 5단계: 이메일 `abc`(형식 오류), 전화 `123`(형식 오류) → "다음"/"신청" 시 인라인 오류. 동의 미체크 → 오류
7. 5단계 정상 입력 + 동의 → "무료 진단 신청" → 버튼 `제출 중…` → (Supabase 없으면 500 → `submitError` 배너, 버튼 재활성화)
8. "이전"으로 값 유지 확인. 새로고침 → 1단계로 초기화(지속성 없음 — 의도)
9. 뷰포트 390 / 1280 각각 스크린샷
10. (Supabase 연결 시) 7번이 `/diagnosis/<uuid>` 로 이동, "AI가 분석하고 있습니다" + 진단 번호 표시. 콘솔 `[track] step5_submit`

Expected: 1~9 통과. 10은 환경 있을 때.

- [ ] **Step 11: 커밋**

```bash
git add components/diagnosis app/diagnosis
git commit -m "$(printf 'feat(diagnosis): 5단계 wizard + 단계 컴포넌트 + /diagnosis[/id] 페이지\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01QcFTmB6tN2Dab9PJic7tfV')"
```

---

## Task 8: frontend-design 패스 (폼)

**Files:**
- Modify: `components/diagnosis/*.tsx` (스타일만), 필요 시 `app/globals.css` (오류색 토큰 등)

**Interfaces:** 변경 없음 — 순수 시각 레이어.

- [ ] **Step 1: `frontend-design` 스킬 로드**

`Skill(frontend-design)` 호출. 브리프: "랜딩(`--wak-*`, Pretendard + Plex Mono, 워크플로 스파인/파이프라인 컨셉, 라이트 전용)과 통일된 5단계 진단 폼. 미니멀 크롬(워드마크만). 진행률은 5노드 트랙. 폼 이탈률을 낮추는 조용하고 명확한 UI."

- [ ] **Step 2: 스펙 §7 기준으로 다듬기**

- 진행률: 5노드 가로 트랙 — 현재 `--signal`, 완료 `--resolved`, 예정 `--line`. 랜딩 히어로 파이프라인 시각 언어를 이어받되 과하지 않게.
- 필드: 라벨·입력·포커스(`--signal` 링)·오류 상태. `choice-group`/`multi-select` 선택 칩 일관.
- 한 화면 = 한 단계. "이전 / 다음", 5단계 "무료 진단 신청".
- 오류 배너, 인라인 오류 문구 스타일.
- 반응형: 단일 열, 넉넉한 탭 타깃(최소 44px). 모바일 우선.
- 비트리거 모션 없음. `prefers-reduced-motion` 존중.
- 빨강 계열은 `app/globals.css` 에 `--wak-danger` 토큰으로 추가해 Tailwind `text-danger` 등으로 쓰거나, Task 6~7에서 쓴 `red-500/600/700` 유지 — 택1하고 일관.

- [ ] **Step 3: 스크린샷 리뷰**

Playwright 로 5단계 각각 + 오류 상태 + 모바일/데스크톱 스크린샷. 스펙 §7 항목과 대조:
- [ ] 랜딩과 톤 일치(색·타이포·여백)
- [ ] 진행률이 현재/완료/예정 구분됨
- [ ] 포커스 링 보임, 오류 문구 대비 충분
- [ ] 모바일에서 탭 타깃·가독성 OK
- [ ] 크롬은 워드마크만

- [ ] **Step 4: 빌드 · 린트 · 커밋**

```bash
npm run build && npm run lint
git add -A
git commit -m "$(printf 'style(diagnosis): frontend-design 패스 — 랜딩과 통일된 폼 UI\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01QcFTmB6tN2Dab9PJic7tfV')"
```

---

## Task 9: 문서 갱신 + 마감

**Files:**
- Modify: `.env.example`, `task.md`, `CLAUDE.md`

- [ ] **Step 1: `.env.example` 주석 갱신**

`N8N_WEBHOOK_URL` 위 주석을 다음으로:
```
# 진단 제출 시 호출할 n8n webhook 엔드포인트.
#   미설정: webhook 호출을 skip하고 diagnoses.status 는 PROCESSING 에 머문다(개발).
#   설정+실패: diagnoses.status=FAILED + TELEGRAM_ERROR_CHAT_ID 로 [진단 실패] 알림.
```

- [ ] **Step 2: `task.md` — Phase 1 라운드 2 반영**

`- [ ] 1.2~1.7 ...` 항목을 `- [x]` 로 바꾸고 하위에:
```
  - [x] 1.2~1.7 진단 폼 + POST /api/diagnoses (2026-09-04)
    - 마이그레이션 0002 (idempotency_key + 부분 유니크). 로컬 Postgres 적용 확인.
    - lib: validation(단계 스키마), pick, diagnosisWebhook(PII 경계), telegram, analytics(track 스텁)
    - POST /api/diagnoses: 허니팟/rate limit/zod → 멱등성 조회 → leads upsert → diagnoses insert
      → PROCESSING 선전이(결함 #1) → webhook(PII 제외) → 실패 시 FAILED+Telegram(결함 #3)
    - 폼: 단일 client wizard(useReducer, 지속성 없음), 5단계, 단계별 zod, 허니팟, GA4 track 호출부
    - /diagnosis/[id]: 정적 "분석 중" (폴링은 Phase 2.1~2.2)
    - 검증: build/lint 통과, 0002 SQL, non-DB curl 3종, 폼 Playwright 흐름. DB 통합 검증은 Supabase 연결 시.
```
"현재 상태" 블록의 Phase 1 줄도 갱신. 스펙 결함 추적표 #1 #3 #11 #13 행에 `(라운드 2 반영)` 표기.

- [ ] **Step 3: `CLAUDE.md` — 결함 #13**

"알려진 스펙 결함" 표 #13 행을 `— **resolved** (0002 부분 유니크 인덱스 + 클라이언트 idempotencyKey, POST /api/diagnoses)` 로.
"현재 상태" 문단을 Phase 1(랜딩 + 진단 폼) 완료, 다음 Phase 2로 갱신.

- [ ] **Step 4: 최종 빌드 · 린트**

Run: `npm run build && npm run lint`
Expected: 성공, 경고 0.

- [ ] **Step 5: 커밋**

```bash
git add .env.example task.md CLAUDE.md
git commit -m "$(printf 'docs: Phase 1 라운드 2 반영 (task.md · CLAUDE.md · .env.example)\n\nCo-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01QcFTmB6tN2Dab9PJic7tfV')"
```

---

## Self-Review (작성자 체크)

**1. 스펙 커버리지**

| 스펙 절 | 구현 태스크 |
|---|---|
| §3 마이그레이션 0002 | Task 1 |
| §4.1 idempotencyKey | Task 2 Step 3 |
| §4.2 단계 스키마 | Task 2 Step 3 |
| §5.1 처리 순서 1~11 | Task 4 Step 1 |
| §5.2 lib/telegram.ts | Task 3 Step 5 |
| §6.1 /diagnosis 크롬 | Task 7 Step 7 |
| §6.1 /diagnosis/[id] 정적 | Task 7 Step 8 |
| §6.2 컴포넌트 표 | Task 6 (fields) + Task 7 (steps/wizard) |
| §6.3 wizard 동작(다음/이전/제출/이벤트) | Task 5 (reducer/submit) + Task 7 Step 6 |
| §6.4 lib/analytics.ts | Task 5 Step 3 |
| §7 frontend-design 패스 | Task 8 |
| §8 오류 처리 | Task 4 (서버) + Task 5·7 (클라이언트) |
| §9 검증 | 각 태스크 검증 스텝 + Task 7 Step 10 |
| §10 영향 파일 | 파일 구조 표 + 각 태스크 Files |
| §11 결함 매핑 #1 #2 #3 #11 #13 #19 #22 | Task 4(#1 #2 #3 #11), Task 1+2+4(#13), 기존 rateLimit(#19), Task 5(#22 track 스텁) |

빠진 것: 없음. (#19 는 `lib/rateLimit.ts` 에 이미 있음 — 이 라운드에서 손대지 않음.)

**2. 플레이스홀더 스캔**: "TODO/TBD/적절히 처리" 없음. 모든 코드 스텝에 실제 코드 블록 있음. Task 6 Step 2→3 은 의도적 정정(비제어→제어 허니팟) — 실행자가 순서대로 읽으면 최종 형태가 명확.

**3. 타입 일관성**:
- `Step = 1|2|3|4|5`, `Field = keyof DiagnosisSubmission`, `FieldErrors` — `reducer.ts`에서 정의, `submit.ts`·`step-props.ts`·wizard에서 동일 import.
- `submitDiagnosis(values, idempotencyKey, fetchImpl?)` → `SubmitResult` — Task 5 정의, Task 7 wizard에서 `r.kind` 분기 일치.
- `buildWebhookBody(diagnosisId, data)` — Task 3 정의, Task 4에서 동일 시그니처 호출.
- `track(event, params?)` — Task 5 정의, Task 7에서 `track(\`step${n}_view\`)` 등 호출.
- `wizardReducer` 액션 타입 `SET_VALUE|NEXT|PREV|GO|SUBMIT_START|SUBMIT_FAIL|SUBMIT_DONE` — Task 5 정의, Task 7 dispatch 호출 일치(`SUBMIT_DONE` 는 현재 미사용이나 향후 여지, 무해).

수정 사항: Task 5 Step 5 스니펫의 잘못된 import 경로(`@/lib/../components/...`)는 Step 6에서 정정하도록 명시함.
