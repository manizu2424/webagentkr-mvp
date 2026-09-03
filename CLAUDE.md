# CLAUDE.md

이 파일은 이 리포지토리에서 작업하는 Claude Code(claude.ai/code)에 대한 가이드를 제공한다.

## 현재 상태

Phase 0(1주차 기반 구성) 완료. 다음은 Phase 1(랜딩 + 진단 폼). 라우트·`lib/`·마이그레이션·Docker 골격은 있으나 페이지/API는 전부 스텁이다.

**설치된 버전** (`create-next-app@latest` 결과): Next.js **16.3.4** (Turbopack) · React 19.2.8 · Tailwind **v4**(CSS 기반 설정, `tailwind.config` 없음) · zod **4.5** · shadcn 스타일 `base-nova`. 스펙/초기 계획의 "Next 15" 가정과 다르다. Next 16 유의점: `params`/`searchParams`는 Promise, `PageProps<'/route'>`·`LayoutProps<'/'>`·`RouteContext<'/route'>`는 `next build`/`next dev`가 생성하는 전역 타입, `next lint` 제거(→ `eslint` 직접). 상세는 `node_modules/next/dist/docs/` 및 `AGENTS.md`(이 파일 끝에서 `@AGENTS.md`로 임포트).

코드가 채워지기 전까지는 아래 문서들이 최종 스펙이다:

- `개발자용_통합_MVP_기획서.md` — 제품·기능·사업 스펙("무엇을 왜 만드는가"). 0~19장.
- `개발_착수_기술_스펙.md` — 기술 구현 스펙("무엇부터 타이핑할까"). 1~10장.
- `task.md` — 전체 개발의 작업 추적 문서(living). 작업이 완료되면 체크박스를 갱신한다.
- `decisions.md` — 스펙이 열어둔 결정 사항. D1~D5는 2026-09-04에 확정됨. 확정 결정은 구속력이 있으며, 스펙 원문과 충돌하면 결정을 우선한다.

두 스펙 문서는 장 번호로 서로를 참조한다(예: 기술 스펙의 rate limit 절이 기획서 7.4를 인용). 결정이 애매할 때는 기술 스펙의 구체적 선택이 기획서의 상위 서술보다 우선한다. 다만 기획서 **0장(절대 원칙)**은 둘 다에 우선한다. **두 스펙 모두 알려진 결함이 있다 — 원문 그대로 구현하기 전에 아래 "알려진 스펙 결함"을 확인할 것.**

## 절대 원칙 (기획서 §0)

1. "홈페이지 제작"을 서비스로 전면에 내세우지 **않는다**. 홈페이지는 `Smart Website` 서비스의 하위 결과물일 뿐이다.
2. 서비스는 항상 정확히 5종: `AI Automation / n8n Automation / Smart Website / AI Agent / AI Consulting`. 재분류·통합하지 않는다.
3. 실제 고객이 없는 데모는 반드시 `자동화 데모` 또는 `샘플 구축 사례`로 표시한다.
4. AI가 추정한 효과(절감 시간 등)는 항상 추정치로 표시하고, 절대 보장처럼 쓰지 않는다.
5. 스택 고정: **Next.js + TypeScript + Supabase + n8n + Telegram**. UI는 Tailwind + shadcn/ui.

MVP의 유일한 목표: 이 전환 흐름을 끝까지 깨지지 않게 유지하는 것 — 방문 → 서비스 이해 → 무료 진단 → AI 결과 → 상담 신청 → 제안. 모든 범위 판단은 "이게 그 흐름을 완성하는 데 필요한가"로 되돌아가 결정한다.

