# n8n 워크플로우

> Phase 2 현재: 실제 워크플로우는 아직 없다. `POST /api/dev/mock-result/[id]`가
> n8n 대역으로 `diagnosis_results` insert + `diagnoses.status` 전이 + Telegram을
> 수행한다. Phase B에서 아래 매핑대로 n8n Code 노드가 이를 대체한다.

## AI 출력 ↔ DB 컬럼 ↔ API 응답 매핑

| AI 출력 (기술 스펙 §7.3) | `diagnosis_results` 컬럼 | `GET /api/diagnoses/[id]` 의 `result` 필드 | 비고 |
|---|---|---|---|
| `automationScore` (int 0–100) | `automation_score` smallint | `automationScore` | |
| `priorityTasks` (3–5개 배열) | `recommended_tasks` jsonb | `priorityTasks` | 항목별 `difficulty` = `낮음/중간/높음` (D4: 최상위 난이도 컬럼 없음) |
| `totalEstimatedSavedHours` `{min,max}` | `estimated_saved_hours` jsonb | `totalEstimatedSavedHours` | |
| `recommendedStack` (string[]) | `recommended_stack` text[] | `recommendedStack` | 빈 배열이면 결과 카드에서 생략 |
| `implementationSteps` (string[]) | `implementation_steps` text[] | `implementationSteps` | 빈 배열이면 결과 카드에서 생략 |
| `summary` (string) | `ai_summary` text | `summary` | |

- `priorityTasks[].difficulty` 외에 **최상위 `difficulty`는 없다** (`docs/decisions.md` D4).
- DB→API 매핑 구현: `lib/diagnosisResult.ts` `toApiResult()`. Mock 픽스처: `lib/mockDiagnosisResult.ts`.

## Phase B 주의 (n8n 워크플로우 빌드 시)

- **서비스 유형 자동 태깅은 이 워크플로우에서 하지 않는다** — 상담 신청 시점에 Next.js `lib/serviceTagging.ts`가 `diagnosis_results`를 읽어 계산한다 (`docs/decisions.md` D3). 기술 스펙 §6 / 기획서 §11.3만 보고 태깅 노드를 추가하지 말 것 (스펙 결함 #8).
- **Webhook Trigger 페이로드** (Next.js → n8n, PII 없음 — `POST /api/diagnoses`가 이미 제거). 허용 키의 단일 소스는 `lib/validation.ts`의 `N8N_PAYLOAD_KEYS` (11키) + `diagnosisId`:
  ```
  diagnosisId, industry, employeeCount, websiteStatus, currentTools[], repetitiveTasks[],
  dailyHours, staffCount, monthlyVolume, purpose, painPoint, budgetRange
  ```
  (`staffCount` · `purpose`는 D1 추가 필드 — PII가 아니라 업무 데이터라 포함.)
- **응답 검증 노드**: 필수 필드 검증 실패 시 **1회 재시도 후** `status=FAILED` + `[진단 실패]` Telegram (기획서 §9.3, CLAUDE.md "AI 출력 안정성").

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

## 워크플로우 export + 재해복구

n8n 서버가 죽어도 복구할 수 있도록, 완성한 워크플로우를 JSON으로 export해 이 디렉터리에 커밋한다 (기술 스펙 §6, §15.2).

**export 방법**: n8n UI에서 워크플로우 열기 → 우상단 `⋯` → **Download** → 받은 JSON을 `diagnosis-pipeline.json` / `error-trigger.json` 파일명으로 저장 후 커밋.
