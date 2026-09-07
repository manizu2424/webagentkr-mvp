# 진단 결과 파이프라인 (Mock 우선) 설계 (Phase 2)

- 날짜: 2026-09-07
- 범위: `task.md` Phase 2의 2.1 ~ 2.5 (`GET /api/diagnoses/[id]`, 결과 페이지 폴링·결과 카드, FAILED UX, Mock 결과 주입 경로, AI↔DB↔API 매핑 문서화) + frontend-design 패스
- 근거: `docs/개발_착수_기술_스펙.md` §4.2 · §6 · §7, `docs/개발자용_통합_MVP_기획서.md` §9.3 · §9.4 · §9.5, `docs/decisions.md` D4, `CLAUDE.md` "알려진 스펙 결함" #9 #12 및 "AI 필드 ↔ DB 컬럼 ↔ API 응답 매핑"
- 선행: Phase 1 완료 (PR #1 → `main` `4cd0176`). `diagnoses`(status 머신, `idempotency_key`), `diagnosis_results`(1:1, jsonb) 스키마·`lib/telegram.ts`·`lib/supabase/server.ts`·`lib/analytics.ts`·`--wak-*` 토큰 준비됨. `app/api/diagnoses/[id]/route.ts`는 501 스텁, `app/diagnosis/[id]/page.tsx`는 정적 "분석 중" 화면.

## 1. 목표와 비목표

### 목표

`/diagnosis/[id]`를 연 사용자가 3초 간격 폴링으로 진단 상태를 관찰하고, 완료 시
구조화된 결과 카드(자동화 준비도·우선 업무·예상 절감 시간·권장 구성·구축 단계·요약)를,
실패 시 사과 문구 + 상담 CTA를 본다. `diagnosis_results`에 결과를 쓰고 상태를
`PROCESSING → COMPLETED | FAILED`로 전이하는 주체는 이번 라운드에서는 **개발 전용
Mock 라우트**(`POST /api/dev/mock-result/[id]`)이며, 이는 Phase B에서 n8n 워크플로우가
그대로 대체할 자리다. 이 라운드가 고정하는 인터페이스(`GET /api/diagnoses/[id]` 응답
계약, DB→API 필드 매핑, 결과 카드 props 형태)는 Phase B(n8n·OpenAI)와 Phase 3(상담)이
의존한다.

### 비목표 (다음 Phase)

- 실제 n8n 워크플로우, OpenAI Structured Output 연동, Error Trigger 워크플로우, 워크플로우 JSON export → **Phase B** (`task.md` 2.6~2.9). n8n 인스턴스 준비 후 별도 라운드.
- `POST /api/consultations`, 상담 폼 페이지, `diagnosisId` 기반 lead 재사용·프리필 → Phase 3. 이 라운드는 FAILED/timeout CTA가 `/consultation?diagnosisId=<id>` 링크만 심는다.
- GA4 스크립트 로드 + 쿠키/분석 동의 UI → Phase 3. 이 라운드는 `track("diagnosis_result_view")`·`track("consultation_cta_click")` 호출부만 삽입.
- AI 프롬프트 튜닝, 필드 단계적 안정화(핵심 4개 우선) → Phase B. Mock JSON은 6필드 완전체를 항상 제공하므로 이 라운드 렌더링에는 무관.
- Phase 1 최종 리뷰 후속(zod 한국어 에러 메시지, 필드 a11y 번들 m1+m7, `route.ts` 주석 nit) → 전부 별건. 이 브랜치는 결과 파이프라인에만 집중.
- 결과 이메일 발송(Resend) → Phase 4.

## 2. 결정 요약

| # | 결정 | 이유 |
|---|---|---|
| D-A | 이번 라운드는 **Mock 파이프라인만** (`task.md` 2.1~2.5). 실제 n8n/OpenAI는 Phase B | 백엔드 서비스 미준비(n8n 미실행, OpenAI 키 없음). n8n 없이 코드로 완결 가능한 범위를 먼저 관통 (기획서 §9.4 Mock 우선) |
| D-B | 상태 전이·결과 기록 주체 = **개발 전용 `POST /api/dev/mock-result/[id]`** | n8n이 나중에 할 일(`service_role` 쓰기 + status 전이 + Telegram)을 1:1로 수행. `POST /api/diagnoses`는 지금처럼 webhook 미설정 시 skip 유지 — 실제 코드 경로에 mock 분기를 섞지 않음. dev 라우트라 배포 환경에서 완전 차단 |
| D-C | 결과 페이지 = **서버 컴포넌트 shell + `<DiagnosisResult>` 클라이언트 아일랜드** | Phase 1 wizard 페이지(`app/diagnosis/page.tsx` + `<DiagnosisWizard>`)와 동일 패턴. 정적 크롬은 RSC, 폴링만 클라이언트 |
| D-D | 폴링 타임아웃 = **3초 간격 × 60회 (3분)** 도달 시 안내 문구 + 상담 CTA, 폴링 중단 | 결과 페이지 문구가 "보통 1~2분". 무기한 폴링은 서버 부하. 재방문 시 폴링 새로 시작하므로 사용자는 갇히지 않음 |
| D-E | 결과 카드는 **6필드 전부 렌더 + 우아한 생략** (`recommendedStack`/`implementationSteps` 빈 배열이면 카드 `null`) | Mock JSON은 6필드 완전체. Phase B에서 실제 AI가 핵심 4개만 반환할 수 있으므로 비핵심 2개는 생략 가능하게 설계. 핵심 4개(점수·우선 업무·절감 시간·요약)는 항상 렌더 |
| D-F | FAILED / timeout UX = **사과 문구 + `/consultation?diagnosisId=<id>` CTA**. 실제 프리필·lead 재사용은 Phase 3 | `GET /api/diagnoses/[id]`는 lead 정보(PII)를 반환하면 안 됨. 상담 폼 자체가 Phase 3. `POST /api/consultations`가 이미 `diagnosisId` 역참조로 중복 lead를 막게 설계돼 있음(결함 #11) |
| D-G | frontend-design 풀 패스 포함 (랜딩·폼 `--wak-*` 토큰 재사용, 라이트 전용) | 결과 화면이 전환 흐름의 클라이맥스. Phase 1 Task 8과 동일 방식 — 카드 골격 먼저, 패스에서 다듬음 |
| D-H | Mock 더미 JSON은 `lib/mockDiagnosisResult.ts` 상수 (한국어 콘텐츠, 실제 결과처럼) | Phase B에서 참조 픽스처. `POST /api/dev/mock-result`와 Playwright가 공유 |
| D-I | DB→API 필드 매핑은 `lib/diagnosisResult.ts`의 순수 함수 하나 | `GET` 라우트와 (필요 시) 테스트가 공유. CLAUDE.md 매핑표가 계약 |

## 3. `GET /api/diagnoses/[id]`

공개, 폴링용. `createServiceClient()`로 조회. **lead 정보 절대 미포함**(기획서 §16.1).

### 3.1 시그니처 (Next 16)

```ts
// app/api/diagnoses/[id]/route.ts
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/diagnoses/[id]">,
) {
  const { id } = await ctx.params;
  // ...
}
```

`RouteContext<'/api/diagnoses/[id]'>`는 `next dev`/`next build`가 생성하는 전역 타입 — import 하지 않는다.

### 3.2 동작

```
1. diagnoses 조회: select("status").eq("id", id).maybeSingle()
   ├─ error         → 500 { error: "internal" } + console.error(code, message)
   └─ data 없음     → 404 { error: "not_found" }
2. status 분기:
   ├─ "SUBMITTED" | "PROCESSING"  → 200 { status: "PROCESSING" }          (결함 #12)
   ├─ "FAILED"                    → 200 { status: "FAILED" }
   └─ "COMPLETED":
        diagnosis_results 조회: select(전체 컬럼).eq("diagnosis_id", id).maybeSingle()
        ├─ error 또는 data 없음   → console.error + 200 { status: "PROCESSING" }
        │                           (정상 흐름 불가. n8n 부분 실패 대비 — 폴링 계속시킴)
        └─ data 있음              → 200 { status: "COMPLETED", result: toApiResult(data) }
```

- `id`가 UUID 형식이 아니면 1번 조회에서 `data 없음`으로 자연 처리 → 404. 별도 정규식 검증 불필요.
- 응답 헤더에 캐시 방지: `Cache-Control: no-store` (폴링 응답이 캐시되면 안 됨).

### 3.3 `lib/diagnosisResult.ts` — DB → API 매핑

```ts
import "server-only";

// diagnosis_results 행 (DB 컬럼명) → GET /api/diagnoses/[id] 의 result (API 필드명).
// 매핑 계약: CLAUDE.md "AI 필드 ↔ DB 컬럼 ↔ API 응답 매핑".
export interface DiagnosisResultRow {
  automation_score: number | null;
  recommended_tasks: unknown;          // [{ name, reason, difficulty, estimatedMonthlySavedHours }]
  estimated_saved_hours: unknown;      // { min, max }
  recommended_stack: string[] | null;
  implementation_steps: string[] | null;
  ai_summary: string | null;
}

export interface DiagnosisApiResult {
  automationScore: number;
  priorityTasks: {
    name: string;
    reason: string;
    difficulty: "낮음" | "중간" | "높음";
    estimatedMonthlySavedHours: number;
  }[];
  totalEstimatedSavedHours: { min: number; max: number };
  recommendedStack: string[];
  implementationSteps: string[];
  summary: string;
}

export function toApiResult(row: DiagnosisResultRow): DiagnosisApiResult;
```

- `recommended_tasks` / `estimated_saved_hours` jsonb는 그대로 통과(구조가 이미 API 형태). 방어적 기본값: `automation_score ?? 0`, `recommended_stack ?? []`, `implementation_steps ?? []`, `ai_summary ?? ""`.
- 이 함수는 Mock JSON이든 (Phase B의) 실제 n8n 기록이든 동일하게 처리 — `diagnosis_results` 스키마가 계약이다.

## 4. `POST /api/dev/mock-result/[id]` — n8n 대역

n8n이 Phase B에서 할 일(webhook 수신 → 검증 → `diagnosis_results` insert → status 전이 → Telegram)을 개발 환경에서 그대로 수행. **프로덕션 완전 차단.**

### 4.1 시그니처·가드

```
POST /api/dev/mock-result/[id]?outcome=completed|failed     (outcome 기본: completed)

가드 (통과 못하면 404):
  - process.env.NODE_ENV === "production"                        → 404 (라우트 자체를 숨김)
  - process.env.MOCK_RESULT_SECRET 설정돼 있으면:
      요청 헤더 x-mock-secret !== 그 값                          → 404
```

### 4.2 동작

```
1. diagnoses 조회 .eq("id", id).maybeSingle()
   ├─ 없음                              → 404 { error: "not_found" }
   └─ status ∉ {SUBMITTED, PROCESSING}  → 409 { error: "already_terminal", status }
2. outcome === "completed":
   a. diagnosis_results insert (DB 컬럼명, lib/mockDiagnosisResult.ts 의 MOCK_RESULT_ROW)
      ├─ 23505 (diagnosis_id UNIQUE 중복) → 409 { error: "result_exists" }
      └─ 그 외 error                       → 500 { error: "db_result" } + console.error(code, message)
   b. diagnoses.update({ status: "COMPLETED" }).eq("id", id)
      └─ error → 500 { error: "db_status" } + console.error(code, message)
   c. sendTelegram(`신규 진단 완료: ${id}`).catch(() => {})
   d. → 200 { ok: true, status: "COMPLETED" }
3. outcome === "failed":
   a. diagnoses.update({ status: "FAILED" }).eq("id", id)   → error 시 500 { error: "db_status" }
   b. sendTelegram(`[진단 실패] ${id} 확인 필요`).catch(() => {})
   c. → 200 { ok: true, status: "FAILED" }
```

- `.eq("status","PROCESSING")` 가드는 생략 — 개발 도구이고, 1번에서 이미 pre-terminal 확인. (Phase B의 실제 n8n은 CLAUDE.md 상태 머신 규칙을 따름.)
- `outcome` 파라미터 값이 `completed`/`failed` 외면 → 400 `{ error: "bad_outcome" }`.
- `.env.example`에 `MOCK_RESULT_SECRET=` 항목 추가(주석: 개발 전용, 미설정 시 로컬에서 가드 없음).

### 4.3 `lib/mockDiagnosisResult.ts`

아래는 **형태 예시**다 — 구현 시 `reason` / `ai_summary` / `implementation_steps`에
실제처럼 읽히는 한국어 문장을 채운다(더미 티가 나지 않게, 2~3문장 수준).

```ts
// Phase B 참조 픽스처. POST /api/dev/mock-result 와 Playwright 가 공유.
// DB 컬럼명 형태 (diagnosis_results 에 그대로 insert). 한국어 콘텐츠, 실제 결과처럼.
export const MOCK_RESULT_ROW = {
  automation_score: 68,
  recommended_tasks: [
    { name: "견적서·거래명세서 발행 자동화", reason: "...", difficulty: "낮음", estimatedMonthlySavedHours: 12 },
    { name: "고객 문의 1차 분류·응대", reason: "...", difficulty: "중간", estimatedMonthlySavedHours: 20 },
    { name: "재고 현황 집계 리포트", reason: "...", difficulty: "낮음", estimatedMonthlySavedHours: 8 },
    { name: "월 마감 정산 데이터 취합", reason: "...", difficulty: "높음", estimatedMonthlySavedHours: 10 },
  ],
  estimated_saved_hours: { min: 40, max: 60 },
  recommended_stack: ["n8n", "Supabase", "OpenAI API", "Telegram"],
  implementation_steps: ["1주차: ...", "2주차: ...", "3주차: ...", "4주차: ..."],
  ai_summary: "...",
} as const;
```

## 5. 결과 페이지

### 5.1 구조

```
app/diagnosis/[id]/page.tsx  (서버 RSC — 현재 정적 화면을 대체)
 ├─ 정적 크롬: Pretendard/IBM Plex Mono 부트스트랩, 워드마크 헤더, "진단 번호 · {id}"
 ├─ await params 로 id 추출
 └─ <DiagnosisResult diagnosisId={id} />

components/diagnosis/result/diagnosis-result.tsx  ("use client")
 상태: "polling" | "completed" | "failed" | "timeout" | "error"
 ├─ useEffect: setInterval(3000) 로 GET /api/diagnoses/[id]
 │   ├─ { status: "PROCESSING" }  → 계속 (attempt++). attempt === 60 → "timeout", clearInterval
 │   ├─ { status: "COMPLETED", result } → setState("completed", result), clearInterval,
 │   │                                     track("diagnosis_result_view")  (최초 1회)
 │   ├─ { status: "FAILED" }      → setState("failed"), clearInterval
 │   ├─ HTTP 404                  → setState("error") (진단 번호 오류), clearInterval
 │   └─ fetch/HTTP 5xx 오류       → 연속 실패 카운트++. 5회 연속 → "error". 그 전엔 조용히 재시도
 ├─ 첫 요청은 즉시(마운트 시 1회) 후 인터벌 시작 — 이미 COMPLETED면 스피너 안 보임
 ├─ 언마운트 시 clearInterval
 └─ 렌더:
     polling   → <ProcessingView />        (스피너 + "AI가 분석하고 있습니다")
     completed → <ResultCards result={} />
     failed    → <FailedNotice diagnosisId={} variant="failed" />
     timeout   → <FailedNotice diagnosisId={} variant="timeout" />
     error     → <ErrorView onRetry={폴링 재시작} />
```

- 폴링 간격 상수(`POLL_INTERVAL_MS = 3000`, `POLL_MAX_ATTEMPTS = 60`)는 파일 상단. Playwright 타임아웃 테스트를 위해 `?_pollMs=` 쿼리로 간격만 축소 가능하게 할지는 플랜에서 결정(선택적, dev 편의).
- `visibilitychange`로 백그라운드 탭에서 폴링 일시정지: 넣으면 서버 부하 절감, 안 넣어도 3분 상한이 있어 무해 — 플랜에서 결정.
- 재방문(페이지 재로드): `useEffect`가 다시 도므로 폴링 새로 시작. COMPLETED면 첫 요청에 카드.

### 5.2 이벤트 (`lib/analytics.ts` `track()`)

- `diagnosis_result_view` — COMPLETED 결과 카드 최초 렌더 시 1회
- `consultation_cta_click` — FailedNotice / timeout 의 상담 CTA 클릭 시

## 6. 결과 카드 컴포넌트

```
components/diagnosis/result/
 ├─ diagnosis-result.tsx      폴링 아일랜드 (§5.1)
 ├─ processing-view.tsx       스피너 + 안내 문구
 ├─ error-view.tsx            "결과를 불러오지 못했습니다" + 재시도 버튼
 ├─ result-cards.tsx          6개 카드 레이아웃 컨테이너. 상단에 "AI 추정치" 고지 1회
 ├─ score-card.tsx            automationScore 0~100 — 숫자 + 게이지, "추정" 배지
 ├─ priority-tasks-card.tsx   priorityTasks[] — 업무명·이유·난이도 배지(낮음/중간/높음)·월 절감시간
 ├─ saved-hours-card.tsx      totalEstimatedSavedHours {min,max} — "월 N~M시간 (추정)"
 ├─ stack-card.tsx            recommendedStack[] — 칩 목록. 빈 배열 → return null
 ├─ steps-card.tsx            implementationSteps[] — 번호 목록. 빈 배열 → return null
 ├─ summary-card.tsx          summary — 종합 요약 문단
 └─ failed-notice.tsx         variant "failed" | "timeout" — 문구 + /consultation?diagnosisId=<id> CTA
```

- **순수 프레젠테이션**: props만, fetch 없음 → 독립 테스트 가능.
- **우아한 생략**: `stack-card` / `steps-card`만 빈 배열 시 `null`. 핵심 4개는 항상 렌더.
- **"추정치" 명시** (기획서 §0 절대 원칙 4): `result-cards.tsx` 상단 고지 + `score-card`/`saved-hours-card` 각각에 배지.
- **난이도 enum**: 업무별 `difficulty` = `낮음 | 중간 | 높음` (D4 — 최상위 난이도 없음).
- **디자인 (D-G)**: 라이트 전용, `--wak-*` 토큰, Pretendard + IBM Plex Mono. 랜딩 히어로 파이프라인 / 폼 `wizard-progress`와 시각 언어 통일. frontend-design 스킬로 별도 패스 — 카드 골격을 먼저 기능 완성하고, 패스에서 시각 정리(인터페이스·동작 불변).

## 7. `n8n/workflows/README.md` (신규) — AI ↔ DB ↔ API 매핑

CLAUDE.md의 매핑표를 워크플로우 관점으로 옮기고, `POST /api/dev/mock-result`가 그 참조
구현임을 명시한다. Phase B에서 n8n Code 노드가 이 표대로 매핑한다.

| AI 출력 (§7.3) | `diagnosis_results` 컬럼 | `GET` 응답 `result` 필드 | 비고 |
|---|---|---|---|
| `automationScore` (int 0–100) | `automation_score` smallint | `automationScore` | |
| `priorityTasks` (3–5개 배열) | `recommended_tasks` jsonb | `priorityTasks` | 항목별 `difficulty` = `낮음\|중간\|높음` |
| `totalEstimatedSavedHours` `{min,max}` | `estimated_saved_hours` jsonb | `totalEstimatedSavedHours` | |
| `recommendedStack` (string[]) | `recommended_stack` text[] | `recommendedStack` | |
| `implementationSteps` (string[]) | `implementation_steps` text[] | `implementationSteps` | |
| `summary` (string) | `ai_summary` text | `summary` | |

- `diagnosis_results`에는 **최상위 `difficulty` 컬럼이 없다** (D4).
- n8n Code 노드 검증: 6필드 존재 + `priorityTasks` 3~5개 + 각 항목 4키. 실패 시 `status=FAILED` + `[진단 실패]` Telegram (Phase B).

## 8. 에러 처리 요약

| 계층 | 경우 | 처리 |
|---|---|---|
| `GET` | `diagnoses` 행 없음 / id 형식 오류 | 404 `{ error: "not_found" }` |
| `GET` | `status=COMPLETED`인데 `diagnosis_results` 없음/조회 오류 | `console.error` + 200 `{ status: "PROCESSING" }` (폴링 지속) |
| `GET` | DB 조회 오류 | 500 `{ error: "internal" }` + `console.error(code, message)` |
| 클라 폴링 | HTTP 404 | `"error"` 상태 (진단 번호 오류 문구), 폴링 중단 |
| 클라 폴링 | fetch/5xx 연속 5회 | `"error"` 상태 (재시도 버튼) |
| 클라 폴링 | 60회(3분) 초과 | `"timeout"` 상태, 폴링 중단 |
| `mock-result` | 프로덕션 / 시크릿 불일치 | 404 |
| `mock-result` | `diagnoses` 없음 | 404 `{ error: "not_found" }` |
| `mock-result` | 이미 종결 상태 | 409 `{ error: "already_terminal" }` |
| `mock-result` | `diagnosis_results` 중복 | 409 `{ error: "result_exists" }` |
| `mock-result` | `outcome` 값 오류 | 400 `{ error: "bad_outcome" }` |

로그는 항상 `error.code` + `error.message`만 (PostgREST 원본 객체 금지 — Phase 1 m3 규약).

## 9. 파일 변경 요약

**신규**
| 경로 | 책임 |
|---|---|
| `app/api/dev/mock-result/[id]/route.ts` | n8n 대역 — `diagnosis_results` insert + status 전이 + Telegram |
| `lib/diagnosisResult.ts` | `toApiResult(row)` — DB 컬럼 → API 필드 매핑 (`server-only`) |
| `lib/mockDiagnosisResult.ts` | `MOCK_RESULT_ROW` 상수 (Phase B 참조 픽스처) |
| `components/diagnosis/result/diagnosis-result.tsx` | 폴링 클라이언트 아일랜드 |
| `components/diagnosis/result/processing-view.tsx` | 스피너 + 안내 |
| `components/diagnosis/result/error-view.tsx` | 오류 + 재시도 |
| `components/diagnosis/result/result-cards.tsx` | 6카드 컨테이너 + 추정치 고지 |
| `components/diagnosis/result/score-card.tsx` | 준비도 |
| `components/diagnosis/result/priority-tasks-card.tsx` | 우선 업무 |
| `components/diagnosis/result/saved-hours-card.tsx` | 절감 시간 |
| `components/diagnosis/result/stack-card.tsx` | 권장 구성 (빈 배열 → null) |
| `components/diagnosis/result/steps-card.tsx` | 구축 단계 (빈 배열 → null) |
| `components/diagnosis/result/summary-card.tsx` | 종합 요약 |
| `components/diagnosis/result/failed-notice.tsx` | FAILED/timeout 공용 + 상담 CTA |
| `n8n/workflows/README.md` | AI↔DB↔API 매핑표 |

**수정**
| 경로 | 변경 |
|---|---|
| `app/api/diagnoses/[id]/route.ts` | 501 스텁 → §3 구현 |
| `app/diagnosis/[id]/page.tsx` | 정적 "분석 중" → 서버 shell + `<DiagnosisResult>` 아일랜드 |
| `.env.example` | `MOCK_RESULT_SECRET=` 추가 (개발 전용 주석) |
| `task.md` | Phase 2 2.1~2.5 체크, 이탈·메모 |

## 10. 테스트 (러너 없음 — Phase 0 패턴)

- **순수 로직 → throwaway `_wak_*.mts`** (`node --experimental-strip-types`, 통과 후 삭제):
  - `lib/diagnosisResult.ts` `toApiResult` — 완전 행 / null 필드 / 빈 배열 → 기본값 매핑
- **라우트 → `npm run build` + `npm run lint` + curl**:
  - `GET`: 없는 id(404), SUBMITTED/PROCESSING(→PROCESSING), FAILED, COMPLETED+results(카드 데이터), COMPLETED+results 없음(→PROCESSING)
  - `POST /api/dev/mock-result`: completed(200, DB 확인), failed(200), 재호출(409), 없는 id(404), `NODE_ENV=production` 빌드에서 404, `outcome` 오류(400)
- **결과 페이지 → Playwright** (실제 MCP 도구):
  - 폼 제출 → PROCESSING 스피너 → `curl POST mock-result` → 다음 폴링에 6카드
  - `?outcome=failed` → FailedNotice("failed") + 상담 CTA(`?diagnosisId=` 확인)
  - timeout: 폴링 간격/최대치 축소 훅으로 "timeout" 뷰 유도
  - `stack`/`steps` 빈 배열 픽스처 → 해당 카드 미렌더 확인
  - `track()` 콘솔 이벤트: `diagnosis_result_view`, `consultation_cta_click`
  - 390×844 + 1280×800 스크린샷
- **DB 통합**: Supabase 연결 시. 이 환경에서는 curl 스텁 + 빌드/린트로 대체.

## 11. 열린 결정 (플랜에서 확정)

- 폴링 간격 축소용 `?_pollMs=` dev 쿼리 — 넣을지 (Playwright timeout 테스트 편의 vs 표면적 증가)
- `visibilitychange` 백그라운드 폴링 일시정지 — 넣을지 (서버 부하 vs 코드량; 3분 상한이 이미 안전망)
- frontend-design 패스를 별도 태스크로 분리할지 (Phase 1 Task 8처럼) vs 카드 태스크에 포함
