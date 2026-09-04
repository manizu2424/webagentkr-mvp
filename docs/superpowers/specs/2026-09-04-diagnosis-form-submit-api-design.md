# 진단 폼 + `POST /api/diagnoses` 설계 (Phase 1 라운드 2)

- 날짜: 2026-09-04
- 범위: `task.md` Phase 1의 1.2 ~ 1.7 (5단계 진단 폼, 클라이언트 검증, 허니팟, `POST /api/diagnoses`, 서버 멱등성, 결과 페이지 이동)
- 근거: `docs/개발_착수_기술_스펙.md` §4.1 · §5 · §9, `docs/개발자용_통합_MVP_기획서.md` §7 · §14.4 · §16.1, `docs/decisions.md` D1 · D2, `CLAUDE.md` "알려진 스펙 결함" #1 #2 #3 #11 #13 #19
- 선행: Phase 0 완료(스키마 `0001`, `lib/*` 준비), Phase 1 라운드 1 완료(랜딩 + `--wak-*` 토큰 + `components/marketing/*`)

## 1. 목표와 비목표

### 목표

방문자가 `/diagnosis`에서 회사·업무·연락 정보를 5단계로 입력하고 제출하면, 서버가
스팸 방어를 거쳐 `leads` + `diagnoses` 행을 만들고 n8n webhook을 트리거한 뒤
`{ diagnosisId }`를 반환한다. 클라이언트는 `/diagnosis/[id]`로 이동한다.
이 라운드가 만드는 **인터페이스**(요청/응답 계약, n8n webhook 페이로드, 상태 전이,
`0002` 마이그레이션)는 Phase 2(n8n, 결과 페이지)가 의존한다.

### 비목표 (다음 Phase)

- `GET /api/diagnoses/[id]` + 결과 페이지 폴링·결과 카드·FAILED UX → Phase 2.1~2.3
- n8n 워크플로우, 성공 경로 Telegram "신규 진단" 알림 → Phase 2
- GA4 스크립트 로드 + 쿠키/분석 동의 UI → Phase 3 (이 라운드는 `track()` 호출부만 심음)
- `POST /api/consultations`, 상담 폼 → Phase 3
- 폼 부분 진행 지속성(`sessionStorage`), URL 단계 구동 → 채택 안 함 (YAGNI, 아래 6절)
- 랜딩 TODO 문구(구축 절차·신뢰 요소·FAQ·사업자 정보) → 별건

## 2. 결정 요약

| # | 결정 | 이유 |
|---|---|---|
| D-A | 폼은 **단일 클라이언트 컴포넌트 + `useReducer`**, 지속성 없음 | 5단계·한자리 완료용. `sessionStorage`/URL 단계는 과설계. 새로고침 소실은 MVP 허용 트레이드오프 |
| D-B | 멱등성 = **클라이언트 생성 `idempotencyKey`(UUID) + `diagnoses` 부분 유니크 인덱스** | 결함 #13. 재제출 시 기존 `diagnosisId` 반환, 추가 lead/webhook 없음 |
| D-C | 결과 페이지 `/diagnosis/[id]`는 이 라운드에서 **정적 "분석 중" 화면**만 (폴링·DB 조회 없음) | 전환 흐름만 먼저 관통. 폴링/렌더는 Phase 2 |
| D-D | 폼 페이지 크롬 = **워드마크만 + 진행률**, 네비 없음 | 폼 이탈률 최소화 |
| D-E | GA4 = **얇은 `track()` 스텁 + 호출부 지금 삽입** | 나중에 폼을 다시 열지 않기 위해. 실제 스크립트·동의 UI는 Phase 3 |
| D-F | 폼 UI = **frontend-design 풀 패스** (랜딩 `--wak-*` 토큰 재사용, 라이트 전용) | 폼 완성도가 전환율에 직결 |
| D-G | webhook 실패 알림 → `TELEGRAM_ERROR_CHAT_ID`, 타임아웃 10초 | 기획서 §16.5(에러는 에러 채널). 성공 알림은 n8n 담당 |

