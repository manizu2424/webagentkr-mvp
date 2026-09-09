# n8n 워크플로우 셋업 (Phase B)

이 디렉터리의 `diagnosis-pipeline.json` · `error-trigger.json` 을 n8n **2.x** 에 import 해서
Phase 2 의 Mock(`POST /api/dev/mock-result/[id]`) 을 실제 OpenAI 파이프라인으로 대체한다.

> **2026-09-09 로컬 실측:** n8n 2.12.2 + gpt-4o + 실 Supabase 로 전 구간 확인.
> `diagnosis_results` 6컬럼(jsonb·text[] 포함) 정상 insert. `Mark COMPLETED` 표현식 버그 1건
> 수정함(아래). Telegram 은 이 개발 PC 의 IPv6 문제로 미도달 — 배포 환경에서 확인.
>
> **수정 후 재-import 필요:** `diagnosis-pipeline.json` 의 `Insert result`·`Mark COMPLETED`·`Notify success`
> 노드가 이제 `$('Validate response')` 를 참조한다(Insert 뒤 `$json` 이 바뀌어 `diagnosisId` 유실되던 문제).

---

## 0. 대상 인스턴스

로컬에 n8n 2.x 가 이미 있으면 그걸 쓴다(새로 만들 필요 없음). 예:

```
docker ps --filter name=n8n --format "{{.Names}}  {{.Image}}  {{.Ports}}"
# n8n-v2  n8nio/n8n:2.12.2  0.0.0.0:8678->5678/tcp   → http://localhost:8678
```

## 1. 자격증명 4개 생성 (n8n → Credentials → New)

| 종류 | 이름(권장) | 값 |
|---|---|---|
| **Header Auth** | `WEBAGENT webhook secret` | Name = `x-webhook-secret` · Value = 임의 문자열 (`openssl rand -hex 16`) |
| **OpenAI** | `OpenAI` | API Key (결제 활성화된 계정) |
| **Supabase API** | `WEBAGENT Supabase (service_role)` | Host = `https://<ref>.supabase.co` · Service Role Secret = `service_role` 키 |
| **Telegram** | `WEBAGENT Telegram bot` | Access Token = `.env` 의 `TELEGRAM_BOT_TOKEN` |

## 2. 환경변수 2개 (n8n 컨테이너)

Telegram 노드가 `{{ $env.TELEGRAM_ADMIN_CHAT_ID }}` / `{{ $env.TELEGRAM_ERROR_CHAT_ID }}` 를 읽는다.
n8n 컨테이너 env 에 추가(값은 Next.js `.env` 와 동일):

```
TELEGRAM_ADMIN_CHAT_ID=...
TELEGRAM_ERROR_CHAT_ID=...
```

컨테이너 재생성이 번거로우면 import 후 두 Telegram 노드의 `Chat ID` 를 실제 숫자로 직접 바꿔도 된다.

## 3. Import

n8n → Workflows → `⋯` → **Import from File** → `diagnosis-pipeline.json`.
각 노드에서 위 credential 을 다시 선택(이름이 같으면 자동 매칭되기도 함). `error-trigger.json` 도 동일하게 import.

## 4. Error Workflow 지정

n8n → Settings (또는 diagnosis 워크플로우 설정) → **Error Workflow** = `WEBAGENT — error trigger`.

## 5. Activate + Next.js 연결

`diagnosis-pipeline` 워크플로우를 **Active** 로 켠다. Webhook 노드의 **Production URL** 을 복사:

```
http://localhost:8678/webhook/webagent-diagnosis     # 로컬 n8n 포트에 맞게
```

Next.js `.env`:

```
N8N_WEBHOOK_URL=http://localhost:8678/webhook/webagent-diagnosis
N8N_WEBHOOK_SECRET=<1단계 Header Auth 의 Value 와 동일>
```

`npm run dev` 재시작.

## 6. 검증

### 6-a. webhook 직접 테스트 (폼 없이)

먼저 실 DB 에 `SUBMITTED`/`PROCESSING` 상태 진단 행이 하나 필요하다(진단 폼 1회 제출로 생성).
그 `diagnosisId` 로:

