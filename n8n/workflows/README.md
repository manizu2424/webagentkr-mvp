# n8n 워크플로우

n8n 서버가 죽어도 워크플로우를 복구할 수 있도록, 완성한 워크플로우를 JSON으로 export해 이 디렉터리에 커밋한다(기술 스펙 §6, §15.2).

## 파일

| 파일 | 내용 | 구현 단계 |
|---|---|---|
| `diagnosis-pipeline.json` | 진단 파이프라인 (Webhook → OpenAI → 검증 → Supabase → Telegram) | Phase 2.6 |
| `error-trigger.json` | Error Trigger 워크플로우 → `TELEGRAM_ERROR_CHAT_ID` | Phase 2.7 |

*아직 생성 전 — Phase 2에서 n8n UI로 만든 뒤 export한다.*

## export 방법

n8n UI에서 워크플로우 열기 → 우상단 `⋯` → **Download** → 받은 JSON을 위 파일명으로 저장 후 커밋.

## `diagnosis-pipeline` 노드 설계 (기술 스펙 §6)

```
[Webhook Trigger]  POST, X-Webhook-Secret 헤더 검증
   ↓
[Code] 입력값 정리/포맷팅 (PII 는 애초에 안 들어옴 — 기술 스펙 §4.1)
   ↓
[HTTP Request] OpenAI, response_format: {type:"json_schema", strict:true} (기술 스펙 §7.3)
   ↓
[Code] 응답 필수 필드 검증 (실패 시 1회 재시도 후 실패 처리 — 기획서 §9.3)
   ↓
[IF] 검증 통과?
   ├─ Yes → [Supabase] diagnosis_results insert
   │         → [Supabase] diagnoses.status = 'COMPLETED'
   │         → [Telegram] "신규 진단 완료: {company}"
   └─ No  → [Supabase] diagnoses.status = 'FAILED'
             → [Telegram] "[진단 실패] {diagnosisId} 확인 필요"
```

## AI 출력 ↔ DB 컬럼 매핑 (필수 — 결함 #9)

n8n Code 노드에서 이름을 명시적으로 변환한다. 세 네이밍이 전부 다르다.

| AI 출력 (§7.3) | → DB 컬럼 (`diagnosis_results`, §3) |
|---|---|
| `automationScore` | `automation_score` |
| `priorityTasks` | `recommended_tasks` (jsonb) |
| `totalEstimatedSavedHours` | `estimated_saved_hours` (jsonb) |
| `recommendedStack` | `recommended_stack` (text[]) |
| `implementationSteps` | `implementation_steps` (text[]) |
| `summary` | `ai_summary` |

- `diagnosis_results.difficulty` 컬럼은 **없다** (decisions.md D4). 난이도는 `recommended_tasks` 안 업무별 `difficulty`(`낮음|중간|높음`)로만 존재한다.
- 서비스 유형 자동 태깅은 이 워크플로우에서 하지 **않는다** — 상담 신청 시점에 Next.js `lib/serviceTagging.ts`가 계산한다 (decisions.md D3).

## Webhook 페이로드 (Next.js → n8n)

PII(이름·전화·이메일)는 포함하지 않는다. 업무 데이터만:

```
diagnosisId, industry, employeeCount, websiteStatus, currentTools[],
repetitiveTasks[], dailyHours, staffCount, monthlyVolume, purpose,
painPoint, budgetRange
```

`staffCount`, `purpose`는 스펙 외 추가 필드(decisions.md D1) — PII가 아니므로 포함해 AI 분석 품질을 높인다.
