# WEBAGENT.KR MVP — 전체 개발 계획 / 작업 관리

> Living document. 작업 진행에 따라 체크박스 갱신·메모 추가·범위 조정.
> 근거 문서: `docs/개발자용_통합_MVP_기획서.md`(제품·사업), `docs/개발_착수_기술_스펙.md`(구현), `CLAUDE.md`(구현 지침·스펙 결함 목록), `docs/decisions.md`(확정 결정).

## Context

리포에는 스펙 문서 2개와 `CLAUDE.md`만 있고 코드는 없다. MVP의 유일한 목표는 다음 전환 흐름 하나를 끝까지 깨지지 않게 완성하는 것:

```
사이트 방문 → 서비스 이해 → 무료 자동화 진단 → AI 분석 결과 → 상담 신청 → 제안·계약
```

**확정 결정** (사용자):
- AI 제공자: **OpenAI** (Structured Output: `response_format: {type: "json_schema", strict: true}`)
- 백엔드 서비스: 아직 없음 → 로컬 우선, n8n/AI는 Mock부터
- 스택 고정(기획서 §0): Next.js + TypeScript + Supabase + n8n + Telegram, UI는 Tailwind + shadcn/ui
- 앱은 리포 루트에 스캐폴딩(스펙의 `webagentkr-mvp/` 하위폴더 표기 무시). 기존 md 3개 보존.

> ⚠️ 스펙 검토 결과 **22건의 결함**이 확인되었다. 전체 목록은 `CLAUDE.md`의 "Known spec defects" 표.
> 그중 사용자 결정이 필요했던 **5건(D1~D5)은 2026-09-04 전원 확정** — `docs/decisions.md` 참조.

**D1~D5 확정 요약** (Phase 0에서 반영):
- **D1** `diagnoses`에 `purpose`(도입 목적)·`staff_count`(담당 인원) 추가, **현재 처리 방식은 폼에서 제거**
- **D2** 선택지는 한글 라벨 저장 + `lib/options.ts` 단일 정의 (`docs/decisions.md` D2-b 목록 그대로)
- **D3** 서비스 태깅은 **상담 신청 시점 Next.js**(`lib/serviceTagging.ts`), n8n 아님
- **D4** `diagnosis_results.difficulty` **컬럼 삭제**
- **D5** Supabase **Free + cron `pg_dump`**, 첫 계약 성사 시 Pro 전환

## 현재 상태