```
curl -X POST http://localhost:8678/webhook/webagent-diagnosis \
  -H 'content-type: application/json' \
  -H 'x-webhook-secret: <시크릿>' \
  -d '{
    "diagnosisId": "<실제-진단-uuid>",
    "industry": "유통·도소매",
    "employeeCount": "5-10명",
    "websiteStatus": "있음 (운영 중)",
    "currentTools": ["Excel", "카카오톡"],
    "repetitiveTasks": ["문의", "견적", "재고"],
    "dailyHours": "2~4시간",
    "staffCount": "2~3명",
    "monthlyVolume": "200~500건",
    "purpose": "업무 시간 절감",
    "budgetRange": "300~500만원",
    "painPoint": "견적서를 매번 수기로 작성하고, 문의 응대가 몰릴 때 누락됩니다."
  }'
```

n8n Executions 에서 실행을 열어 노드별 통과를 확인. `diagnoses.status` 가 `COMPLETED` 로 바뀌고
`diagnosis_results` 에 행이 생기면 성공. Telegram `신규 진단 완료: ...` 도착.

### 6-b. 전 구간 (`docs/qa-checklist.md`)

- **A1** 진단 폼 제출 → `/diagnosis/<id>` 가 3분 안에 6카드로 채워짐
- **C1** OpenAI 키를 일부러 틀리게 하거나 검증을 깨서 → `status=FAILED` + 사과 화면 + 상담 CTA + `[진단 실패]` Telegram
- **D1~D3** Telegram 신규 진단 / 신규 상담 / 시스템 에러 3종 도착

## 7. export + 커밋

수정한 워크플로우는 다시 `⋯` → **Download** → 같은 파일명으로 덮어써 커밋한다(재해 복구용).

---

## 흔한 조정

| 증상 | 원인 / 대응 |
|---|---|
| import 시 노드가 "outdated" | 해당 노드 열고 그대로 저장하면 현재 버전으로 마이그레이션됨 |
| `N8N_WEBHOOK_SECRET` 을 `.env` 에 넣었는데 계속 403 | 값에 `#` 가 있으면 dotenv 가 `#` 뒤를 주석으로 자른다. `.env` 에서 값을 큰따옴표로 감쌀 것: `N8N_WEBHOOK_SECRET="..."`. 또는 `openssl rand -hex 16`(특수문자 없음)으로 재발급 |
| Telegram `chat not found` | `TELEGRAM_ADMIN_CHAT_ID` env 미설정 — 2단계 참고, 또는 노드에 숫자 직접 입력 |
| Webhook 이 401/403 | Header Auth credential 의 Name 이 정확히 `x-webhook-secret` 인지, Value 가 Next.js `N8N_WEBHOOK_SECRET` 과 같은지 확인 |
| n8n 이 응답은 하는데 진단이 계속 "처리중" | Webhook `responseMode` 가 `onReceived` 인지 확인. Next.js 는 webhook 이 10초 안에 200 을 주길 기대하고, OpenAI 호출은 그보다 오래 걸림 — 즉시 응답 후 뒤에서 처리해야 함 |
| 재실행 시 `23505` | `diagnosis_results.diagnosis_id` UNIQUE. 이미 결과가 있는 진단은 재처리 불가(정상). 테스트는 새 진단으로 |

## 설계 고정 사항 (바꾸지 말 것)

- **서비스 유형 태깅 노드 없음** — 상담 신청 시 Next.js `lib/serviceTagging.ts` 가 담당 (결정 D3, 결함 #8).
- **최상위 `difficulty` 없음** — `priorityTasks[].difficulty` 만 (`낮음/중간/높음`, 결정 D4).
- **PII 안 받음** — Next.js `POST /api/diagnoses` 가 이름·전화·이메일을 이미 제거하고 보냄. 워크플로우/프롬프트에 PII 를 다시 넣지 말 것 (기획서 §16.1).
- **AI 필드 ↔ DB 컬럼 매핑** — `README.md` 표. `Validate response` 노드가 이 매핑을 수행.