## 스캐폴딩

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
npx shadcn@latest init
npm install zod @supabase/supabase-js @supabase/ssr
```

기술 스펙 §1은 `--src-dir=false`라고 적었지만, 현재 CLI 플래그는 `--no-src-dir`이다. Docker 이미지를 위해 `next.config`에 `output: 'standalone'`을 추가한다. (리포 루트에 기존 md 파일이 있어 `create-next-app .`가 거부하면, 임시 디렉터리에 생성 후 이동한다. CNA가 만드는 `CLAUDE.md`(`@AGENTS.md` 스텁)가 이 파일을 덮어쓰지 않도록 주의.)

목표 구조(기술 스펙 §1.1): App Router에 라우트 그룹 `app/(marketing)/`, `app/diagnosis/`, `app/consultation/`, `app/admin/`, `app/api/`. 공용 코드는 `lib/`(`supabase/server.ts`, `supabase/client.ts`, `rateLimit.ts`, `validation.ts`, `options.ts`, `clientIp.ts`), `content/blog/*.mdx`, `n8n/workflows/*.json`, `supabase/migrations/`, `docker-compose.yml`.

## 명령어 (스캐폴딩 후 — 생성된 `package.json`으로 확인)

- 개발 서버: `npm run dev`
- 프로덕션 빌드: `npm run build`
- 린트: `npm run lint`
- 스펙에 테스트 프레임워크가 지정되어 있지 않다. QA는 수동 체크리스트다(기획서 §17.2). 테스트를 추가한다면 러너도 함께 추가하고 단일 테스트 실행 방법을 여기에 문서화한다.

## 아키텍처

### 요청/데이터 흐름

```
Next.js 진단 폼
  → POST /api/diagnoses      (공개, 스팸 방어): leads + diagnoses(status=SUBMITTED) insert,
                              status=PROCESSING로 전이, 이후 N8N_WEBHOOK_URL로 POST (PII 제거),
                              { diagnosisId } 반환
  → 클라이언트가 /diagnosis/[diagnosisId]로 이동, GET /api/diagnoses/[id]를 3초마다 폴링
n8n 워크플로우 (webhook 트리거)
  → Structured Output 스키마로 OpenAI 호출
  → 응답 검증, diagnosis_results 기록 + diagnoses.status = COMPLETED | FAILED 설정
  → Telegram 알림 전송
GET /api/diagnoses/[id]는 { status } 또는 (COMPLETED/FAILED 시) { status, result } 반환
```

**핵심 설계 결정:** n8n이 service-role 키로 Supabase에 직접 기록한다. Next.js 쪽에는 **콜백 API가 없다**. Next.js API 라우트는 초기 저장 + webhook 트리거만 담당한다.

### 인증 & 접근 제어 모델 (기술 스펙 §3.1, 기획서 §8.1)

- 모든 테이블에 RLS가 켜져 있다. `anon` 롤에는 **정책이 하나도 없다** — 브라우저는 anon 키로 아무것도 읽거나 쓸 수 없다.
- 모든 공개 읽기/쓰기는 서버 사이드 코드(Next.js API 라우트, n8n)에서 **service-role 키**로 수행하며 RLS를 우회한다. `SUPABASE_SERVICE_ROLE_KEY`는 절대 클라이언트 번들에 들어가면 안 된다 — 어떤 `NEXT_PUBLIC_*` 변수나 클라이언트 컴포넌트에도 넣지 않는다.
- 관리자 화면에는 **전용 API 레이어가 없다**. 로그인 세션으로 `lib/supabase/client.ts`를 통해 Supabase를 직접 조회/갱신하며, `authenticated` 롤 RLS 정책(`using (true)`)에 의존한다.
- 이는 Supabase Auth에서 이메일 가입**과 익명 로그인이 둘 다** 비활성화된 경우에만 안전하다. 익명 로그인은 별개 스위치이며 역시 `authenticated` 롤을 발급한다 — 켜두면 모든 리드의 이름·전화·이메일이 노출된다. 스펙은 가입만 언급한다.

### PII 경계 (기획서 §16.1 — 법적 요구사항)

이름·전화·이메일은 Supabase의 `leads`에만 저장한다. n8n / AI 모델로 보내는 페이로드에는 **절대** 포함하지 않는다. webhook 바디는 업무 데이터만 담는다: `diagnosisId, industry, employeeCount, websiteStatus, currentTools, repetitiveTasks, dailyHours, staffCount, monthlyVolume, purpose, painPoint, budgetRange`.

스펙의 §16.1 결론은 불완전하다: Telegram 알림에 회사명이 실리고, 스택 전체(독일 Contabo VPS, Supabase 리전, Telegram)가 AI가 보는 것과 무관하게 국외에 있다. `painPoint`는 자유 텍스트라 사용자가 입력한 PII가 들어올 수 있다. 개인정보처리방침은 AI 호출만이 아니라 실제 인프라를 기술해야 한다.

### 스팸 방어 (기술 스펙 §5)

- **허니팟:** 화면 밖에 배치한 숨김 `hp_field` input(`position:absolute; left:-9999px` + `tabIndex={-1}` + `aria-hidden`), `display:none`은 사용하지 않는다. 제출 시 값이 비어 있지 않으면 `200 OK`를 반환하되 아무것도 저장하지 않는다.
- **Rate limit:** `lib/rateLimit.ts`의 프로세스 내 `Map<ip, timestamp[]>`, IP당 시간당 5건 → `429`. 단일 컨테이너 배포라 Redis 없음. 재시작 시 카운터 초기화(MVP 허용 트레이드오프). `submission_log` 테이블은 향후 다중 인스턴스용 DB 기반 폴백으로 존재한다.
  - **클라이언트 IP는 소켓 주소가 아니라 `cf-connecting-ip` / `x-forwarded-for`에서 얻어야 한다.** 트래픽은 Cloudflare → Nginx Proxy Manager를 거치므로 소켓 IP는 항상 프록시의 것이다. 그대로 쓰면 전체 방문자를 한 버킷으로 제한한다 — 사이트 전체가 시간당 총 5건. 추출 로직은 `lib/clientIp.ts`.
  - 접근 시 만료 엔트리를 prune한다. 안 하면 `Map`이 방문 IP마다 엔트리를 무한히 쌓는다.
- 동의 체크박스(`consentAgreed !== true` → `400`)와 한국 휴대폰 번호 정규식을 서버에서 재검증한다 — 클라이언트 검증은 우회 가능하다.
- 중복 제출은 스펙에서 클라이언트 측(버튼 비활성화)에서만 막는다. 서버에 멱등성 키가 없어 더블클릭 시 leads 2건 + diagnoses 2건 + AI 호출 2회가 발생한다.

### 상태 머신

- `diagnoses.status`: `SUBMITTED → PROCESSING → COMPLETED`(정상) 또는 `PROCESSING → FAILED`. `FAILED` 시 결과 페이지는 사과 문구 + 이미 입력한 연락처가 프리필된 상담 폼을 보여준다(기획서 §9.5). Telegram 알림에는 `[진단 실패]` 태그를 붙인다.
- `consultations.status`: `NEW → CONTACT_PENDING → SCHEDULED → PROPOSAL_SENT → CONTRACTED / ON_HOLD / CLOSED`.
- `GET /api/diagnoses/[id]`는 `SUBMITTED`도 처리해야 한다(스펙은 나머지 3개만 문서화). 클라이언트에는 `PROCESSING`으로 취급한다.
- n8n webhook POST 자체가 실패하면 `FAILED`로 설정하고 알림을 보낸다 — 안 하면 행이 `SUBMITTED`/`PROCESSING`에 영원히 머물고 사용자는 끝나지 않는 스피너를 본다. 스펙은 이 경로를 다루지 않는다.

### AI 출력 안정성 (기획서 §9.3, 기술 스펙 §7)

- OpenAI Structured Output으로 스키마 준수를 강제한다: `response_format: {type: "json_schema", strict: true}`. 프롬프트만으로 "JSON만 반환하세요"에 의존하지 않는다.
- §7.3 스키마는 작성된 그대로 유효하다 — OpenAI strict 모드는 현재 배열의 `minItems`/`maxItems`, 숫자의 `minimum`/`maximum`, 문자열의 `pattern`/`format`을 지원한다. (이 제약 키워드들은 파인튜닝 모델에서는 지원되지 *않는다*.)
- n8n에서 AI 응답을 재검증하고, 실패 시 1회 재시도 후 `status=FAILED` + Telegram 알림.
- AI는 최상위 필드 **6개**를 반환한다: `automationScore`, `priorityTasks`, `totalEstimatedSavedHours`, `recommendedStack`, `implementationSteps`, `summary`. 폴백 계획: 핵심 4개(점수, 우선 업무, 절감 시간, 요약)만 먼저 안정화.
- `priorityTasks[].difficulty` enum 값은 한국어다: `낮음 | 중간 | 높음`. 이는 **업무별** 필드다 — 최상위 난이도는 없다. `diagnosis_results.difficulty` 컬럼은 decisions.md D4에 따라 **삭제**한다.

#### AI 필드 ↔ DB 컬럼 ↔ API 응답 매핑

세 가지 서로 다른 네이밍이 쓰인다. n8n에서 명시적으로 매핑해야 한다:

| AI 출력 (§7.3) | DB 컬럼 (§3) | API 응답 (§4.2) |
|---|---|---|
| `automationScore` | `automation_score` | `automationScore` |
| `priorityTasks` | `recommended_tasks` | `priorityTasks` |
| `totalEstimatedSavedHours` | `estimated_saved_hours` | `totalEstimatedSavedHours` |
| `recommendedStack` | `recommended_stack` | `recommendedStack` |
| `implementationSteps` | `implementation_steps` | `implementationSteps` |
| `summary` | `ai_summary` | `summary` |

### Mock 우선 빌드 순서 (기획서 §9.4, §17)

n8n webhook + 결과 페이지 + Telegram을 AI 튜닝 **전에** 고정 더미 JSON으로 먼저 연결한다. 그러면 AI 프롬프트 튜닝이 별도로 진행되는 동안 나머지 파이프라인(DB → 결과 페이지 → Telegram)은 이미 동작하는 상태가 된다.

### 서비스 유형 자동 태깅 (기획서 §11.3)

AI 결과로부터 `consultations.suggested_service_type`(5종 중 하나)를 상담 전 가설로 도출하고 Telegram 알림에 함께 표시한다.

스펙의 세 절이 이게 어디서 실행되는지에 대해 서로 모순된다(기획서 §11.3은 진단 시점의 n8n, 기술 스펙 §4.3은 "`diagnoses`에서 읽어와"이지만 그런 컬럼이 없음, 기술 스펙 §6의 노드 목록에는 아예 없음). 진단 시점에는 `consultations` 행이 아직 없으므로 진단 시점 실행은 불가능하다.

**해결 (decisions.md D3):** `POST /api/consultations`에서 `lib/serviceTagging.ts`로 `diagnosis_results`를 읽어 계산한다. n8n 워크플로우에 태깅 노드를 **추가하지 않는다**. 규칙은 도입 목적으로 분기하며, 이 값은 이제 `diagnoses.purpose`(decisions.md D1)에 저장된다 — `"방향성 파악 (무엇부터 할지 모름)"` 옵션이 AI Consulting 분기를 구동한다.

### GA4 이벤트는 P0

5개 폼 단계 전부(`step{N}_view` / `step{N}_complete`), `step5_submit`, `diagnosis_result_view`, `consultation_cta_click`, `consultation_submit`에 이벤트 태그. 삽입 위치는 기술 스펙 §9에 정리되어 있다.

## 인프라

- `docker-compose.yml`은 Contabo VPS에서 **web + n8n + nginx-proxy-manager**를 구동한다. Nginx Proxy Manager(관리 UI는 포트 81)가 리버스 프록시 + Let's Encrypt를 담당한다.
- **서비스 포트를 `127.0.0.1`에 바인딩한다.** 스펙의 compose는 `3000`, `5678`, `81`을 `0.0.0.0`에 공개한다. n8n은 OpenAI와 Supabase service-role 자격증명을 보유하므로, TLS 없이 `5678`을 인터넷에 노출하는 게 셋 중 최악이다. 80/443만 도달 가능해야 한다.
- Supabase는 **클라우드 관리형**을 유지하며 의도적으로 compose 파일에 넣지 않는다 — DB만 빼고 전부 self-host하는 비대칭 구성은 VPS 장애 시에도 리드 데이터가 살아남게 하기 위한 것이다. Supabase 스택의 self-host를 제안하지 않는다.
- 백업은 P0 항목이지만 Supabase **Free 플랜에는 자동 백업이 없다** — 스펙의 "플랜에 따라 일 단위"는 이를 얼버무린다. **해결 (decisions.md D5):** Free를 유지하고 Contabo VPS에서 일 1회 `pg_dump` cron(7일 로테이션, 오프사이트 복사). 첫 계약 성사 시 Pro로 전환. 덤프뿐 아니라 복원 경로까지 검증해야 한다.
- n8n 워크플로우는 `n8n/workflows/*.json`으로 export해 버전 관리 / 재해 복구용으로 커밋한다.
- n8n 환경변수(`N8N_ENCRYPTION_KEY`, `NODE_FUNCTION_ALLOW_EXTERNAL` 등)는 Next.js `.env`와 분리해야 한다(기술 스펙 §2). compose의 `${VAR}` 보간은 기본적으로 `./.env`를 읽으므로, n8n 컨테이너에는 별도 `n8n.env`를 `env_file:`로 넘긴다.
- Next.js 컨테이너용 `Dockerfile`은 스펙에 없어 새로 작성한다(standalone 멀티스테이지).
- 환경변수: 기술 스펙 §2 참조. `.env.example`이 템플릿이다.

## 규약

- 사용자에게 보이는 문구, 폼 옵션 값, 여러 DB enum이 **한국어**다. enum 문자열은 합의된 그대로 유지한다(`<select>` 옵션과 1:1로 맞아야 함 — 예: `employee_count`는 `"5-10명"` 같은 구간 문자열을 저장).
- **두 스펙 모두 `industry`, `employee_count`, `website_status`, `daily_hours`, `staff_count`, `monthly_volume`, `purpose`, `budget_range`, `consulting_method`, `consultation_type`, `preferred_date`의 select 옵션 값을 정의하지 않는다** — `current_tools`와 `repetitive_tasks`만 열거되어 있다(기획서 §7). **해결 (decisions.md D2):** 합의된 한국어 라벨은 `decisions.md` §D2-b에 있으며, `lib/options.ts`에 단일 소스로 옮긴다. 폼, zod 스키마, 서비스 태깅, AI 프롬프트가 전부 `lib/options.ts`에서 읽는다 — 라벨을 하드코딩하지 말고, 새로 만들지도 않는다. 라벨 문자열이 곧 저장되는 값이므로, 하나를 수정하면 데이터 마이그레이션이 필요하다.
- 스펙 스키마 외에 필드 2개가 추가되었다(decisions.md D1): `diagnoses.purpose`(도입 목적)와 `diagnoses.staff_count`(담당 인원). 둘 다 PII가 아니라 업무 데이터이므로 n8n webhook 페이로드와 AI 프롬프트에 포함한다. 기획서 §7의 "현재 처리 방식"은 사용 도구와 중복이라 제거했다.
- `zod` 스키마는 `lib/validation.ts`에 두며, 기술 스펙 §4에 문서화된 API 라우트 요청 바디의 공유 계약이다.

## 알려진 스펙 결함

원본 스펙에서 확인된 문제들. 재현하지 말 것. 수정 방향은 위에 기술되어 있고 `task.md`에서 추적한다. **resolved Dn**으로 표시된 행은 `decisions.md`의 확정 결정으로 정리되었으며 — 그 결정이 스펙 원문에 우선한다.

| # | 위치 | 문제 |
|---|---|---|
| 1 | 기술 스펙 §4.1 7단계 | webhook 호출 *후에* `PROCESSING`을 설정 — n8n이 먼저 끝나면 `COMPLETED`를 덮어써서 결과 페이지가 영원히 폴링 |
| 2 | 기술 스펙 §5 | rate limit에 클라이언트 IP 소스가 없음. Cloudflare + NPM 뒤에서는 전체 방문자를 한 버킷으로 제한 |
| 3 | 기술 스펙 §4.1 | webhook POST 실패 처리가 없음 → 사용자가 "처리중"에 영원히 갇힘 |
| 4 | 기술 스펙 §8 | `5678`/`81`/`3000`을 `0.0.0.0`에 공개. n8n이 모든 자격증명을 보유 |
| 5 | 기술 스펙 §3.1 | 관리자 RLS가 가입 비활성화만 전제. 익명 로그인도 `authenticated`를 부여 |
| 6 | 기획서 §7 vs 기술 스펙 §3 | 담당 인원 / 현재 처리 방식 / 도입 목적에 컬럼도 API 필드도 없음 — **resolved D1** |
| 7 | 기획서 §11.3 | 태깅 규칙이 도입 목적으로 분기하나, 결함 6으로 저장되지 않음 — **resolved D1** |
| 8 | §11.3 / §4.3 / §6 | 서비스 유형 태깅 실행 위치에 대한 세 가지 모순된 서술 — **resolved D3** |
| 9 | 기술 스펙 §3 vs §7.3 | AI/DB/API 필드명이 매핑 없이 제각각. `diagnosis_results.difficulty`는 출처가 없음 — **위 매핑표 참조. D4로 컬럼 삭제** |
| 10 | 둘 다 | select 옵션 값 목록이 없음 — **resolved D2** (규약 참조) |
| 11 | 기술 스펙 §4.3 | `leads` "upsert"에 upsert 기준 unique 키가 없음. `leadId`는 클라이언트에 반환된 적이 없음 |
| 12 | 기술 스펙 §4.2 | `SUBMITTED` 응답 형태가 정의되지 않음 |
| 13 | 기획서 §7 | 중복 제출 방지가 클라이언트 전용. 서버 멱등성 없음 |
| 14 | 기획서 §4 vs §17 | "Docker 배포 + DB 백업"이 P0이지만 4주차 이후로 배치됨. 이용약관(§16.2)은 어느 범위 목록·일정에도 없음 |
| 15 | 기획서 §16.1 | 국외 이전 분석이 AI 호출만 다루고 Telegram / Contabo / Supabase 리전은 빠짐 |
| 16 | 기술 스펙 §2 vs §8 | 주장된 n8n/Next.js env 분리가 compose 보간에서는 실제로 일어나지 않음 |
| 17 | 기술 스펙 §8 | Dockerfile 명시 없이 `build: .`. `output: 'standalone'` 언급 없음 |
| 18 | 기획서 §15.2 | Supabase Free 플랜에는 자동 백업이 없는데 백업이 P0 — **resolved D5** |
| 19 | 기술 스펙 §5 | 인메모리 rate limit `Map`이 prune되지 않음 |
| 20 | 기술 스펙 §1 | `--src-dir=false`는 유효한 create-next-app 플래그가 아님 (`--no-src-dir`) |
| 21 | 기술 스펙 §3 | 타입 스멜: `consultations.preferred_date`가 `text`, `diagnoses.website_status`에 CHECK 없음, `leads.email`에 형식 제약 없음 |
| 22 | 기획서 §14.4 | GA4가 P0이지만 쿠키/분석 동의 UI가 어디에도 명시되지 않음 |

## 기존 에이전트 설정 가져오기

`~/.codex/config.toml`에 OpenAI Codex 설정이 있다. 사용자 레벨 항목(MCP 서버, 슬래시 커맨드, 서브에이전트, 스킬, instructions)을 가져오려면 `/import`로 가져올 수 있는 항목을 확인한 뒤 `/import --yes=<digest>`로 적용한다.

---

@AGENTS.md
