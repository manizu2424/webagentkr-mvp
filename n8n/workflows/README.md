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