## 3. 마이그레이션 — `supabase/migrations/0002_diagnoses_idempotency.sql`

```sql
-- 0001 이후 Supabase 대시보드 > SQL Editor 에 붙여넣어 1회 실행.
-- 멱등성 키: POST /api/diagnoses 가 클라이언트에서 받은 UUID. 더블클릭/네트워크 재시도로
-- 같은 제출이 두 번 와도 leads/diagnoses 행과 AI 호출이 한 번만 일어나게 한다 (결함 #13).

alter table diagnoses add column idempotency_key uuid;

-- 부분 유니크: 관리자/향후 생성 행(키 없음)은 서로 충돌하지 않는다.
create unique index diagnoses_idempotency_key_key
  on diagnoses (idempotency_key)
  where idempotency_key is not null;
```

- `diagnoses.status` CHECK, `updated_at` 트리거, RLS는 `0001` 그대로 — 변경 없음.
- 롤백은 MVP 범위 밖(단일 개발자, 재적용). 필요 시 `drop index` + `drop column`.

## 4. `lib/validation.ts` 변경

### 4.1 `diagnosisSubmissionSchema` 에 필드 추가

```ts
idempotencyKey: z.uuid({ error: "잘못된 요청입니다" }),
```

- 위치: 스키마 맨 끝(`hp_field` 옆). 내부 전용이므로 **`N8N_PAYLOAD_KEYS` 에는 넣지 않는다**.
- `N8N_PAYLOAD_KEYS`(현재 11키: industry, employeeCount, websiteStatus, currentTools,
  repetitiveTasks, dailyHours, staffCount, monthlyVolume, purpose, painPoint, budgetRange)
  는 그대로. 라우트가 `diagnosisId`를 앞에 붙여 최종 webhook 바디를 만든다.

### 4.2 단계별 부분 스키마

```ts
export const DIAGNOSIS_STEP_FIELDS = {
  1: ["companyName", "industry", "employeeCount", "websiteStatus"],
  2: ["currentTools"],
  3: ["repetitiveTasks"],
  4: ["dailyHours", "staffCount", "monthlyVolume", "painPoint"],
  5: ["purpose", "budgetRange", "consultingMethod",
      "contactName", "email", "phone", "consentAgreed"],
} as const satisfies Record<1 | 2 | 3 | 4 | 5, readonly (keyof DiagnosisSubmission)[]>;

// 각 단계 pick 스키마는 명시적으로 5개 작성 (Object.fromEntries 는 리터럴 타입 소실).
export const diagnosisStep1Schema = diagnosisSubmissionSchema.pick({
  companyName: true, industry: true, employeeCount: true, websiteStatus: true,
});
// ... step2 ~ step5 동일 패턴
export const diagnosisStepSchemas = {
  1: diagnosisStep1Schema, 2: diagnosisStep2Schema, 3: diagnosisStep3Schema,
  4: diagnosisStep4Schema, 5: diagnosisStep5Schema,
} as const;
```

- `hp_field`, `idempotencyKey` 는 어느 단계 스키마에도 없다 — 서버 전체 검증과 최종 제출에서만.
- 2·3단계는 `currentTools`/`repetitiveTasks` 가 `.default([]).max(20)` 라 0개도 통과(스펙상 필수 아님).
- 5단계 `consentAgreed` 는 `z.literal(true)` 라 미체크 시 단계 진행도 막힌다(서버 400과 동일 규칙).

## 5. `POST /api/diagnoses` — `app/api/diagnoses/route.ts`

`export async function POST(req: Request)` 로 스텁 교체. 모든 DB 접근은 `createServiceClient()`.

### 5.1 처리 순서

