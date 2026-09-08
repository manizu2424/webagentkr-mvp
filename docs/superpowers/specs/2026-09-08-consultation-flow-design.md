# 상담 흐름 설계 (Phase 3 · 묶음 A)

- 날짜: 2026-09-08
- 범위: `task.md` Phase 3 묶음 A (A1~A6) — `lib/serviceTagging.ts`, `POST /api/consultations`, 서버 재검증, 상담 폼 페이지, 결과 페이지 CTA 배선, 검증
- 근거: `docs/개발_착수_기술_스펙.md` §4.3 · §4.4 · §5, `docs/개발자용_통합_MVP_기획서.md` §7 · §9.5 · §11 · §11.3, `docs/decisions.md` D2(값)·D2-c(consultation_type 유지)·D3(태깅 위치), `CLAUDE.md` "알려진 스펙 결함" #8 · #11
- 선행: Phase 1 완료 (PR #1 → `main` `4cd0176`), Phase 2 완료 (PR #2 → `main` `2d02c45`). `consultations`·`leads` 스키마, RLS 정책(`admin_*`), `lib/telegram.ts`·`lib/supabase/server.ts`·`lib/rateLimit.ts`·`lib/clientIp.ts`·`lib/analytics.ts`·`lib/options.ts`(`SERVICE_TYPES`)·`--wak-*` 토큰·진단 폼 필드 프리미티브 준비됨. `lib/validation.ts`에 `consultationSubmissionSchema` 존재. `app/api/consultations/route.ts`는 501 스텁, `app/consultation/page.tsx`는 스텁, `lib/serviceTagging.ts`·`app/terms/page.tsx`는 없음.

## 1. 목표와 비목표

### 목표

방문자가 `/consultation`에서 상담을 신청하면 `consultations` 행(`status=NEW`)이 생기고
Telegram 관리자 채널에 신규 상담 알림(회사명 + 상담 방식·시기 + 추정 서비스 유형)이 간다.
두 진입 경로를 지원한다:

1. **진단 결과/실패 페이지 CTA** → `/consultation?diagnosisId=<uuid>` — 그 진단의 lead를
   재사용(연락처 재입력 없음). AI 결과가 있으면 `suggested_service_type`을 도출한다.
2. **랜딩/네비 직접 진입** → `/consultation` — 회사명·업종·직원수·이름·이메일·전화를 새로
   입력받아 `leads`를 email 기준 upsert. 진단 근거가 없으므로 `suggested_service_type`은 `null`.

이 라운드가 고정하는 인터페이스(`POST /api/consultations` 요청/응답 계약,
`consultations` 행 형태, `computeServiceType` 시그니처)는 묶음 B(관리자 화면)가 의존한다.

### 비목표 (다음 묶음/Phase)

- 관리자 화면에서 상담 목록·상세·상태 변경·메모 → **묶음 B**. 이 라운드는 `consultations` 행을 만들기만 한다.
- 개인정보처리방침·이용약관 페이지 본문 → **묶음 C**. 이 라운드의 상담 폼 동의 문구는 `/privacy`·`/terms`로 링크만 걸고(두 라우트는 이미 스텁으로 존재), 본문은 C에서 채운다.
- GA4 `gtag.js` 로드 + 쿠키/분석 동의 UI → **묶음 D**. 이 라운드는 `track("consultation_cta_click")`·`track("consultation_submit")` 호출부만 삽입(`lib/analytics.ts`의 `track()`은 gtag 없으면 no-op).
- 상담 신청 확인 이메일 발송(Resend) → Phase 4.
- `consultations`에 자유 문의 텍스트 컬럼 추가 → 채택 안 함(범위 밖). 스키마·마이그레이션 변경 없음.
- 상담 폼에서 진단으로 유도하는 UX, `/consultation` 직접 진입용 랜딩 링크 배치 → 링크 자체는 이 라운드에서 안 만든다(코드 경로만 지원). 랜딩 CTA 배치는 Phase 4에서.

## 2. 결정 요약

| # | 결정 | 이유 |
|---|---|---|
| A-a | `/consultation` 두 경로 지원 (`diagnosisId` 옵셔널). 직접 진입 시 연락처 전체 재입력 | 스펙 §4.3 원문이 `diagnosisId?` 옵셔널 + "재입력"을 명시. 사용자 확정(2026-09-08): 랜딩/네비 직접 진입 허용 |
| A-b | 진단 경로에서 연락처는 **화면에 안 보임** — "이전에 입력하신 연락처로 접수됩니다" 안내만. 서버가 `diagnosisId → diagnoses.lead_id`로 해결 | `GET`/`POST` 어느 쪽도 lead PII(이름·전화·이메일)를 클라이언트로 내보내지 않는 기존 경계 유지(기획서 §16.1). 프리필하려면 PII 반환 엔드포인트가 필요해짐 |
| A-c | 자유 문의 텍스트 필드 **없음**. `consultationType`은 두 경로 모두 폼에서 다시 받음 | 사용자 확정(2026-09-08). 스키마 변경 회피. `leads.consulting_method`(진단 시점 희망)와 `consultations.consultation_type`(상담 확정 방식)은 D2-c대로 별개 컬럼 유지 |
| A-d | 직접입력 경로에 **업종·직원수 필수** 추가 (`consultationSubmissionSchema.superRefine`) | `leads.industry`·`leads.employee_count`가 `NOT NULL`. 현재 스키마는 company/name/email/phone만 필수라 직접입력 시 lead insert가 깨짐. 단일 select 2개, 영업에도 유용. 사용자 확정(2026-09-08) |
| A-e | `suggested_service_type` = **`null`** (AI 결과행이 없을 때: 직접 진입 또는 FAILED 진단) | 태그는 §11.3에서 "AI 결과 기반 상담 전 가설". 근거가 없으면 가설도 없음. 컬럼은 이미 nullable. 사용자 확정(2026-09-08) |
| A-f | `computeServiceType` 우선순위 = **"방향성 파악"(purpose/budget)을 먼저 단락** → Smart Website → AI Agent → n8n Automation → AI Automation(기본) | 스펙 §11.3은 n8n→Website→Agent→Consulting 순 나열이나, "방향성 파악"은 업무 항목이 아니라 고객 의도 신호라 먼저 판정하는 게 맞음. 사용자 확정(2026-09-08) — 스펙 원문 순서에서 의도적 재배치 |
| A-g | rate limit은 `"consult:" + ip` **별도 버킷** (IP당 시간당 5건) | 진단 제출 버스트가 정상 상담 신청을 막지 않도록. `lib/rateLimit.ts`는 문자열 키를 그대로 받으므로 접두사만 붙이면 됨. 사용자 확정(2026-09-08) |
| A-h | 상담 폼 = **단일 화면** (진단은 5단계 wizard지만 상담은 필드 ≤10개) | wizard 불필요. 진단 폼 필드 프리미티브·`--wak-*` 시각 언어 재사용. 서버 shell + 클라이언트 폼 아일랜드(Phase 1·2 패턴) |
| A-i | Telegram 알림 주체 = **`POST /api/consultations` (Next.js)** | 진단 완료 알림은 n8n 담당이지만, 상담은 n8n 경로를 안 탐. `sendTelegram(text, TELEGRAM_ADMIN_CHAT_ID)` 직접 호출. 회사명은 실어도 됨(CLAUDE.md §16.1 기존 정책), 이름·전화·이메일은 제외 |
| A-j | 중복 제출 방지 = **클라이언트 버튼 비활성화만** (진단 폼 패턴). 서버 멱등성 키 없음 | 상담은 진단과 달리 재신청이 정상 유스케이스(다른 시기·방식). `leads` upsert는 email 기준이라 lead 중복은 안 생기고, `consultations`는 여러 건 정상 |

## 3. `lib/serviceTagging.ts` (A1)

순수 함수, 시크릿 없음, `import` 없음(단, `ServiceType` 타입은 `@/lib/options`에서 — 값 아님).
`lib/diagnosisResult.ts`와 같은 이유로 `server-only` 미부착(러너 없는 유닛 테스트 대상).

### 3.1 시그니처

```ts
import type { ServiceType } from "@/lib/options";

export interface TaggingDiagnosis {
  purpose: string | null;        // diagnoses.purpose
  budgetRange: string | null;    // diagnoses.budget_range
  websiteStatus: string | null;  // diagnoses.website_status
}
export interface TaggingResult {
  recommendedStack: string[];                        // diagnosis_results.recommended_stack
  priorityTasks: { name: string; reason: string }[]; // diagnosis_results.recommended_tasks (부분)
}

export function computeServiceType(
  d: TaggingDiagnosis,
  r: TaggingResult | null,
): ServiceType | null;
```

### 3.2 규칙 (§11.3 · 우선순위는 A-f)

`r === null` → `null` 즉시 반환.

**매칭 대상 텍스트** `haystack` = `[...r.recommendedStack, ...r.priorityTasks.flatMap(t => [t.name, t.reason])].join(" ").toLowerCase()`.

그 외 순서대로 첫 매치:

1. `d.purpose === "방향성 파악 (무엇부터 할지 모름)"` **또는** `d.budgetRange === "미정 (방향성부터 파악)"` → `"AI Consulting"`
2. `d.websiteStatus === "없음"` **또는** `haystack`에 `WEBSITE_KEYWORDS` 매치 → `"Smart Website"`
3. `haystack`에 `AGENT_KEYWORDS` 매치 → `"AI Agent"`
4. `r.recommendedStack`(소문자)에 `"n8n"` 포함 **그리고** LLM 요소 없음(`haystack`에 `openai`/`gpt`/`llm`/` ai ` 미포함) → `"n8n Automation"` — 순수 워크플로 자동화(§11.3 "홈페이지 무관 업무 위주")
5. 그 외 → `"AI Automation"` (기본값 — AI가 개입하는 일반 반복 업무 자동화)

```ts
const WEBSITE_KEYWORDS = ["website", "웹사이트", "홈페이지", "랜딩", "smart website"];
const AGENT_KEYWORDS = ["문서 검색", "사내 문서", "상담 ai", "챗봇", "rag", "지식베이스", "ai agent"];
const LLM_MARKERS = ["openai", "gpt", "llm", " ai "];
```

- 매칭은 `.toLowerCase()` 후 `includes`. 키워드 목록은 파일 상단 상수, 짧게 유지.
- **참고 (스펙 §11.3 모호성):** §11.3은 "n8n Automation"과 "AI Automation(기본값)"의 구분을 "홈페이지 무관 업무 위주" 정도로만 서술한다. Mock 픽스처의 `recommended_stack`은 항상 `n8n`을 포함하므로, 단순 "n8n 포함 → n8n Automation"이면 기본값이 사실상 죽는다. 이 설계는 **LLM 요소(OpenAI 등)가 스택/업무 설명에 없을 때만 n8n Automation**으로 판정해 실질적 구분을 만든다. 규칙 4의 이 조건은 스펙 원문에 없는 해석 — 사용자 리뷰에서 확정.
- 파일 상단 주석: "상담 시작 전 **가설**이며 확정이 아니다(§11.3). 상담 중 검증한다."
- `d.purpose`/`d.budgetRange` 문자열은 `lib/options.ts`의 `purpose`·`budgetRange` 라벨과 정확히 일치해야 함(D2 — 라벨이 곧 저장값). 하드코딩하지 말고 옵션 상수를 참조하는 게 이상적이나, enum 개별 원소 참조가 번잡하면 리터럴 + "`options.ts`와 동기" 주석으로 갈음.

## 4. `POST /api/consultations` (A2 · A3)

공개, 스팸 방어. `createServiceClient()`로 기록. lead PII를 응답·로그에 내보내지 않음.

### 4.1 시그니처 (Next 16)

```ts
// app/api/consultations/route.ts
import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) { /* ... */ }
```

### 4.2 요청 바디 (`consultationSubmissionSchema`)

```
{
  diagnosisId?: uuid,
  // diagnosisId 없을 때 필수: companyName, contactName, email, phone, industry, employeeCount
  companyName?, contactName?, email?, phone?, industry?, employeeCount?,
  preferredDate: <options.preferredDate>,
  consultationType: <options.consultingMethod>,
  consentAgreed: true,              // 스키마에 추가 (현재 없음)
  hp_field: ""                      // 허니팟
}
```

`consultationSubmissionSchema` 변경(A3):
- `superRefine`의 필수 목록에 `industry`, `employeeCount` 추가(A-d).
- `consentAgreed: z.literal(true, { error: "개인정보 수집·이용에 동의해야 신청할 수 있습니다" })` 추가.
- 한글 `error:` 메시지 보강: `preferredDate`·`consultationType`·`diagnosisId`(형식) 등 커스텀 메시지 없는 필드.

### 4.3 처리 순서

```
1. body = await req.json()  (파싱 실패 → 400 {error:"bad_json"})
2. 허니팟: body.hp_field 가 비어있지 않음 → 200 {ok:true}  (무저장, 봇으로 간주)
3. consentAgreed !== true → 400 {error:"consent_required"}
4. ip = clientIp(req);  checkRateLimit("consult:"+ip, 5, 3_600_000) === false → 429 {error:"rate_limited"}
5. parsed = consultationSubmissionSchema.safeParse(body);  실패 → 400 {error:"invalid", issues}
6. 분기:
   6a. parsed.diagnosisId 있음:
       - diagnoses select (id, lead_id, purpose, budget_range, website_status) where id = diagnosisId
         · error → 500 {error:"internal"}   · 행 없음 → 404 {error:"diagnosis_not_found"}
       - diagnosis_results select (recommended_stack, recommended_tasks) where diagnosis_id = diagnosisId
         · 행 없음 허용(FAILED/미완 진단) → result = null
       - leadId = diagnoses.lead_id
       - suggested = computeServiceType(
           { purpose, budgetRange: budget_range, websiteStatus: website_status },
           result ? { recommendedStack: recommended_stack ?? [],
                      priorityTasks: Array.isArray(recommended_tasks) ? recommended_tasks : [] } : null)
   6b. parsed.diagnosisId 없음:
       - leads upsert onConflict "email" {
           company_name, industry, employee_count, contact_name, email, phone,
           consulting_method: consultationType        // 미러
         }  → leadId = 반환된 id
         · error → 500 {error:"internal"}
       - suggested = null
7. consultations insert {
     lead_id: leadId, diagnosis_id: parsed.diagnosisId ?? null,
     suggested_service_type: suggested,
     preferred_date: parsed.preferredDate,
     consultation_type: parsed.consultationType,
     status: "NEW"
   }  → error → 500 {error:"internal"}
8. await sendTelegram(
     `[신규 상담] ${companyName}\n방식: ${consultationType} / 시기: ${preferredDate}\n` +
     `추정 서비스 유형: ${suggested ?? "미정 (진단 없음/미완)"}` +
     (parsed.diagnosisId ? `\n진단: ${parsed.diagnosisId}` : ""),
     process.env.TELEGRAM_ADMIN_CHAT_ID
   ).catch(() => {})
9. 200 { consultationId }
```

- `companyName`은 6a 경로에선 조회 안 함(PII 회피). Telegram 문구용 회사명이 필요하면 6a에서 `leads.company_name`만 별도 select — **회사명은 PII 경계상 Telegram에 이미 허용**(CLAUDE.md §16.1)이므로 `leads.company_name` 단일 컬럼 select는 허용. 이름·전화·이메일은 select하지 않는다.
- 로그: PostgREST 원본 객체 대신 `error.code` / `error.message`만 (Phase 1·2 패턴).
- `leads` upsert의 "마지막 연락처가 이긴다" 한계(결함 #11 / Phase 1 I3)는 이 경로에도 동일하게 적용 — 이미 `docs/decisions.md`에 기록됨. 변경 없음.

### 4.4 응답 요약

| 상황 | 코드 | 바디 |
|---|---|---|
| 성공 | 200 | `{ consultationId }` |
| 허니팟 | 200 | `{ ok: true }` |
| JSON 파싱 실패 | 400 | `{ error: "bad_json" }` |
| 동의 없음 | 400 | `{ error: "consent_required" }` |
| zod 실패 | 400 | `{ error: "invalid", issues }` |
| rate limit | 429 | `{ error: "rate_limited" }` |
| `diagnosisId` 있으나 진단 없음 | 404 | `{ error: "diagnosis_not_found" }` |
| DB 오류 / 클라이언트 생성 실패 | 500 | `{ error: "internal" }` |

## 5. 상담 폼 (A4 · A5)

### 5.1 페이지 (`app/consultation/page.tsx`)

- 서버 컴포넌트 shell(Phase 2 `app/diagnosis/[id]/page.tsx`와 동일 크롬: 헤더 로고, Pretendard+Plex Mono, 라이트 전용). `searchParams`에서 `diagnosisId`를 읽어(Next 16 — Promise) `<ConsultationForm diagnosisId={...} />`에 전달.
- `diagnosisId` 유효성은 서버에서 검사하지 않음(폼 제출 시 API가 404 처리). 잘못된 값이면 제출 후 오류 노출.

### 5.2 폼 아일랜드 (`components/consultation/consultation-form.tsx`, `"use client"`)

- 진단 폼의 필드 프리미티브 재사용(`components/diagnosis/` 아래 text/select/consent/honeypot). 없으면 최소 사양으로 `components/consultation/`에 신규 — 단, 진단 폼과 시각·a11y 동일.
- **`diagnosisId` 있음**: 상단 안내 배너("이전에 입력하신 연락처로 접수됩니다") + `preferredDate`(select) + `consultationType`(select) + 개인정보 동의(체크박스 + `/privacy`·`/terms` 링크) + 허니팟.
- **`diagnosisId` 없음**: 회사명(text) + 업종(select) + 직원수(select) + 이름(text) + 이메일(text) + 전화(text) + `preferredDate` + `consultationType` + 동의 + 허니팟.
- 클라이언트 검증 = `consultationSubmissionSchema` 재사용(진단 폼이 `lib/validation.ts` 공유하는 방식과 동일).
- 제출: `POST /api/consultations` → 성공 시 `track("consultation_submit")` 후 성공 화면으로 전환. 실패 시 진단 폼 제출 오류 블록과 같은 시각 언어(좌측 `--wak-danger` 규칙 + 옅은 틴트)로 메시지.
- 제출 버튼은 in-flight 동안 비활성화(중복 방지).
- 성공 화면: "상담 신청이 접수되었습니다" + 다음 안내(영업일 기준 연락 등 — 문구는 `{/* TODO 확정 */}`) + 홈으로 링크.

### 5.3 결과 페이지 CTA 배선 (A5)

- `components/diagnosis/result/result-cards.tsx` 하단에 상담 CTA 추가: `<Link href={\`/consultation?diagnosisId=${diagnosisId}\`>` (진단 wizard/랜딩의 primary CTA와 동일 형태), `onClick`에서 `track("consultation_cta_click")`.
  - `ResultCards`는 현재 `diagnosisId` prop이 없음 → `result-view.tsx`에서 넘기도록 시그니처 확장(`completed` 케이스). `ResultView`는 이미 `diagnosisId`를 받음.
- `FailedNotice`는 Phase 2에서 이미 `/consultation?diagnosisId=<id>` CTA + `track` 연결됨 — 변경 없음(확인만).

## 6. 에러 처리 요약

| 경계 | 처리 |
|---|---|
| `createServiceClient()` throw (env 미설정) | try/catch → 500 `{error:"internal"}` (Phase 2 GET/mock 라우트 패턴) |
| `diagnoses` 조회 실패 vs 행 없음 | 실패 → 500, 행 없음 → 404 `diagnosis_not_found` |
| `diagnosis_results` 행 없음 | 정상(FAILED/미완) — `result=null`, 태깅은 `null` |
| `leads` upsert 충돌 외 오류 | 500 `internal` |
| `consultations` insert 오류 | 500 `internal` (이 시점엔 lead가 이미 있을 수 있음 — 고아 lead 허용, 재신청 시 email upsert로 재사용) |
| `sendTelegram` 실패 | `.catch(()=>{})` — 응답을 막지 않음. 미설정 시 `lib/telegram.ts`가 warn 후 no-op |
| 잘못된 `diagnosisId` 형식 | zod `z.uuid()` → 400 `invalid` |

## 7. 검증 (A6)

테스트 러너 없음(기획서 §17.2 수동 체크리스트). Phase 1·2 방식 그대로:

- `npm run build` / `npx eslint .` / `npx tsc --noEmit` exit 0
- `lib/serviceTagging.ts` 단위: `node --experimental-strip-types` 일회성 `_wak_tagging.mts` — 5개 분기 각각 + `null`(결과 없음) + 우선순위(방향성 파악이 n8n stack보다 우선) 어서션. 실행 후 삭제.
- `curl` (Supabase 없이 도달 가능한 경로): 허니팟 → 200 무저장 / `consentAgreed` 누락 → 400 / rate limit 6번째 → 429 / zod 실패(필수 누락) → 400. `diagnosisId` 유무 2경로는 형태만(500이 아닌 400/404 확인).
- 상담 폼 Playwright: 두 경로 렌더, 필수값 검증, 허니팟 숨김, 제출 버튼 비활성화, 성공/실패 화면 전환. 축소 훅 불필요.
- **DB 통합**(제출 → `consultations` 행 + Telegram)은 Supabase 연결 시 — 이 환경에선 에러 경로 + 프리뷰로 대체(각 태스크 리포트에 기록). 묶음 B 진행 전 1회 관통 권장.

## 8. 미해결 / 후속

- 성공 화면 안내 문구, 개인정보 동의 체크박스 문구(→ `/privacy`·`/terms` 링크)는 `{/* TODO */}`로 두고 묶음 C에서 확정.
- `consultationSubmissionSchema`가 이미 갖고 있는 `leadId` 필드는 스펙 §4.3에 언급되나 클라이언트가 `leadId`를 알 방법이 없음(결함 #11) — 이 설계는 `leadId`를 안 쓴다(진단 경로는 `diagnosisId` 역참조, 직접 경로는 email upsert). 스키마에서 제거 가능하면 A3에서 정리.
- 관리자 화면(묶음 B)이 `suggested_service_type`을 "가설" 배지로 표시 + 상담 상태 전이 UI 제공 — 이 라운드 범위 밖.