- [x] **결정 확정** — `docs/decisions.md` D1~D5 (2026-09-04, 전원 권장안대로)
- [x] Phase 0 — 1주차: 기반 구성  (2026-09-04 완료 · 검증 통과 · 커밋 완료)
- [x] Phase 1 — 2주차: 랜딩 + 진단 폼  (2026-09-07 완료 · 검증 통과 · 커밋 완료)
  - [x] 1.1 랜딩페이지 (2026-09-04 · frontend-design · 라이트 전용 · 반응형)
  - [x] 1.2~1.7 진단 폼 + POST /api/diagnoses (2026-09-04)
    - 마이그레이션 0002 (idempotency_key + 부분 유니크). 로컬 Postgres 적용 확인.
    - lib: validation(단계 스키마), pick, diagnosisWebhook(PII 경계), telegram, analytics(track 스텁)
    - POST /api/diagnoses: 허니팟/rate limit/zod → 멱등성 조회 → leads upsert → diagnoses insert
      → PROCESSING 선전이(결함 #1) → webhook(PII 제외) → 실패 시 FAILED+Telegram(결함 #3)
    - 폼: 단일 client wizard(useReducer, 지속성 없음), 5단계, 단계별 zod, 허니팟, GA4 track 호출부
    - /diagnosis/[id]: 정적 "분석 중" (폴링은 Phase 2.1~2.2)
    - frontend-design 패스(Task 8, `4299cd3`): 5단계 진행률을 랜딩 히어로 파이프라인 컨셉(다이아몬드 노드 + 헤어라인 커넥터)으로 재설계, `--wak-danger` 토큰 도입해 오류 색상 통일(raw `red-*` 전량 교체), 접근성 버그 2건 수정(Tailwind v4 `outline-none`이 포커스 링 outline-style을 0으로 만드는 문제, `sr-only` 라디오 chip의 키보드 포커스 표시 부재 → `:has(:focus-visible)`로 해결), 탭 타겟 44px 이상 + `motion-reduce:transition-none` 가드
    - 검증: build/lint 통과, 0002 SQL, non-DB curl 3종, 폼 Playwright 흐름. DB 통합 검증은 Supabase 연결 시.
- [~] Phase 2 — 3주차: 결과 파이프라인 (Mock 우선)  — 2.1~2.5 완료·머지 (PR #2, 2026-09-08). **2.6~2.9(실 n8n 워크플로우) 미착수** — n8n 인스턴스 필요(묶음 B 이후 "Phase B")
- [~] Phase 3 — 4주차: 상담 + 관리자 + 법적 고지 + GA4  — 착수 순서 A→C→B→D
  - [x] 묶음 A 상담 흐름 — 머지 (PR #3 `21130a9`, 2026-09-08). DB 통합 검증만 Supabase 연결 시 대기
  - [x] 묶음 C 법적 고지 — 브랜치 `feat/legal-pages` (2026-09-09). 개인정보처리방침·이용약관 초안 + 링크 배선. `[확정 필요]` → Phase 4.7
  - [x] 묶음 B 관리자 화면 — 브랜치 `feat/admin-console` (2026-09-09). SSR 세션 게이트 + 로그인 + 상담 목록/상세/상태전이/메모 + 진단 상세. 별도 API 없음(RLS `authenticated` 직접 조회). DB 통합 검증만 Supabase 연결 시
  - [ ] 묶음 D GA4 — 마지막
- [ ] Phase 4 — 지속(P1): 출시 마무리

---

## Phase 0 — 1주차: 기반 구성

기술 스펙 §10 "1주차 완료 기준"을 코드로 채운다. 기능 로직은 이 페이즈 범위 밖(스텁만).

- [x] **0.0 선행 결정** — `docs/decisions.md` D1~D5 확정 완료(2026-09-04). 아래 각 항목에 반영됨.
- [x] **0.1 스캐폴딩**
  - `npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm`
    - 스펙 §1의 `--src-dir=false`는 잘못된 플래그 → `--no-src-dir` (결함 #20)
  - 비어있지 않은 디렉터리로 거부되면 임시 디렉터리 생성 후 이동, md 파일 복원
  - `npx shadcn@latest init`
  - `npm install zod @supabase/supabase-js @supabase/ssr`
  - `next.config.*` 에 `output: 'standalone'` (결함 #17)
- [x] **0.2 폴더 구조** (기술 스펙 §1.1) — 라우트 파일은 최소 렌더/`501` 스텁, 빈 폴더는 `.gitkeep`
  - `app/(marketing)/{page,cases/page,about/page,privacy/page}.tsx`
  - `app/diagnosis/{page,[id]/page}.tsx`, `app/consultation/page.tsx`
  - `app/admin/{layout,login/page,page,diagnoses/[id]/page,consultations/[id]/page}.tsx`
  - `app/api/{diagnoses/route,diagnoses/[id]/route,consultations/route}.ts` → 501 스텁
  - `lib/supabase/{server,client}.ts`, `lib/{rateLimit,validation,clientIp,options}.ts`
  - `components/` (.gitkeep), `content/blog/` (.gitkeep), `n8n/workflows/README.md`
  - **추가**: `app/terms/page.tsx` 스텁 (이용약관 — 결함 #14, 기획서 §16.2)
- [x] **0.3 `supabase/migrations/0001_init.sql`** (기술 스펙 §3 + §3.1 + 결정 반영)
  - `pgcrypto`, `set_updated_at()` 트리거 함수
  - `leads`, `diagnoses`(status CHECK, updated_at 트리거, lead_id 인덱스), `diagnosis_results`(diagnosis_id UNIQUE, jsonb), `consultations`(diagnosis_id FK 포함, suggested_service_type·status CHECK, updated_at 트리거), `submission_log`
  - RLS: 5개 테이블 `enable`, anon 정책 없음, `authenticated` 롤 `admin_select_*` + `admin_update_diagnoses/consultations` (`using (true)`)
  - **D1**: `diagnoses`에 `purpose text`, `staff_count text` 추가 (결함 #6·#7)
  - **D4**: `diagnosis_results.difficulty` **컬럼 제외** (결함 #9)
  - `leads.email` unique 인덱스 — 상담 upsert 키 (결함 #11)
  - **#21**: `consultations.preferred_date`는 선택지 텍스트 유지(D2-b), `diagnoses.website_status`에 CHECK 추가
  - 상단 주석: SQL Editor 실행 안내 + **회원가입 및 익명 로그인 모두 비활성화 필수** (결함 #5)
- [x] **0.4 `.env.example`** (기술 스펙 §2) — Supabase 3키, `N8N_WEBHOOK_URL/SECRET`, `OPENAI_API_KEY`, Telegram 3키, `RESEND_API_KEY`(P1), `NEXT_PUBLIC_GA4_MEASUREMENT_ID`
  - n8n 자체 env는 **별도 파일**(`n8n.env`)로 분리 — compose 보간이 같은 `.env`를 읽는 문제 해결 (결함 #16)
- [x] **0.5 `lib/` 모듈**
  - `supabase/server.ts` — service-role 클라이언트(`persistSession:false`), "클라이언트 번들 금지" 주석
  - `supabase/client.ts` — `@supabase/ssr` `createBrowserClient`(anon), 관리자 세션 전용
  - `options.ts` — **D2-b 목록을 그대로 옮긴 select 선택지 단일 소스** (결함 #10). 한글 라벨을 DB에 그대로 저장하므로 문자열이 곧 계약. 폼·validation·태깅·AI 프롬프트가 전부 여기서 참조(하드코딩 금지)
  - `validation.ts` — zod: `diagnosisSubmissionSchema`(§4.1 + D1 필드, `hp_field`, `consentAgreed`, 한국 휴대폰 정규식, 선택지는 `options.ts` 기반 enum), `consultationSubmissionSchema`(§4.3)
  - `clientIp.ts` — **`cf-connecting-ip` → `x-forwarded-for` 순으로 실제 클라이언트 IP 추출** (결함 #2, 치명)
  - `rateLimit.ts` — `Map<ip, number[]>`, `checkRateLimit(ip, 5, 3_600_000)`, **만료 엔트리 prune 포함**(결함 #19), 재시작 시 초기화 트레이드오프 주석
- [x] **0.6 Docker** (기술 스펙 §8)
  - `Dockerfile` — standalone 멀티스테이지(`node:24-alpine`, 비루트) — 스펙에 없어 신규 작성 (결함 #17)
  - `docker-compose.yml` — `web` + `n8n` + `nginx-proxy-manager`. Supabase 미포함(§15.2)
    - **포트를 `127.0.0.1`에 바인딩** — `3000`/`5678`/`81` 공개 금지 (결함 #4, 치명)
    - `version:` 키 제거 (Compose V2에서 obsolete)
    - n8n은 `env_file: n8n.env`
  - `.dockerignore`
- [x] **0.7 Git 초기화** — `git init`, `.gitignore` 의 `.env`/`n8n.env` 확인, 초기 커밋 1개
- [x] **0.8 검증** (아래 "검증" 섹션 실행)

### Phase 0 이후 사용자 직접 작업 (코드 불가)
1. Supabase 프로젝트 생성(**리전: Seoul 권장** — 결함 #15) → 마이그레이션 SQL 을 대시보드 > SQL Editor 에 붙여넣어 순서대로 1회씩 실행. 실행 후 각 파일에 `[x]` 표시:
   - [ ] `supabase/migrations/0001_init.sql`
   - [ ] `supabase/migrations/0002_diagnoses_idempotency.sql` (0001 이후). 이 컬럼(`diagnoses.idempotency_key`)이 없으면 배포 후 **모든** 진단 제출이 500 으로 실패하고 PII 만 담긴 고아 `leads` 행이 쌓인다. 파일 헤더의 "적용 확인" 쿼리로 컬럼 존재를 검증할 것. (Phase 2 배포 체크리스트에도 재확인)
2. Supabase Auth **Email 가입 + 익명 로그인 모두 비활성화**, 관리자 계정 1개 수동 생성(+2FA 권장)
3. Telegram 봇 생성(BotFather) → 토큰/chat id
4. OpenAI API 키 발급
5. `.env.example` → `.env` 채우기, `n8n.env` 별도 작성
6. (배포) Contabo VPS `docker compose up`, Nginx Proxy Manager에서 도메인·인증서, **방화벽 80/443만 개방**

---

## Phase 1 — 2주차: 랜딩 + 진단 폼

- [x] 1.1 랜딩페이지: Hero → 문제 제시 → Before/After → 서비스 5종 → 자동화 데모 3개(`자동화 데모` 배지 필수) → 진단 CTA → 구축 절차 → 신뢰 요소 → FAQ → 최종 CTA (기획서 §5). 반응형. (2026-09-04)
  - `app/(marketing)/{layout,page}.tsx` + `components/marketing/*` (전부 RSC, 클라이언트 JS 0). `app/globals.css`에 `--wak-*` 토큰 + 히어로 신호 애니메이션.
  - 폰트: Pretendard(CDN dynamic-subset) 본문 + IBM Plex Mono(next/font) — 영문 모듈명·인덱스 한정. 라이트 전용.
  - 결정: 헤더만 공용(`layout.tsx`), 푸터 최소. 네비 대상 라우트 일부는 아직 스텁(다음 라운드). 블로그는 네비 제외.
  - **문구 미확정(구조만, `{/* TODO */}`)**: 구축 절차 단계 설명 / 신뢰 요소 본문 / FAQ 6문항 / 푸터 사업자 정보.
  - 범위 밖(다음 라운드): 폼·API·`/diagnosis/[id]` 결과 페이지·GA4·다크 모드·데모 상세 페이지.
  - 검증: `build`(정적 프리렌더 `○ /`) · `lint` 0 · 데스크톱/모바일 스크린샷 육안.
- [x] 1.2 5단계 진단 폼(기획서 §7): 단계별 화면, 진행률, 이전/다음, 오류 메시지, 제출 버튼 중복 클릭 방지
  - 1 회사정보 / 2 사용도구(복수) / 3 반복업무(복수) / 4 업무량·문제 / 5 상담정보 + 개인정보 동의
  - 선택지는 전부 `lib/options.ts` 참조
- [x] 1.3 클라이언트 유효성 검사 = `lib/validation.ts` 스키마 재사용
- [x] 1.4 허니팟 `hp_field` (숨김: `position:absolute;left:-9999px` + `tabIndex=-1` + `aria-hidden`) — 기술 스펙 §5
- [x] 1.5 `POST /api/diagnoses` 구현(기술 스펙 §4.1 + 결함 수정)
  - 허니팟→200 무저장 / `consentAgreed!==true`→400 / rate limit(`clientIp.ts` 사용)→429
  - leads insert → diagnoses insert(SUBMITTED)
  - **`PROCESSING`으로 먼저 전이한 뒤** n8n webhook POST (**PII 제외**, `X-Webhook-Secret`) — 순서 역전으로 경쟁 조건 제거 (결함 #1, 치명)
  - **웹훅 호출 실패 시 `FAILED` + Telegram 알림** (결함 #3, 치명)
  - n8n 미구성 단계에서는 env 없으면 skip + 로그
  - `{ diagnosisId }` 반환
- [x] 1.6 **서버 측 중복 제출 방지** — 클라이언트 생성 `idempotencyKey`(폼 마운트 시 UUID 1개) + `diagnoses` UNIQUE 제약. 재제출 시 기존 row의 `diagnosisId` 그대로 반환(추가 lead/AI 호출 없음). 마이그레이션 `0002` 필요 (결함 #13, 2026-09-04 확정)
- [x] 1.7 제출 성공 시 `/diagnosis/[id]` 이동

---

## Phase 2 — 3주차: 결과 파이프라인 (Mock 우선)

- [x] 2.1 `GET /api/diagnoses/[id]` — status 폴링, SUBMITTED→PROCESSING(결함 #12), lead 미포함, Cache-Control: no-store
- [x] 2.2 결과 페이지 — 서버 shell + 클라이언트 폴링 아일랜드(3s×60=3분), 6카드(추정치 명시), stack/steps 빈 배열 생략
- [x] 2.3 FAILED/timeout UX — 사과 문구 + /consultation?diagnosisId=<id> CTA (프리필·lead 재사용은 Phase 3)
- [x] 2.4 Mock 경로 — POST /api/dev/mock-result/[id] (n8n 대역, 프로덕션 404), lib/mockDiagnosisResult.ts 픽스처
- [x] 2.5 AI↔DB↔API 매핑표 — n8n/workflows/README.md
- [ ] 2.6 n8n 워크플로우 구성(기술 스펙 §6): Webhook(secret 검증) → 입력 정리 → OpenAI HTTP Request(Structured Output, 기술 스펙 §7.3 스키마 — strict 요건 충족 확인됨) → 응답 필드 검증 → IF → 성공: `diagnosis_results` insert + status=COMPLETED + Telegram / 실패: status=FAILED + Telegram `[진단 실패]`
- [ ] 2.7 Error Trigger 워크플로우 → `TELEGRAM_ERROR_CHAT_ID` (기획서 §16.5)
- [ ] 2.8 워크플로우 JSON export → `n8n/workflows/{diagnosis-pipeline,error-trigger}.json` 커밋
- [ ] 2.9 필드 단계적 안정화: 우선 핵심 4개(준비도/우선업무/절감시간/요약), 나머지는 P1 가능(기획서 §9.3)

### Phase 2 이탈·메모
- `POST /api/diagnoses`는 webhook 미설정 시 지금도 그냥 skip(변경 없음). Mock 결과 주입은 별도 dev 라우트가 담당 — 실제 코드 경로에 mock 분기를 넣지 않음(스펙 D-B).
- `visibilitychange` 백그라운드 폴링 일시정지: 채택 안 함(3분 상한이 안전망, YAGNI).
- `?_test_pollMs` / `?_test_maxAttempts`: 비프로덕션에서만 동작하는 폴링 축소 쿼리(Playwright 편의).
- DB 통합 검증(제출→PROCESSING→mock-result→COMPLETED)은 Supabase 연결 시 수행 — 이 환경에선 에러 경로 + 프리뷰로 대체(각 태스크 리포트에 기록).

### Phase 2 최종 전체 브랜치 리뷰 (base `4cd0176` → head, 2026-09-08)
- 리뷰 결과: **Critical 0.** PII 경계·`server-only` 경계·상태 머신·AI↔DB↔API 매핑 단일 소스 견고. lint·tsc 통과.
- 반영한 수정 (커밋 1개):
  - **폴링 폴 겹침 방지** (`diagnosis-result.tsx`): `inFlight` 가드 + `await` 뒤 `stopped` 재검사. fetch 가 3s 보다 느려도 `attempts` 이중 증가·`track("diagnosis_result_view")` 이중 발화 없음.
  - **하드 404 문구 분리**: `GET` 404(존재하지 않는 진단 번호) → `ErrorView variant="notfound"` — "다시 시도"(계속 404) 대신 "진단 새로 시작하기" 링크. 연속 오류(transient)와 별도 뷰.
  - `POST /api/dev/mock-result/[id]`: `createServiceClient()` try/catch 로 GET 라우트와 통일. `?outcome=`(빈 값)도 `completed` 로 처리(`?? ` → `|| `).
  - `globals.css` 파일 끝 개행.
- 리뷰가 지적했으나 **의도적으로 반영 안 함**:
  - `lib/diagnosisResult.ts`·`lib/mockDiagnosisResult.ts` 에 `server-only` 미부착 — 계획 Global Constraints 의 "러너 없는 유닛 테스트 대상" 결정 유지. 현재 모든 클라이언트 import 가 `import type` 이라 런타임 누출 없음. 값 import 방지 가드는 post-MVP 검토.
  - `let timer` hoist / effect 시작 시 `setView({kind:"polling"})` — 둘 다 eslint(`prefer-const`, `react-hooks/set-state-in-effect`) 위반. 기존 `const timer` 클로저 + `onRetry` 가 polling 세팅하는 패턴이 정답이라 원복.
  - 폴링→결과 전환 `aria-live` — 카드 6개를 통째로 읽어 SR 장황해지는 역효과. 짧은 상태 알림은 Phase 3 a11y 패스에서.
- **머지 후 필수 후속**: Supabase 연결 환경에서 `제출 → /diagnosis/[id] → curl POST /api/dev/mock-result/<id> → 6카드` / `?outcome=failed → FailedNotice` / `?_test_maxAttempts=2 → timeout` 3경로 실측. 이 계약 위에 Phase B(n8n)·Phase 3(상담)이 쌓임.
- **배포 판단**: 이 브랜치만 프로덕션에 올라가면 `N8N_WEBHOOK_URL` 미설정 + `mock-result` 프로덕션 404 → 모든 진단이 3분 timeout(상담 CTA)로 종결. Mock-우선 설계상 예상 동작이나, Phase B 완료 전까지 프로덕션에서 "완료된 진단 결과"를 기대하면 안 됨.

---

## Phase 3 — 4주차: 상담 + 관리자 + 법적 고지 + GA4

> **분해 (2026-09-08):** 3.1~3.9 는 서로 독립적인 4개 서브시스템이다. 각 묶음이 자체
> spec → plan → 구현 사이클을 갖는다(Phase 1·2 방식). 착수 순서 **A → C → B → D**.
> 원래 번호(3.1~3.9) 대응은 각 태스크 끝에 표기.

### 묶음 A — 상담 흐름  (첫 착수 · 브랜치 `feat/consultation-flow`)

전환 퍼널의 마지막 조각: 결과/실패 페이지 → 상담 신청 → Telegram. Mock 불필요, DB(`consultations`
0001 에 이미 있음)만 있으면 됨.

- [x] **A1 `lib/serviceTagging.ts`** (구 3.3 · 결함 #8 · D3) — `diagnosis_results`(`recommended_stack`·`priorityTasks`)
      + `diagnoses.purpose`·`budget_range` → 서비스 5종 중 하나. 규칙: 기획서 §11.3. 순수 함수, 단위 검증.
      `diagnosisId` 없거나 결과행 없음(직접 상담·FAILED 진단) → 기본값/`null` (A 설계에서 확정).
- [x] **A2 `POST /api/consultations`** (구 3.1 · §4.3 · 결함 #11) — 허니팟→200 무저장 / `consentAgreed!==true`→400
      / rate limit(`clientIp.ts`)→429 → `diagnosisId` 있으면 `diagnoses.lead_id` 역참조로 lead 재사용,
      없으면 `leads.email` unique upsert → A1 로 `suggested_service_type` 계산 → `consultations` insert(`NEW`)
      → Telegram(`[신규 상담]` + 추정 서비스 유형) → `{ consultationId }`.
- [x] **A3 서버 재검증** (구 3.7) — `consentAgreed` + 한국 휴대폰 정규식을 A2 에서 재검증. `consultationSubmissionSchema`
      이미 존재 — 한글 `error:` 메시지 보강 포함.
- [x] **A4 상담 폼** `app/consultation/page.tsx` (구 3.2) — 진단 wizard 필드 프리미티브·시각 언어 재사용.
      `?diagnosisId=` 있으면 연락처 프리필/생략(lead 재사용), 없으면 전체 입력. 필드: 연락처 + `preferredDate`
      + `consultationType`(=`consultingMethod` 값) + 자유 문의(선택) + 개인정보 동의 + 허니팟.
- [x] **A5 결과 페이지 CTA 배선** (구 3.2) — `ResultCards`·`FailedNotice` CTA → `/consultation?diagnosisId=<id>`.
      (`FailedNotice` 는 Phase 2 에서 이미 연결. `ResultCards` 에 상담 CTA + `consultation_cta_click` `track()` 추가.)
- [x] **A6 검증** — build/lint/tsc, curl(허니팟·동의누락·rate limit·`diagnosisId` 유무 2경로), 폼 Playwright.
      DB 통합은 Supabase 연결 시.
- A 에 심는 `track()` 호출부: `consultation_cta_click`(A5), `consultation_submit`(A2 성공 직후). gtag 로드·동의는 묶음 D — `track()` 스텁이 no-op 이라 지금 심어도 안전(Phase 1 step 이벤트와 동일).

### 묶음 A 이탈·메모 (2026-09-08)
- 에러 키를 스펙 §4.4(`bad_json`/`invalid`)가 아니라 기존 `POST /api/diagnoses` 규약(`invalid_json`/`validation`)으로 통일.
- `consultationSubmissionSchema`에 `leadId` 필드는 원래 없었음(스펙 §8의 "제거" 항목은 무효) — `diagnosisId` 역참조 / email upsert 만 씀.
- 상담 폼 동의 체크박스는 진단 폼 `ConsentCheckbox` 를 그대로 재사용(현재 `/privacy` 링크만). `/terms` 링크 + 상담용 문구는 묶음 C.
- 성공 화면 안내 문구는 `{/* TODO 묶음 C */}` — 확정 대기.
- DB 통합(제출→`consultations` 행 + Telegram, `diagnosis_not_found`, 성공 화면)은 이 환경에 Supabase 없어 미검증 — curl 에러 경로 + Playwright 렌더로 대체. 묶음 B 착수 전 1회 관통 권장.
- serviceTagging ④ n8n Automation 판정에 "LLM 마커 없음" 조건 추가(스펙 §3.2 해석) — Mock 픽스처 스택이 항상 n8n 을 포함해 기본값이 죽는 문제 회피.

### 묶음 C — 법적 고지  (A 다음)

- [x] **C1 개인정보처리방침** `app/(marketing)/privacy/page.tsx` (구 3.5 · 결함 #15) — 13절 초안 + 국외 이전 표
      (Supabase 미국`[리전]` / Contabo 독일 / OpenAI 미국 — 업무 데이터만·식별정보 미이전 / Telegram 소재지 불명·회사명·진단번호만
      / Google 미국·비식별). 위탁 표 + 안전성 확보조치(RLS·service-role 분리·전송 암호화·2FA·백업·AI 식별정보 제외). 상단 "전문가 검토 전 초안" 배너.
- [x] **C2 이용약관** `app/(marketing)/terms/page.tsx` (구 3.6 · 신규 · 결함 #14) — 10조 + 부칙 초안. 제4·7조에 **AI 결과=추정치·미보장**(기획서 §0 원칙 4) + 면책(무료 서비스 배상범위 제한). 스텁이 이미 `(marketing)` 그룹 경로에 있어 이동 없음.
- [x] **C3 링크 연결** — `site-footer.tsx` 에 사업자 정보 라인(전부 `[확정 필요]`). 진단 wizard(step 5)·상담 폼 제출 버튼 위에
      `components/marketing/legal/consent-notice.tsx`(신규) 로 "신청 시 이용약관·개인정보처리방침 동의 간주" 문구 + 링크 2개. `ConsentCheckbox` 는 개인정보용 그대로.

### 묶음 C 이탈·메모 (2026-09-09)

- 브랜치 `feat/legal-pages`. 마이그레이션·env·로직 없음(정적 콘텐츠 2쪽 + 링크 배선). plan 문서 없이 bounded 경로로 구현.
- 공용 셸 `components/marketing/legal/shell.tsx` — `LegalShell`(배너 고정)·`LegalSection`·`LegalTable`·`Placeholder`. 두 페이지 + 푸터가 `Placeholder` 공유.
- 두 법적 페이지는 `(marketing)` 레이아웃이 이미 `<main>` 을 감싸므로 루트를 `<div>` 로(기존 스텁의 중첩 `<main>` 제거).
- **결함 #15 해소** — 국외 이전 분석이 AI 호출뿐 아니라 Contabo(독일)·Supabase 리전·Telegram 까지 포함.
- **출시 전 필수 `[확정 필요]`** (전문가 검토는 사용자 몫): 사업자 정보(상호·대표자·사업자등록번호·통신판매업신고번호·주소·이메일),
  개인정보 보호책임자, **Supabase 리전**, 시행일(개인정보처리방침·이용약관), 관할 법원, 보유기간(진단·상담/자동 생성 정보). → Phase 4.7 에 추가.
- 검증: `tsc`·`eslint .`·`next build` 0 (privacy·terms 정적 `○`). Playwright — 두 페이지 13절/10조 + 배너 + 표 + `[확정 필요]` 마크,
  푸터 사업자 정보 라인, 진단 step5 & 상담 폼 동의 문구 + `/terms`·`/privacy` 링크(`target=_blank`) 렌더 확인. DB 무관.

### 묶음 B — 관리자 화면  (C 다음 · 별도 API 없음, RLS 직접 조회 §4.4)

- [x] **B1 사전 조건(사용자 작업)** — Supabase Auth 이메일 가입 + 익명 로그인 **둘 다 비활성화** 확인,
      관리자 계정 1개 수동 생성(+2FA). 코드 불가. (검증용 `verify-admin@webagent.test` 는 `scratchpad/` 스크립트로 생성)
- [x] **B2 `app/admin/layout.tsx` 세션 게이트** — 서버 세션 확인 → 미인증 시 `/admin/login` 리다이렉트. `proxy.ts`(신규) 1차 게이트 + 레이아웃 재확인.
- [x] **B3 로그인** `app/admin/login/page.tsx` — Supabase Auth 이메일/비번(`lib/supabase/client.ts`).
- [x] **B4 대시보드** `app/admin/page.tsx` — YAGNI 로 별도 대시보드 미구현. `/admin` = 상담 목록 홈(사용자 확정, 이탈·메모).
- [x] **B5 진단 목록 + 상세** `/admin/diagnoses/[id]` 읽기 전용 — 진단 입력값 + `diagnosis_results` 6필드(있으면) + 상태. 독립 목록 없음(상담 상세에서 링크로만, 이탈·메모).
- [x] **B6 상담 목록 + 상세 + 상태변경 + 메모** `/admin/consultations`(+`[id]`) — `<select>` 7값 자유 전이,
      메모 저장. RLS `admin_update_consultations`.
- [x] **B7 검증** — build/lint/tsc 0, Playwright(로그인·목록·필터·상세·상태·메모·404·리다이렉트), Supabase REST 단언(service-role).

### 묶음 B 이탈·메모 (2026-09-09)

- 브랜치 `feat/admin-console`. spec `docs/superpowers/specs/2026-09-09-admin-console-design.md` + plan `docs/superpowers/plans/2026-09-09-admin-console.md` on `main` 예정.
- 인증 = **SSR 게이트** (사용자 확정). `middleware.ts`(신규) + `lib/supabase/session-client.ts`(신규, anon+세션). CLAUDE.md "브라우저 클라이언트 직접 조회" 서술보다 우선 — service_role은 여전히 서버 전용, 세션 클라이언트는 RLS `authenticated` 존중.
- spec·plan 은 게이트 파일을 `middleware.ts` 로 표기하나, Next 16 에서 `middleware.ts` 는 폐기·`proxy.ts` 로 개명됨 → 두 문서에 정오표 추가(커밋 `b248ee6`). 실제 파일은 `proxy.ts`.
- proxy.ts (Next 16, middleware.ts 폐기·개명) — 세션 쿠키 갱신 + /admin/* 게이트. 리다이렉트 응답에 갱신 쿠키 전파.
- `/admin` = 상담 목록 홈. 별도 대시보드·독립 진단 목록 없음(YAGNI, 사용자 확정). 진단은 상담 상세에서 링크로만.
- 상태 전이 = `<select>` 7값 자유 전이(가드 없음). 상태 변경 즉시 저장, 메모는 버튼 저장. server action 반환 `{ok:true}|{error}`.
- 마이그레이션·env 없음. `consultations.memo`·RLS 정책은 0001에 이미 존재.
- 검증: build/lint/tsc 0, Playwright(로그인·목록·필터·상세·상태·메모·404·리다이렉트), Supabase REST 단언(service-role). 검증용 관리자(`verify-admin@webagent.test`) + 시드 상담/진단은 `scratchpad/` 스크립트로 생성 후 **삭제**. (auth 유저 삭제가 권한상 막히면 사용자가 대시보드에서 제거)
- frontend-design 패스 없음(내부 도구, `--wak-*` 토큰만).

### 묶음 D — GA4  (마지막)

- [ ] **D1 쿠키/분석 동의 UI** (구 3.9 · 결함 #22, 스펙 미정의) — 최소 동의 배너. 거부 시 gtag 미로드. `localStorage` 저장.
- [ ] **D2 gtag.js 조건부 로드** — 동의 시에만 `NEXT_PUBLIC_GA4_MEASUREMENT_ID` 로드. `track()` 그대로.
- [ ] **D3 이벤트 배선 확인** (구 3.8 · §9 표) — `step{1..5}_view/complete`·`step5_submit`(Phase 1)·`diagnosis_result_view`(Phase 2)·`consultation_cta_click`·`consultation_submit`(묶음 A) 누락·순서 점검.
- [ ] **D4 검증** — 동의 전/후 gtag 로드 여부, 이벤트 발화.

### 의존성
- **A → C → B → D**. C 는 짧고 A 상담 폼 동의 문구가 C 링크 필요. B 는 B1(사용자 Supabase 설정) 선행, A·C 데이터 있으면 검증 쉬움. D 는 A 이벤트 호출부가 있어야 §9 표 완결.
- A·C·D 는 이 개발 환경에서 코드만으로 진행 가능(DB 통합 검증만 Supabase 연결 시).

---

## Phase 4 — 지속 (P1): 출시 마무리

- [ ] 4.1 고객 결과 이메일 발송(Resend)
- [ ] 4.2 자동화 사례 상세 페이지
- [ ] 4.3 MDX 블로그 3개(신뢰 자료 목적, 기획서 §13)
- [ ] 4.4 SEO 메타데이터, `sitemap`, `robots.txt`, Open Graph, Microsoft Clarity
- [ ] 4.5 Contabo Docker 실제 배포 + **DB 백업 (D5: Free + cron `pg_dump` 일 1회, 7일 로테이션, 오프사이트 복사)** — P0 항목이므로 출시 전 완료 필요(결함 #14, #18)
  - **복원 절차까지 실제로 검증**해야 완료 처리. 첫 계약 성사 시 Supabase Pro 전환.
- [ ] 4.6 출시 전 QA 체크리스트(기획서 §17.2):
  - 진단 5단계 Happy path 전 구간(제출→결과→상담) 동작
  - 모바일(iOS Safari, Android Chrome) + 데스크톱 반응형 각 1회
  - 필수값 누락/전화번호 오류/중복 제출 시 오류 메시지
  - FAILED 시나리오 의도적 발생 → §9.5 흐름 동작
  - Telegram 알림 3종(신규 진단·신규 상담·시스템 에러) 도착
  - 개인정보 동의 없이 서버에서도 제출 거부(클라이언트 우회 테스트)
  - **추가**: 프록시 뒤에서 rate limit이 IP별로 동작하는지(결함 #2 회귀 방지)
  - **추가**: n8n 완료가 빠를 때 status가 PROCESSING으로 되돌아가지 않는지(결함 #1 회귀 방지)
- [ ] 4.7 법적 페이지 `[확정 필요]` 채우기 (묶음 C 초안 → 실값) + **변호사·노무사 검토** — 출시 전 필수:
  - 사업자 정보: 상호 · 대표자 · 사업자등록번호 · 통신판매업신고번호 · 주소 · 이메일 (`site-footer.tsx` + privacy §12/§13)
  - 개인정보 보호책임자(성명·직책·이메일), 보유기간(진단·상담 / 자동 생성 정보)
  - **Supabase 리전 확정** → privacy 국외이전 표 `[리전 확정 필요]` 반영 (리전 자체는 기획서 §15.2 "Seoul 권장")
  - 시행일: 개인정보처리방침 · 이용약관 / 이용약관 관할 법원

---

## 범위 밖 (P2 — 검증 후)

PDF 보고서·공유 링크, 상담 일정 예약, 고객 계정·포털, 결제·전자세금계산서, 견적서·계약서 자동 생성, 실행 로그 대시보드, 사내 문서 RAG, 실시간 채팅, 다국어, 모바일 앱.

---

## 검증 (Phase 0)

- `npm run dev` → `localhost:3000` 스텁 홈 렌더
- `npm run build` → standalone 빌드 성공(타입·린트 통과)
- `npm run lint` 통과
- `docker build -t webagentkr-web .` 성공
- `docker compose config` → 3개 서비스로 유효 파싱, **포트가 `127.0.0.1` 바인딩인지 확인**
- `0001_init.sql` → 로컬 Postgres(`docker run --rm -e POSTGRES_PASSWORD=x -p 5432:5432 postgres:16` + `psql -f`)에 적용, 테이블 + 트리거 + 정책 생성, 문법 오류 없음
- `lib/rateLimit.ts` — 6번째 호출이 `false` 반환, 윈도 경과 후 prune 동작 확인
- `lib/clientIp.ts` — `cf-connecting-ip`/`x-forwarded-for` 헤더에서 올바른 IP 추출 확인

---

## 스펙 결함 추적

전체 20건은 `CLAUDE.md`의 "Known spec defects" 표. 해소 위치:

| 결함 | 해소 단계 |
|---|---|
| #1 경쟁 조건 | 1.5 (라운드 2 반영) |
| #2 프록시 IP | 0.5 (`clientIp.ts`), 1.5, 4.6 |
| #3 웹훅 실패 | 1.5 (라운드 2 반영) |
| #4 포트 노출 | 0.6 |
| #5 익명 로그인 | 0.3 주석 + 사용자 작업 2 |
| #6·#7 누락 필드 | D1 → 0.0/0.3 |
| #8 태깅 위치 | D3 → 3.3 |
| #9 필드 매핑 | 0.3(difficulty), 2.5 |
| #10 선택지 값 | D2 → 0.5 (`options.ts`) |
| #11 upsert 키 | 0.3, 3.1 (라운드 2 반영) |
| #12 SUBMITTED | 2.1 |
| #13 중복 제출 | 1.6 (라운드 2 반영) |
| #14 P0/일정 불일치 | C2(약관 초안), 4.5 |
| #15 국외 이전 | **C1 해소** (국외이전 표 + 위탁 표, 인프라 전체) + 사용자 작업 1 |
| #16 env 분리 | 0.4, 0.6 |
| #17 Dockerfile | 0.1, 0.6 |
| #18 백업 플랜 | D5 → 4.5 |
| #19 Map 누수 | 0.5 |
| #20 CLI 플래그 | 0.1 |
| #21 스키마 타입 | 0.3 |
| #22 GA4 동의 | 3.9 |

---

## 관리 방식

- 이 파일(`task.md`)이 작업 추적의 단일 소스. 각 항목 완료 시 `[ ]`→`[x]`, 필요 시 하위에 `— 메모:` 로 결정·이탈 사항 기록.
- 페이즈 시작 시 해당 페이즈를 세부 태스크로 한 번 더 분해(필요하면 별도 계획 세션).
- 범위 변경은 이 파일에서 먼저 반영 후 착수.
- 스펙 결함을 새로 발견하면 `CLAUDE.md` 표에 추가하고 여기 추적표에 해소 단계를 지정.

## 변경 이력

- 2026-09-03: 초기 계획 작성. 범위 = Phase 0(1주차 기반 구성). AI 제공자 OpenAI 확정, 백엔드 서비스 미구성(로컬 우선).
- 2026-09-03: 전체 md 검토 반영. 스펙 결함 22건을 `CLAUDE.md`에 기록하고 각 페이즈에 해소 작업 배치. 선행 결정 5건을 `docs/decisions.md`로 분리. Phase 0에 `options.ts`/`clientIp.ts`/Dockerfile/포트 바인딩, Phase 1에 경쟁 조건·웹훅 실패·중복 제출 대응, Phase 3에 이용약관·태깅 위치 수정 추가.
- 2026-09-04: **D1~D5 전원 권장안대로 확정.** 진단 폼에 도입 목적·담당 인원 추가하고 현재 처리 방식 제거, 선택지 한글 라벨 저장, 서비스 태깅을 상담 시점 Next.js로, `difficulty` 컬럼 삭제, 백업은 Free + cron `pg_dump`. Phase 0 착수 가능 상태.
- 2026-09-04: **Phase 0 완료.** `create-next-app@latest`가 **Next.js 16.3.4 / React 19.2.8 / Tailwind v4 / zod 4.5**를 설치함(스펙·초기 계획의 "Next 15" 가정과 다름 — 스텁 수준에서는 영향 없음, `params`는 Promise·`PageProps`/`RouteContext`는 전역 생성 타입). shadcn 스타일 `base-nova`. 검증 결과: `next build` 성공(16 라우트), `eslint` 0건, `tsc --noEmit` 청정, `docker compose config` 유효(포트 `127.0.0.1` 바인딩 확인), `0001_init.sql`을 Postgres 16에 적용해 5테이블+RLS+정책6+트리거2 생성 및 CHECK/unique/트리거 동작 확인, `rateLimit`(6번째 차단·버킷 분리)·`clientIp`(cf 우선·xff 파싱·fallback) 유닛 통과. `git init` + 초기 커밋.
- 2026-09-04: **Phase 1을 라운드로 분할.** 라운드 1 = 랜딩 페이지만(1.1), 폼·API(1.2~1.7)는 라운드 2. 1.1을 `frontend-design`으로 구현 — 워크플로 스파인 + 히어로 파이프라인 컨셉, Pretendard+Plex Mono, 라이트 전용, RSC 전용. 결함 #13 방식을 `idempotencyKey` + `diagnoses` UNIQUE로 확정(마이그레이션 `0002`, 라운드 2). 랜딩의 TODO 문구(구축 절차·신뢰 요소·FAQ·사업자 정보)는 확정 대기.
- 2026-09-08: **Phase 2 완료·머지** (PR #2 → `main` `2d02c45`). 결과 파이프라인 Mock 우선 — 매핑 함수/픽스처, `GET /api/diagnoses/[id]`, `POST /api/dev/mock-result/[id]`, 폴링 아일랜드 + 6카드, frontend-design 패스. 최종 리뷰 Critical 0 → fix wave(`463f2fe`, 폴 겹침 방지·404 문구 분리·remount 가드) → 범위 재리뷰 clean. 실 DB 해피패스는 Supabase 연결 시 실측(미실행).
- 2026-09-08: **Phase 3 를 4묶음으로 분해.** A(상담 흐름) / C(법적 고지) / B(관리자) / D(GA4), 착수 순서 A→C→B→D. 각 묶음 자체 spec→plan→구현. A 부터 착수(브랜치 `feat/consultation-flow`), 상세는 위 Phase 3 섹션.
- 2026-09-08: **묶음 A(상담 흐름) 완료·머지** (PR #3 → `main` `21130a9`). `lib/serviceTagging.ts`, `POST /api/consultations`, 상담 폼(`?diagnosisId=` 프리필/직접 입력 2경로), 결과 페이지 상담 CTA. 최종 리뷰 opus Critical 0(I-1 클라이언트 검증·I-2 DB 조회 가드 반영). DB 통합 검증은 Supabase 연결 시(PR #3 본문 체크리스트).
- 2026-09-09: **묶음 C(법적 고지) 완료** (브랜치 `feat/legal-pages`). 개인정보처리방침(13절 + 국외이전·위탁 표) + 이용약관(10조 + 부칙) 초안, 공용 셸 `components/marketing/legal/`, 푸터 사업자 정보 라인, 진단 step5·상담 폼 "동의 간주" 문구 + 링크. 전부 `[확정 필요]` 플레이스홀더(전문가 검토는 사용자 몫 → Phase 4.7). 결함 #15 해소. `tsc`·`eslint`·`build` 0, Playwright 렌더 확인. DB·마이그레이션·env 무관.

### Phase 0 이탈·메모
- **Next 16** (계획은 15 가정). CNA가 `AGENTS.md`(Next 자동 생성, `next dev`가 재작성)를 만들며 `CLAUDE.md`를 `@AGENTS.md` 스텁으로 덮어써서 한글 `CLAUDE.md`를 복구하고 끝에 `@AGENTS.md` 임포트를 추가함.
- `app/page.tsx`(CNA 데모)는 제거하고 홈을 `app/(marketing)/page.tsx`로 이동(둘 다 `/`라 충돌).
- `#11`: `leads.email`에 `unique` + 형식 CHECK 추가. `POST /api/diagnoses`는 Phase 1에서 email 기준 **upsert**로 구현(재방문자 500 방지). 신규-상담-무진단 경로도 email upsert.
- `#21`: `consultations.preferred_date`는 D2-b가 날짜 아닌 선택지 버킷("가능한 빨리" 등)이 되어 `text`가 **정답** — 변경 없음. `diagnoses.website_status`는 다른 옵션 컬럼과 마찬가지로 CHECK 없이 zod/`options.ts`로만 강제(스펙 방침 유지, 라벨=계약 이중화 회피).
- `next.config.ts`에 `output: "standalone"`, `.gitignore`에 `n8n.env`/`!*.example` 규칙 추가.

### Phase 1 이탈·메모
- **후속 필요**: `lib/validation.ts`(Task 2)의 zod 스키마 필드 일부는 커스텀 한글 `error:` 메시지가 없어, 값이 zod 기본 규칙(타입 불일치 등)에 걸리면 영문 기본 메시지("Invalid input: expected string, received undefined")가 그대로 노출된다. 전화번호 정규식·`idempotencyKey` 등 일부 필드는 한글 메시지가 이미 있음. Task 8(스타일 전용 범위) 검토 중 발견됐으나 이번 9태스크 계획 어디에도 스코프가 없어 미착수 — "한글 전용" 원칙에 어긋나므로 `lib/validation.ts`에 한글 `error:`/`message:` 보강 필요.
- **알려진 한계 (결함 #11 / I3)**: `POST /api/diagnoses` 의 `leads` upsert 는 `onConflict: "email"` 이라 "마지막 연락처가 이긴다". 공용 메일함(`info@`·`ceo@`)으로 다른 사람이 재제출하면 `contact_name`·`phone`·`company_name` 이 덮어써져, 먼저 접수된 `diagnoses` 행이 다른 사람 연락처와 묶인다(관리자 화면 Phase 3 에서 그대로 노출). 스펙 §5.1 6단계·결함 #11 이 재방문자 500 방지를 위해 이 방식을 명시하므로 MVP 는 유지 — post-MVP 에서 `leads` append-only + 리포트 계층 email 디둡으로 재검토. 최종 리뷰에서 docs-only 로 확정(쿼리 변경 없음).
- **되돌림 (최종 리뷰 m8)**: SDD 원장 Ruling 1 로 추가했던 `tsx` devDependency 를 소비처가 없어 제거(`npm uninstall tsx`). 일회성 테스트는 계획대로 `node --experimental-strip-types` 를 쓰고 `_wak_*.mts` 는 사용 후 삭제됐으므로 `tsx` 는 죽은 의존성이었음.