| # | 단계 | 실패 처리 |
|---|---|---|
| 1 | `await req.json()` | catch → `400 { error: "invalid_json" }` |
| 2 | 허니팟: `body.hp_field` 가 비어있지 않으면 | `200 { ok: true }` — 무저장, `console.warn` 만 (봇에게 신호 주지 않음) |
| 3 | rate limit: `checkRateLimit(getClientIp(req), 5, 60*60*1000)` | `!ok` → `429 { error: "rate_limited", retryAfterSec }` + `Retry-After` 헤더 |
| 4 | `diagnosisSubmissionSchema.safeParse(body)` | `!success` → `400 { error: "validation", issues: error.issues }` (필드 경로 포함). `consentAgreed !== true` 도 여기서 걸린다 |
| 5 | **멱등성 조회**: `select id from diagnoses where idempotency_key = data.idempotencyKey` | 행 있으면 → `200 { diagnosisId: row.id }` **즉시 반환** (신규 생성·webhook 없음) |
| 6 | `leads` upsert: `.upsert({ company_name, industry, employee_count, contact_name, email, phone, consulting_method }, { onConflict: "email" }).select("id").single()` → `leadId` (결함 #11 — 재방문자 중복/오류 방지) | error → `500 { error: "db_lead" }` + `console.error` |
| 7 | `diagnoses` insert: `.insert({ lead_id: leadId, website_status, current_tools, repetitive_tasks, daily_hours, staff_count, monthly_volume, purpose, pain_point, budget_range, idempotency_key: data.idempotencyKey, status: "SUBMITTED" }).select("id").single()` → `diagnosisId` | Postgres `23505`(멱등성 경합) → 5번 재조회 후 `200 { diagnosisId }`. 그 외 error → `500 { error: "db_diagnosis" }` |
| 8 | **`status = "PROCESSING"` 로 먼저 전이** (결함 #1 — webhook 뒤에 하면 n8n 이 먼저 끝났을 때 COMPLETED 를 덮어씀): `.update({ status: "PROCESSING" }).eq("id", diagnosisId)` | error → `console.error`, 계속 진행 |
| 9 | n8n webhook: `N8N_WEBHOOK_URL` 없으면 `console.warn("[diagnoses] N8N_WEBHOOK_URL 미설정 — webhook skip", diagnosisId)` 후 11로. 있으면 `fetch(N8N_WEBHOOK_URL, { method:"POST", headers:{ "content-type":"application/json", "x-webhook-secret": N8N_WEBHOOK_SECRET ?? "" }, body: JSON.stringify({ diagnosisId, ...pick(data, N8N_PAYLOAD_KEYS) }), signal: AbortSignal.timeout(10_000) })` | throw(네트워크/타임아웃) **또는** `!res.ok` → 10으로 (FAILED 경로) |
| 10 | **webhook 실패 경로** (결함 #3): `.update({ status: "FAILED" }).eq("id", diagnosisId)` → `sendTelegram(\`[진단 실패] ${diagnosisId} — webhook 호출 실패\`, TELEGRAM_ERROR_CHAT_ID)` best-effort(try/catch/log). 그래도 아래 11로 진행 | — |
| 11 | `200 { diagnosisId }` | — |

- webhook **성공** 시 상태는 `PROCESSING` 유지 — 이후 COMPLETED/FAILED 는 n8n 이 service_role 로 직접 기록(Phase 2). Next 쪽 콜백 API 없음.
- 응답은 저장이 일어난 모든 경우 `200`(스펙 §4.1 원문이 `{ diagnosisId }` 만 명시, `201` 아님).
- `pick(obj, keys)`: 작은 로컬 헬퍼 또는 인라인. `N8N_PAYLOAD_KEYS` 만 추려 PII(회사명·이름·이메일·전화) 제외 (기획서 §16.1).
- `pain_point` 는 자유 텍스트라 사용자가 PII 를 넣을 수 있음 — 코드에 주석. 스펙상 webhook 포함은 허용.
- content-type 가드는 생략(허니팟+zod 로 충분). Next 기본 바디 크기 제한에 의존.

### 5.2 신규 `lib/telegram.ts`

```ts
import "server-only";
/** 미설정 시 no-op + warn. 라운드 2는 진단 실패 알림에만 쓴다. */
export async function sendTelegram(text: string, chatId?: string): Promise<void>
```

- `TELEGRAM_BOT_TOKEN` 과 (`chatId ?? TELEGRAM_ADMIN_CHAT_ID`) 로 `https://api.telegram.org/bot<token>/sendMessage` POST.
- 토큰/챗ID 없으면 `console.warn` 후 반환. 호출부는 항상 `await ...catch(() => {})` 로 감싸 실패가 응답을 막지 않게 한다.

## 6. 폼 — `components/diagnosis/*` + 라우트

### 6.1 라우트

- `app/diagnosis/page.tsx` (RSC) — 미니멀 헤더(`WEBAGENT.KR` 워드마크, `/` 링크, **네비 없음**) + `<DiagnosisWizard />`. `(marketing)` 레이아웃 안 씀.
- `app/diagnosis/[id]/page.tsx` (RSC) — 스텁 교체 → **정적** "접수 완료 · 분석 중" 화면:
  - 확인 문구, `diagnosisId` 표시, "분석에는 보통 1~2분 걸립니다", "결과는 AI 추정치입니다" 명시
  - 홈(`/`) · 상담(`/consultation`) 링크
  - **폴링·DB 조회·존재 확인 없음** — 아무 `id` 여도 이 화면. `GET` + 폴링은 Phase 2.1~2.2.

### 6.2 컴포넌트

| 파일 | 역할 |
|---|---|
| `diagnosis-wizard.tsx` (client) | 전체. `useReducer` 상태 `{ step: 1..5, values: Partial<DiagnosisSubmission>, errors: Partial<Record<Field,string>>, submitting: boolean, submitError: string \| null }` + `idempotencyKey` 는 `useState(() => crypto.randomUUID())` |
| `wizard-progress.tsx` | 5노드 트랙. 현재 `--signal`, 완료 `--resolved`, 예정 `--line` (랜딩 파이프라인/스파인 시각 언어 재사용) |
| `step-company.tsx` | 1단계: companyName, industry, employeeCount, websiteStatus |
| `step-tools.tsx` | 2단계: currentTools (복수) |
| `step-tasks.tsx` | 3단계: repetitiveTasks (복수) |
| `step-workload.tsx` | 4단계: dailyHours, staffCount, monthlyVolume, painPoint (D1: "현재 처리 방식" 없음) |
| `step-contact.tsx` | 5단계: purpose, budgetRange, consultingMethod, contactName, email, phone, consentAgreed |
| `fields/text-field.tsx` | label + input + error + hint |
| `fields/select-field.tsx` | 네이티브 `<select>` 스타일. 긴 목록(industry 12개) |
| `fields/multi-select.tsx` | 체크박스 그리드. currentTools / repetitiveTasks |
| `fields/choice-group.tsx` | 단일 선택 짧은 버킷(websiteStatus, dailyHours, staffCount, monthlyVolume, purpose, budgetRange, consultingMethod) |
| `fields/consent-checkbox.tsx` | 5단계. `/privacy` 링크 |
| `fields/honeypot.tsx` | `hp_field` 숨김 input. `position:absolute; left:-9999px` + `tabIndex={-1}` + `aria-hidden="true"`. **`display:none` 금지** (기술 스펙 §5). wizard 에 1개, 단계 밖 |

- 모든 선택지는 `lib/options.ts` 에서 읽는다 — 라벨 하드코딩·신규 생성 금지 (D2).
- shadcn 은 `checkbox` + `label` 만 추가(a11y). 나머지 입력기는 `--wak-*` 토큰으로 핸드롤.
- 필드 컴포넌트는 자체 상태 없음 — wizard 의 `values`/`errors` 에 바인딩된 controlled.

### 6.3 wizard 동작

- **"다음"**: `diagnosisStepSchemas[step].safeParse(현재 단계 값들)`.
  - 실패 → `errors` 세팅, 진행 안 함, 첫 오류 필드로 포커스 이동. `step{N}_complete` 안 쏨.
  - 성공 → `track("step" + step + "_complete")` → `dispatch(next)` → 새 단계 진입 시 `track("step" + (step+1) + "_view")`.
- **"이전"**: 검증 없이 `dispatch(prev)`. 진입한 단계에 대해 `step{N}_view` 쏨.
- `step1_view` 는 wizard 마운트 시 1회.
- **최종 제출** (5단계 "무료 진단 신청"):
  1. `dispatch(submitting)` → 버튼 `disabled`
  2. `fetch("/api/diagnoses", { method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify({ ...values, hp_field: "", idempotencyKey }) })`
  3. `200 { diagnosisId }` → `track("step5_submit")` (스펙 §9: "호출 성공 직후") → `router.push("/diagnosis/" + diagnosisId)`
  4. `400 { issues }` → 필드 경로로 `errors` 매핑. 단계 필드가 섞여 있으면 오류 필드를 포함한 **가장 앞 단계**로 `dispatch`. `idempotencyKey`/`hp_field` 등 단계 밖 필드만이면 `dispatch` 없이 `submitError` 만 세팅
  5. `429` → `submitError = "요청이 많습니다. 잠시 후 다시 시도해 주세요."`, 버튼 재활성화
  6. `500` / 네트워크 throw → `submitError = "제출 중 문제가 발생했습니다. 다시 시도해 주세요."`, 재활성화
  7. 재시도 시 같은 `idempotencyKey` → 서버가 기존 `diagnosisId` 반환 → 중복 없음
- **중복 제출 방지**: 버튼 `disabled={submitting}` (클라이언트) + `idempotencyKey`/유니크 인덱스 (서버). 성공 후엔 재활성화하지 않고 이동.

### 6.4 `lib/analytics.ts`

```ts
type TrackParams = Record<string, string | number | boolean | undefined>;

export function track(event: string, params?: TrackParams): void {
  if (typeof window === "undefined") return;
  const g = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
  if (typeof g === "function") g("event", event, params ?? {});
  else if (process.env.NODE_ENV !== "production")
    console.debug("[track]", event, params ?? {});
}
```

- 라운드 2 호출부: `step1_view` ~ `step5_view`, `step1_complete` ~ `step4_complete`, `step5_submit`.
- `diagnosis_result_view`(Phase 2), `consultation_cta_click` / `consultation_submit`(Phase 3) 은 이번에 안 함.
- GA4 `gtag.js` 로드 + 쿠키/분석 동의 UI 는 Phase 3 (결함 #22).

## 7. frontend-design 패스 범위 (폼)

- `--wak-*` 토큰 · Pretendard + IBM Plex Mono · 라이트 전용 (랜딩과 통일).
- 미니멀 헤더(워드마크만).
- 진행률: 5노드 가로 트랙 — 랜딩 히어로 파이프라인/스파인 언어를 이어받음. 현재 노드 `--signal`, 완료 `--resolved`, 예정 `--line`.
- 한 화면 = 한 단계. "이전 / 다음", 5단계는 "무료 진단 신청" 제출.
- 필드: 라벨·입력·포커스·오류 상태(빨강 계열 토큰). 복수 선택은 태그/체크박스 그리드.
- 동의 체크박스 + `/privacy` 링크.
- 반응형: 단일 열, 넉넉한 탭 타깃. 모바일 우선.
- 모션: 단계 전환은 즉시(비트리거 모션 없음). `prefers-reduced-motion` 존중.

## 8. 오류 처리 요약

- **서버**: 모든 분기 명시적 상태코드(5.1 표). 예상외 → `500 { error }` + `console.error`. zod `issues` 는 필드 경로 포함해 그대로 반환.
- **클라이언트**: 단계별 인라인 오류 + 최종 제출 밴드 오류(`submitError`). 실패 시 버튼 재활성화. 성공 시 이동(재활성화 안 함).
- **webhook 미설정(개발)**: 행이 `PROCESSING` 에 머묾 → 결과 페이지가 정적 "분석 중" 표시 (정직한 상태 — 완료시킬 주체가 아직 없음, Phase 2에서 n8n/Mock).
- **Telegram 미설정**: `sendTelegram` no-op + warn. 실패가 응답을 막지 않음.

## 9. 검증 (테스트 러너 없음 — 수동 + 빌드 + 소규모 유닛)

- `npm run build` — 타입 + 린트 통과. `/diagnosis` 의 client 경계(`"use client"`) 확인. `/diagnosis/[id]` 정적.
- `npm run lint` — 0건.
- `0002_diagnoses_idempotency.sql` 을 로컬 Postgres(`0001` 적용 위에)에 실행 — 컬럼 + 부분 유니크 인덱스 생성, `idempotency_key` NULL 행 2개 삽입 성공, 동일 non-NULL 키 2번째 삽입 `23505` 거부 확인.
- `POST /api/diagnoses` 수동(curl 또는 REST 클라이언트):
  - 정상 바디 → `200 { diagnosisId }`, `leads` 1행 + `diagnoses` 1행(`status`가 `PROCESSING` 또는 `FAILED`)
  - `hp_field: "x"` → `200 { ok: true }`, 신규 행 없음
  - `consentAgreed: false` → `400 { error: "validation" }`
  - 같은 `idempotencyKey` 2회 → 같은 `diagnosisId`, `diagnoses` 1행 유지
  - 동일 IP 6회 → 6번째 `429` + `Retry-After`
  - `N8N_WEBHOOK_URL` 을 반드시 실패하는 URL 로 설정 → 행 `status = FAILED`, 콘솔에 Telegram warn
- `lib/validation.ts` 단계 스키마 유닛(`node --experimental-strip-types`): 각 단계 필수 필드 누락 시 `safeParse().success === false`, `idempotencyKey` 없는 전체 바디는 `false`.
- 폼 수동(dev + Playwright):
  - 1→5단계 진행, 각 단계 필수 누락 시 인라인 오류 + 비진행
  - "이전" 으로 값 유지 확인, 새로고침 시 초기화 확인(지속성 없음 — 의도)
  - 제출 성공 → `/diagnosis/[id]` 이동, "분석 중" 화면
  - 모바일(390) / 데스크톱(1280) 뷰포트
  - `console.debug("[track]", ...)` 로 `step*_view/complete`, `step5_submit` 순서 확인

## 10. 영향 받는 파일

**신규**: `supabase/migrations/0002_diagnoses_idempotency.sql`, `lib/telegram.ts`, `lib/analytics.ts`,
`components/diagnosis/{diagnosis-wizard,wizard-progress,step-company,step-tools,step-tasks,step-workload,step-contact}.tsx`,
`components/diagnosis/fields/{text-field,select-field,multi-select,choice-group,consent-checkbox,honeypot}.tsx`,
`components/ui/{checkbox,label}.tsx` (shadcn add)

**수정**: `lib/validation.ts`(idempotencyKey + 단계 스키마), `app/api/diagnoses/route.ts`(501 → 구현),
`app/diagnosis/page.tsx`(스텁 → wizard), `app/diagnosis/[id]/page.tsx`(스텁 → 정적 분석중),
`.env.example`(주석 갱신 — webhook 미설정 시 동작), `task.md`(1.2~1.7 반영), `CLAUDE.md`(결함 #13 해소 표기)

## 11. 결함 대응 매핑

| 결함 | 이 라운드 대응 |
|---|---|
| #1 경쟁 조건 | 5.1 8단계 — `PROCESSING` 을 webhook **전에** 전이 |
| #2 프록시 IP | `getClientIp(req)` 를 rate limit 키로 사용 (이미 `lib/clientIp.ts`) |
| #3 webhook 실패 | 5.1 10단계 — `status=FAILED` + Telegram best-effort |
| #11 leads upsert | `onConflict: "email"` upsert (스키마 `leads_email_unique` 활용) |
| #13 중복 제출 | `0002` 부분 유니크 인덱스 + 클라이언트 `idempotencyKey` + 서버 재조회 |
| #19 rate limit prune | 이미 `lib/rateLimit.ts` 의 `maybePrune` |
| #22 분석 동의 UI | 이 라운드 밖 — `track()` 스텁만. GA4 로드 + 동의 UI 는 Phase 3 |
