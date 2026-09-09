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
- [~] Phase 2 — 3주차: 결과 파이프라인 (Mock 우선)  — 2.1~2.5 완료·머지 (PR #2, 2026-09-08). **2.6~2.9 = Phase B: 워크플로우 JSON 초안 작성됨** (`n8n/workflows/*.json` + `SETUP.md`, 2026-09-09) — n8n 인스턴스에서 import + 실행 검증 필요
- [~] Phase 3 — 4주차: 상담 + 관리자 + 법적 고지 + GA4  — 착수 순서 A→C→B→D. **묶음 A~D 전부 완료·머지** (2026-09-09). 남은 것은 Phase B(실 n8n)뿐 — 별도 트랙
  - [x] 묶음 A 상담 흐름 — 머지 (PR #3 `21130a9`). **실 Supabase DB 통합 검증 완료 (2026-09-09, 26/26 pass)** — Phase 2 후속 검증도 함께 통과
  - [x] 묶음 C 법적 고지 — 머지 (PR #4 `a19d28f`, 2026-09-09). 개인정보처리방침·이용약관 초안 + 링크 배선. `[확정 필요]` → Phase 4.7
  - [x] 묶음 B 관리자 화면 — 머지 (PR #7, 2026-09-09). SSR 세션 게이트(`proxy.ts`) + 로그인 + 상담 목록/상세/상태전이/메모 + 진단 상세. 별도 API 없음(RLS `authenticated` 직접 조회). SDD 서브에이전트 실행 + opus 최종 리뷰(Critical 1·Important 6 반영). 실 Supabase(리전 서울) B7 검증 13/13.
  - [x] 묶음 D GA4 — 머지 (PR #8 `fe6cdfb`, 2026-09-09). 분석 쿠키 동의 배너(옵트인) + 조건부 gtag.js + `track()` 동의 가드 + 푸터 "쿠키 설정" 철회. 이벤트 호출부 6종은 이미 존재 → 감사만(코드 무변경). 결함 #22 해소. `tsc`·`eslint`·`build` 0, Playwright 8경로. 마이그레이션·DB 무관
  - [~] Phase B (`task.md` 2.6~2.9) — 워크플로우 JSON 초안 커밋됨(`feat/n8n-workflows`). 남은 것: n8n 2.x 에 import + credential 4개 + 실행 검증 (`n8n/workflows/SETUP.md`)
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
   - [x] `supabase/migrations/0001_init.sql` (2026-09-09 적용 확인 — 5테이블+RLS)
   - [x] `supabase/migrations/0002_diagnoses_idempotency.sql` (2026-09-09 적용 확인 — `diagnoses.idempotency_key` 존재). ~~없으면 모든 진단 제출 500~~
   - [x] 프로젝트 리전 = **Northeast Asia (Seoul) / `ap-northeast-2`** (2026-09-09 확인, 기획서 §15.2 권장대로).
     데이터가 서울에 저장됨 → privacy 국외이전 표 Supabase 행: 국가 = 대한민국, 단 수탁자(Supabase Inc.) 본사는 미국 →
     "국외 이전 해당 여부"는 변호사 검토 사항(Phase 4.7). `[리전 확정 필요]` placeholder 는 "대한민국(서울)" 로 교체 가능.
2. Supabase Auth 비활성화 — **완료·검증 (2026-09-09)** = 묶음 B의 B1:
   - [x] 익명 로그인 비활성화 (`anonymous_provider_disabled`)
   - [x] 이메일 회원가입 비활성화 (`signup_disabled` — `POST /auth/v1/signup` 이 이메일·익명 모두 422 거부)
   - [x] 관리자 계정 1개만 존재 (`manizu2424@gmail.com`). probe 유저 삭제 확인. (+2FA 후순위)
3. Telegram 봇 생성(BotFather) → 토큰/chat id — [x] `@webagentkrbot` + ADMIN chat id, `.env` 반영 (2026-09-09 확인)
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
- [~] 2.6 n8n 워크플로우 구성(기술 스펙 §6) — **`n8n/workflows/diagnosis-pipeline.json` 초안** (`feat/n8n-workflows`, 2026-09-09). Webhook(Header Auth `x-webhook-secret`, `responseMode: onReceived` 즉시 응답) → Code(프롬프트 조립, gpt-4o, §7.3 스키마 strict) → HTTP Request OpenAI(`onError: continueErrorOutput` + retry 3) → Code(6필드 + priorityTasks 3~5 + enum 검증 → DB 컬럼 매핑) → IF → 성공(`diagnosis_results` insert + `diagnoses` COMPLETED + Telegram) / 실패·에러(FAILED + `[진단 실패]` Telegram). **n8n 인스턴스에서 import + 실행 검증 필요** — `n8n/workflows/SETUP.md`
- [~] 2.7 Error Trigger 워크플로우 → `TELEGRAM_ERROR_CHAT_ID` — **`n8n/workflows/error-trigger.json` 초안**. Error Trigger → Telegram(워크플로우명·노드·에러·실행 URL). n8n Settings 에서 Error Workflow 로 지정
- [~] 2.8 워크플로우 JSON export → 초안 2개 커밋됨. 인스턴스에서 조정 후 Download 로 덮어써 재커밋
- [ ] 2.9 필드 단계적 안정화 — 현재 초안은 6필드 전부 강제(strict). 검증 실패율 높으면 핵심 4개로 축소(기획서 §9.3)

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
- ~~**머지 후 필수 후속**: Supabase 연결 환경에서 3경로 실측~~ → **2026-09-09 완료** (아래 "실 DB 검증" 참고).
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

### 묶음 A + Phase 2 — 실 DB 검증 (2026-09-09)

사용자가 Supabase 프로젝트 생성(리전 = **서울 `ap-northeast-2`**) + `0001`·`0002` SQL 실행 + `.env`(Supabase 3키 + Telegram 3키, `N8N_WEBHOOK_URL` 공란) 완료. `npm run dev` 로 실 DB·실 Telegram 상대 검증. **26/26 pass.**

- **셋업 사전확인**: 5테이블 존재 · `diagnoses.idempotency_key` 존재(0002) · anon 키로 `leads` 읽기 차단(RLS 정책 없음) · service-role 유효 · Telegram 봇 `@webagentkrbot` + `TELEGRAM_ADMIN_CHAT_ID` 유효(테스트 메시지 도달).
- **셋업 함정**: `NEXT_PUBLIC_SUPABASE_URL` 에 처음 `.../rest/v1/` 가 붙어 모든 DB 호출이 `PGRST125` (경로 이중). Settings > API 의 **Project URL**(`https://<ref>.supabase.co`) 만 넣어야 함 — `.env.example` 에 주석 추가.
- **Phase 2**: `POST /api/diagnoses` → `PROCESSING`(webhook skip) → `POST /api/dev/mock-result/<id>` → `GET` `COMPLETED` + result 6필드 + `diagnosis_results` 1행 / `?outcome=failed` → `FAILED` + 결과행 0 / 없는 uuid → `GET` 404 / 같은 `idempotencyKey` 재제출 → 같은 `diagnosisId` + `leads` 1행. 결과 페이지: 6카드·`FailedNotice`·`?_test_maxAttempts=2` timeout·notfound 뷰 전부 Playwright 렌더 확인.
- **묶음 A**: `diagnosisId` 경로 → `consultations.lead_id == diagnoses.lead_id`(재사용), `status=NEW`, `suggested_service_type` 5종 CHECK 통과(픽스처+`websiteStatus=없음` → `Smart Website`) / 없는 uuid → 404 `diagnosis_not_found` / FAILED 진단(결과행 없음) → insert OK, 태그 `null` / 직접 경로 email upsert → 재제출 시 `leads` 1행 유지·마지막 쓰기 승·상담 2건 / 동의 누락 → 400 / 허니팟 → 200 무저장 / rate limit 6회째 429(스크립트 연속 호출로 확인, dev 재시작 시 Map 초기화도 확인). 폼 성공 화면 2 variant(프리필·직접) Playwright 확인.
- **Telegram (dev 머신에서 검증 불가)**: 사용자 텔레그램에는 `curl` 테스트 메시지만 도착, 앱이 보낸 `[신규 상담]`·`[진단 실패]` 는 **미도착**.
  원인 = 이 dev 머신의 **IPv6 라우팅 문제** — Node `fetch`(= `sendTelegram`)가 IPv6 주소 시도 후 IPv4 폴백 실패(`ETIMEDOUT`), `curl`/Node core `https` `family:4` 는 성공.
  봇 토큰·chat id·메시지 형식은 `curl` 실전송으로 확인됨. **Contabo VPS(정상 네트워크)에서는 동작.** 문구·PII 경계는 그때 육안 확인.
  → 부수 결함: `sendTelegram` 이 fetch throw 를 로그 없이 삼켜 실패가 안 보임 → **PR #6 (`fix/telegram-error-logging`)** 로 catch+`console.error` 추가.
- **정리**: 검증 중 생성한 모든 DB 행 삭제(`*@verify.test` 기준) — 5테이블 전부 0행 복귀. 프로덕션/실사용 데이터 아님. (auth probe 유저는 삭제 권한 막혀 사용자 몫 — 위 "Phase 0 이후" 2번 참고)
- 스크립트: `scratchpad/{check-supabase,verify,inspect,cleanup,auth-check}.mjs` 등 (일회성, 리포 밖).

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

- [x] **B1 사전 조건(사용자 작업)** — Supabase Auth 이메일 가입 + 익명 로그인 **둘 다 비활성화** + 관리자 계정 1개
      (`manizu2424@gmail.com`). 2026-09-09 API 검증 완료(`signup_disabled` / `anonymous_provider_disabled`, 유저 1). 코드 불가. (검증용 `verify-admin@webagent.test` 는 `scratchpad/` 스크립트로 생성 후 삭제)
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
- 검증: build/lint/tsc 0, Playwright(로그인·목록·필터·상세·상태·메모·404·리다이렉트), Supabase REST 단언(service-role). 검증용 관리자(`verify-admin@webagent.test`) + 시드 상담/진단은 `scratchpad/` 스크립트로 생성 후 삭제. **verify-admin auth 유저는 사용자가 대시보드에서 삭제 완료(2026-09-09).**
- frontend-design 패스 없음(내부 도구, `--wak-*` 토큰만).

### 묶음 B 최종 전체 브랜치 리뷰 (SDD, base `a19d28f` → head `f57b5df`, 2026-09-09)

서브에이전트 방식 실행(태스크별 구현+리뷰 7회, 정오표/픽스 커밋 포함) → 최종 전체 리뷰(opus).

- **최종 리뷰 결과: Critical 1 + Important 6.** 인증 아키텍처(proxy 쿠키 전파·3-클라이언트 분리·RLS 의존 읽기 경로 — 미인증 유출/서비스롤 누출 없음)는 견고 판정. 전부 fix wave 커밋 4개(`46d8b6b`·`b3c3c43`·`fe03fd2`·`f57b5df`)로 반영, 스코프 재리뷰 clean.
  - **C-1** 커밋된 plan 문서에 검증 계정 평문 비번 → 문서 redact. 사용자가 `verify-admin@webagent.test` 계정 삭제(무효화 완료). 미push 브랜치라 히스토리 재작성은 생략(무효 시크릿).
  - **I-1** server action(`actions.ts`)에 자체 `getUser()` 가드 추가 — Next 16 `proxy.md`가 "Server Function은 proxy 체인 밖, 각자 인가 확인"을 명시. 세션 없으면 `{error:"세션이 만료…"}`.
  - **I-2** 0행 `.update()`가 `{ok:true}` 반환하던 것 → `.select("id").maybeSingle()` 후 `!data` 시 `{error:"저장 대상을 찾지 못했습니다."}`.
  - **I-3** `layout.tsx` 세션 분기가 "방어"라던 주석·스펙(§3.3·B-b) → "셸 분기용, 실 방어는 RLS + action 가드"로 정정. 동작 불변.
  - **I-4** `lib/kst.ts` 신규 — `created_at.slice(0,10)`·`todayStartIso()`가 UTC 날짜라 독일 VPS에서 KST 0~9시 접수분이 전날로 표시되던 것을 KST 기준으로 교정(목록·상세·요약 줄).
  - **I-5** `status-select`/`memo-editor`의 action 호출을 try/catch로 감싸고 `app/admin/error.tsx`(에러 바운더리) 신규 — 세션 만료 중 저장 시 전체 페이지 크래시(메모 유실) 방지. 로그인/로그아웃 `signInWithPassword`/`signOut`도 try/catch(+`finally`).
  - **I-6** `diagnoses/[id]` 결과 매핑을 `lib/diagnosisResult.ts`의 `toApiResult`(가드 내장) 재사용으로 교체 — 로컬 `as unknown as` 낙관 캐스팅 제거, AI↔DB↔API 계약 단일 소스. 2번째 쿼리 `error` vs null 도 구분.
  - **§6** 비-uuid id(`/admin/consultations/abc`)가 일반 오류 화면으로 빠지던 것 → `z.uuid().safeParse` 후 `notFound()`.
- **의도적으로 deferred 유지(머지 차단 아님, post-MVP)**: `Object.hasOwn` 필터 가드, "저장됨" 메시지 자동 소멸, `revalidatePath` 원본 id, `Field`/`Section` 헬퍼 2중 정의, `text-white` 토큰(마케팅·상담 버튼 관행), 목록 `.limit()` 상한, RSC 조회 오류 `console.error` parity, 뱃지-only 링크 a11y, 로그인 오류 `role="alert"`.
- **판정 이탈(SDD ruling)**: `PageProps<>`/`LayoutProps<>` 전역 타입 대신 인라인 prop 타입 사용 — plan Global Constraint가 금지했으나 리포의 다른 라우트는 생성 타입을 씀. tsc-clean이라 머지 차단 아님, post-MVP 정합. `middleware.ts`→`proxy.ts`는 Next 16 강제(정오표로 문서화).
- **DB 통합 검증은 실 Supabase(리전 서울)로 수행함** — B7 체크리스트 13/13 통과(미인증 리다이렉트, 로그인 실패/성공, anon RLS 차단, 필터 4종, 상세 2경로, 404, 상태 전이 DB 반영, 메모 저장/프리필, 진단 상세 COMPLETED/FAILED, 실 브라우저 로그아웃 재게이트). 검증 데이터 전량 삭제·시드 원상복구.
- **머지 후 후속**: 없음(이 묶음은 스키마·env 무변경). CLAUDE.md 결함 #5(익명 로그인=`authenticated`)가 이 콘솔의 유일한 인가 전제이므로, Supabase Auth 설정을 배포 전 자동 확인 스크립트로 승격 권장(Phase 4).

### 묶음 D — GA4  (마지막 · 브랜치 `feat/ga4`, 2026-09-09)

- [x] **D1 쿠키/분석 동의 UI** (구 3.9 · 결함 #22, 스펙 미정의) — 하단 고정 비-모달 배너(`동의`/`거부`), `localStorage` `wak.analyticsConsent`. 미결정=거부와 동일(로드 없음, 배너 계속). 개인정보처리방침 §11 계약대로 옵트인.
- [x] **D2 gtag.js 조건부 로드** — `consent==="granted"` **그리고** `NEXT_PUBLIC_GA4_MEASUREMENT_ID` 있을 때만 `next/script` 주입(동의 클릭 시 리로드 없이 라이브). 철회 시 `window['ga-disable-<ID>']=true` + `track()` 동의 가드로 즉시 정지. `/admin/*`·env 미설정 시 배너·스크립트 없음.
- [x] **D3 이벤트 배선 확인** (구 3.8 · §9 표) — 6종 전부 §9 위치와 일치, 코드 변경 없음. `step5_complete` 부재는 의도(5단계는 제출, `state.step>prev` 안 됨 — 기획서 §14.4 목록과도 일치).
- [x] **D4 검증** — `tsc`·`eslint`·`build` 0. Playwright 8경로: 신규 로드(배너·gtag 없음) / 동의(배너 사라짐·gtag 라이브·`dataLayer`) / 리로드 지속 / 거부 지속(gtag 없음·`track()` 무발화) / 푸터 "쿠키 설정" 재호출 / 철회 `ga-disable` / `/admin` 완전 제외 / env 미설정 배너 숨김·링크 no-op.

### 묶음 D 이탈·메모 (2026-09-09)

- **bounded 경로.** 동의 모델이 이미 병합된 개인정보처리방침 §11(옵트인)로 법적 고정, `track()` 가 이미 `window.gtag` 가드, 범위가 좁아 spec/plan 문서 없이 채팅 설계안 승인 → 바로 구현.
- **동의 모드(Consent Mode v2) 아님.** 개인정보처리방침이 "동의한 경우에만 로드"라 gtag.js 자체를 동의 전 미주입. `consent:'denied'` 기본값으로 항상 로드하는 Google 권장 패턴은 문구와 충돌.
- **상태 저장** = `localStorage` 키 `wak.analyticsConsent` (`granted`/`denied`, 없으면 미결정). `useSyncExternalStore`로 구독(같은 탭 커스텀 이벤트 + 다른 탭 `storage`). `set-state-in-effect` lint 회피 목적(마운트 후 localStorage 읽기).
- **철회 UX** = 푸터 "쿠키 설정" 링크(`CookieSettingsLink`)가 `wak:consent-reopen` 이벤트로 배너 재호출. 마케팅 레이아웃 푸터에만 있어 `/diagnosis`·`/consultation`(푸터 없음)에서는 노출 안 됨 — 설계 시 수용(재방문은 마케팅 페이지 경유).
- **granted→denied 세션 중** = `window['ga-disable-<ID>']=true` + `track()` 동의 가드. 강제 리로드 안 함. gtag 객체는 남지만 수집 중단.
- **범위 밖(권장대로 유지)**: Microsoft Clarity → Phase 4.4. 동의 게이트/배너는 나중에 Clarity 도 같은 스위치에 물릴 수 있게 범용 설계(현재는 GA4 전용 주입만).
- **`.env`** `NEXT_PUBLIC_GA4_MEASUREMENT_ID` 미설정 시 배너 자체를 숨김(로드할 게 없으면 동의 물을 이유 없음). `.env.example` 에 주석 추가.
- **검증 방법**: `NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-TEST12345 npm run dev` 로 gtag 로드 경로 확인, 미설정 dev 로 배너 숨김 확인. 실 GA4 속성 없이 스크립트 주입·`dataLayer`·`ga-disable` 플래그까지만 확인 — 실제 GA4 대시보드 수신은 배포 후 사용자 육안.

### 의존성
- **A → C → B → D**. C 는 짧고 A 상담 폼 동의 문구가 C 링크 필요. B 는 B1(사용자 Supabase 설정) 선행, A·C 데이터 있으면 검증 쉬움. D 는 A 이벤트 호출부가 있어야 §9 표 완결.
- A·C·D 는 이 개발 환경에서 코드만으로 진행 가능(DB 통합 검증만 Supabase 연결 시).

---

## Phase 4 — 지속 (P1): 출시 마무리

- [ ] 4.1 고객 결과 이메일 발송(Resend)
- [ ] 4.2 자동화 사례 상세 페이지
- [ ] 4.3 MDX 블로그 3개(신뢰 자료 목적, 기획서 §13)
- [x] 4.4 SEO 메타데이터, `sitemap`, `robots.txt`, Open Graph, Microsoft Clarity — 브랜치 `feat/seo` (2026-09-09, bounded).
  `lib/siteMeta.ts`(SITE_URL + `pageMetadata()` 헬퍼) · `app/{sitemap,robots,opengraph-image,icon}.ts(x)` · 루트+페이지별 `metadata`
  (홈 JSON-LD Organization+WebSite) · per-user 결과/스텁/`/admin` noindex · Clarity 를 `analytics-consent.tsx` 동의 게이트에 배선
  (`NEXT_PUBLIC_CLARITY_PROJECT_ID`, 철회 시 `clarity("stop")`) · privacy §6·§7·§11 에 Microsoft(미국) 행 추가(초안 → 4.7 검토).
  `tsc`·`eslint`·`build` 0, curl/Playwright 검증. **`NEXT_PUBLIC_SITE_URL` 배포 시 설정 필요**(폴백 `https://webagent.kr`). 상세는 "4.4 이탈·메모".
- [ ] 4.5 Contabo Docker 실제 배포 + **DB 백업 (D5: Free + cron `pg_dump` 일 1회, 7일 로테이션, 오프사이트 복사)** — P0 항목이므로 출시 전 완료 필요(결함 #14, #18)
  - **복원 절차까지 실제로 검증**해야 완료 처리. 첫 계약 성사 시 Supabase Pro 전환.
- [~] 4.6 출시 전 QA 체크리스트(기획서 §17.2) → **`docs/qa-checklist.md`** 로 상세화 (브랜치 `feat/qa-checklist`, 2026-09-09).
  각 항목을 트리거 방법·절차·기대 결과·결과 기록란 + 환경 태그(`[로컬]`/`[로컬+DB]`/`[배포]`/`[배포+n8n]`/`[실기기]`)로 확장.
  A 퍼널 happy path·B 검증/스팸·C 실패 경로(결함 #1·#2 회귀 포함)·D Telegram·E 반응형·F 관리자·G SEO/분석.
  - **로컬 사전 검증 13항목 실행** (dev + 실 Supabase 서울, `*@qa.test` 테스트 행 생성 후 전량 삭제): 11 PASS.
    - ~~B5 FAIL — 진단 폼 필수값 미입력 시 영문 zod 메시지~~ → **해결** (`fix/validation-korean-messages`, 2026-09-09). `lib/validation.ts` `opt()` 에 `SELECT_MSG` 맵 + `requiredText()` 헬퍼. 재검증 후 B4·B5 PASS.
    - ⚠️ DB 잔여 시드 발견 — 묶음 B 검증 시드(`admin-verify-A/B@webagent.test`, 03:41 생성)가 미삭제. 출시 전 정리.
  - 나머지(모바일 실기기·Telegram 3종·프록시 IP·관리자·SEO 라이브)는 배포 후 문서 따라 실행.
- [ ] 4.7 법적 페이지 `[확정 필요]` 채우기 (묶음 C 초안 → 실값) + **변호사·노무사 검토** — 출시 전 필수:
  - 사업자 정보: 상호 · 대표자 · 사업자등록번호 · 통신판매업신고번호 · 주소 · 이메일 (`site-footer.tsx` + privacy §12/§13)
  - 개인정보 보호책임자(성명·직책·이메일), 보유기간(진단·상담 / 자동 생성 정보)
  - **Supabase 리전** = 서울 `ap-northeast-2` 확정(2026-09-09) → privacy 국외이전 표 `[리전 확정 필요]` 를 "대한민국(서울)" 로 교체 +
    데이터는 국내 저장·수탁자 본사는 미국 → "국외 이전 해당 여부" 자체를 변호사가 판단(표에 남길지/위탁 표로 옮길지)
  - 시행일: 개인정보처리방침 · 이용약관 / 이용약관 관할 법원
  - **Microsoft Clarity 국외 이전**(4.4 에서 추가) — privacy §6 위탁 표·§7 국외이전 표에 `Microsoft Corporation`(미국) 행 초안 반영됨. 변호사 검토 대상.

### 4.4 이탈·메모 (2026-09-09)

- 브랜치 `feat/seo`. bounded 경로(spec/plan 문서 없음). 마이그레이션·DB 무관.
- **신규**: `lib/siteMeta.ts`(`SITE_URL` 폴백 `https://webagent.kr`, `pageMetadata({title,description,path,index})` 헬퍼 — canonical·OG·twitter 단일 소스, `OG_IMAGE` 상수), `app/sitemap.ts`(5 URL), `app/robots.ts`(`Disallow: /admin/`·`/api/` + `Sitemap`·`Host`), `app/opengraph-image.tsx`(`ImageResponse` 1200×630, @vercel/og 번들 폰트가 라틴 전용이라 **워드마크+라틴 문구만** — 한글 태그라인 tofu 회피), `app/icon.tsx`(32×32 "W" 모노그램).
- **수정**: `app/layout.tsx`(`metadataBase`, `title` 템플릿 `%s · WEBAGENT.KR`, 기본 OG/twitter/robots), 홈·`/diagnosis`·`/consultation`·`/privacy`·`/terms` 페이지별 `metadata`, 홈에 `Organization`+`WebSite` JSON-LD 인라인, `/diagnosis/[id]`·`/about`·`/cases`·`app/admin/layout.tsx` → `robots: noindex,nofollow`.
- **OG 이미지 자동 병합 함정**: 루트에 `openGraph` 를 명시하면 `app/opengraph-image.tsx` 자동 이미지가 병합 안 됨(특히 route group `(marketing)`). → `OG_IMAGE` 를 `openGraph.images`/`twitter.images` 에 **명시적으로** 넣어 해결.
- **`title: undefined` 함정**: `pageMetadata` 가 `title` 키를 undefined 로라도 넘기면 레이아웃 `title.default` 폴백이 안 걸림 → 홈에 `<title>` 누락. `title` 있을 때만 스프레드하도록 수정.
- **Clarity** = `analytics-consent.tsx` 에 GA4 와 나란히 배선. `NEXT_PUBLIC_CLARITY_PROJECT_ID` 있을 때만, 동의 시에만 주입. 철회 시 `window.clarity?.("stop")`(GA4 는 `ga-disable` 플래그). 배너 문구는 설정된 도구만 나열(둘 다면 "A와 B"). `/admin`·둘 다 미설정 시 배너·스크립트 없음.
- **검증**: `tsc`·`eslint`·`build` 0. curl(`/robots.txt`·`/sitemap.xml`·`/` head·`/diagnosis`·`/privacy`·noindex 페이지들·`/opengraph-image` 200 image/png). Playwright(동의 전 배너+스크립트 없음 / 동의 시 GA4+Clarity 라이브 주입 / `/admin` 미주입). standalone 서버는 `.next/static` 미서빙이라 asset 404 — HTML/메타는 정상(로컬 실행 아티팩트).
- **배포 시**: `.env` 에 `NEXT_PUBLIC_SITE_URL`(실 도메인), `NEXT_PUBLIC_CLARITY_PROJECT_ID`(clarity.microsoft.com 발급) 설정. 미설정이어도 빌드·동작은 정상(각각 폴백/휴면).
- **범위 밖(의도)**: `/cases` 는 4.2 구현 후 sitemap 추가. `/about` 은 스텁이라 noindex 유지(4.x 에서 구현 시 해제). OG 이미지 한글화는 폰트 번들 시 후속.

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
| #5 익명 로그인 | 0.3 주석 + B1 (2026-09-09 검증: 익명·이메일 가입 모두 비활성 확인) |
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
| #22 GA4 동의 | **묶음 D 해소** — 옵트인 동의 배너 + 동의 전 gtag 완전 미주입 |

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
- 2026-09-09: **묶음 C(법적 고지) 완료·머지** (PR #4 → `main` `a19d28f`). 개인정보처리방침(13절 + 국외이전·위탁 표) + 이용약관(10조 + 부칙) 초안, 공용 셸 `components/marketing/legal/`, 푸터 사업자 정보 라인, 진단 step5·상담 폼 "동의 간주" 문구 + 링크. 전부 `[확정 필요]` 플레이스홀더(전문가 검토는 사용자 몫 → Phase 4.7). 결함 #15 해소. `tsc`·`eslint`·`build` 0, Playwright 렌더 확인. DB·마이그레이션·env 무관.
- 2026-09-09: **묶음 A + Phase 2 실 DB 검증 완료.** 사용자가 Supabase 프로젝트 + `0001`·`0002` + `.env`(Supabase/Telegram) 세팅. `npm run dev` 로 실 DB·실 Telegram 상대 검증 **26/26 pass** (Phase 2 결과 파이프라인 4뷰 + 멱등성, 묶음 A 7체크 + 동의/허니팟/rate limit). 상세는 위 "묶음 A + Phase 2 — 실 DB 검증". Telegram 문구·PII 경계 최종 육안 확인은 사용자 몫. 검증 데이터 정리 완료(전 테이블 0행). `.env.example` 에 `NEXT_PUBLIC_SUPABASE_URL` 주석 추가.
- 2026-09-09: **묶음 B(관리자 화면) 완료·머지** (PR #7 → `main`, base `a19d28f` → head `f57b5df`). SSR 인증 게이트(`proxy.ts` + `lib/supabase/session-client.ts`) + 로그인 + 상담 목록/상세(상태 전이·메모 server action) + 진단 상세(읽기 전용). 전용 API 없이 RLS `authenticated` 직접 조회. SDD 서브에이전트 실행(7 태스크, 각 구현+리뷰) + opus 최종 전체 리뷰 → Critical 1(문서 내 검증계정 평문 비번 — 계정 삭제·redact) + Important 6(server action 인가 가드·0행 저장 실패·layout 방어 표현·KST 날짜·에러 바운더리·`toApiResult` 재사용) 반영, 스코프 재리뷰 clean. 실 Supabase(리전 서울) B7 검증 13/13. 마이그레이션·env·스키마 무변경. 상세는 "묶음 B 최종 전체 브랜치 리뷰".
- 2026-09-09: **묶음 D(GA4) 완료·머지** (PR #8 → `main` `fe6cdfb`). bounded 경로(spec/plan 문서 없음, 채팅 설계안 승인 후 구현). `lib/consent.ts`(localStorage + 커스텀 이벤트) + `components/analytics/{analytics-consent,cookie-settings-link}.tsx` + `lib/analytics.ts` `track()` 동의 가드 + 루트 레이아웃 마운트 + 푸터 링크. 옵트인(개인정보처리방침 §11 계약), 동의 전 gtag 완전 미주입, `/admin`·env 미설정 제외, 철회는 `ga-disable` 플래그로 리로드 없이. D3 이벤트 감사 결과 6종 전부 §9 위치 일치 → 호출부 코드 무변경. `tsc`·`eslint`·`build` 0, Playwright 8경로 통과. 결함 #22 해소. 마이그레이션·DB 무관. Clarity 는 Phase 4.4 유지. 상세는 "묶음 D 이탈·메모".
- 2026-09-09: **Phase 4.4 SEO 완료·머지** (PR #9 → `main` `fe6cdfb`→`5cff12b`). `lib/siteMeta.ts` + `app/{sitemap,robots,opengraph-image,icon}` + 페이지별 metadata + 홈 JSON-LD + per-user/스텁/`/admin` noindex + Microsoft Clarity 를 동의 게이트에 배선 + privacy §6·§7·§11 Microsoft 행(초안→4.7). 상세는 "4.4 이탈·메모".
- 2026-09-09: **Phase 4.6 QA 체크리스트 준비·머지** (PR #10 → `main` `2e45567`). `docs/qa-checklist.md` — §17.2 를 환경 태그·트리거 명령·기대 결과로 상세화. 로컬 사전 검증 13항목 → 11 PASS + B5 FAIL(zod 영문 메시지) + DB 잔여 시드 발견.
- 2026-09-09: **zod 한글 메시지 수정** (`fix/validation-korean-messages`, 4.6 B5 후속). `lib/validation.ts` `opt()` 에 `SELECT_MSG` 필드별 맵 + `requiredText()` 헬퍼, `phone`/`email` constructor `error`. 진단 14필드 + 상담 스키마 누락·형식오류·enum오류 전부 한글화. Playwright(진단 폼 1단계) + curl 재검증 → B4·B5 PASS. Phase 1 이탈·메모의 미착수 항목 해소. `tsc`·`eslint`·`build` 0.
- 2026-09-09: **Phase B n8n 워크플로우 초안** (`feat/n8n-workflows`). `n8n/workflows/diagnosis-pipeline.json`(10노드: Webhook→Code→OpenAI HTTP(gpt-4o, §7.3 strict)→Code 검증/매핑→IF→성공/실패 분기) + `error-trigger.json` + `SETUP.md`(credential 4개·env 2개·import·검증·흔한 조정). n8n 2.x 대상, 손으로 작성 — 인스턴스 import 후 조정·검증 남음. Mock(`mock-result`)은 `N8N_WEBHOOK_URL` 설정 전까지 계속 대역.

### Phase 0 이탈·메모
- **Next 16** (계획은 15 가정). CNA가 `AGENTS.md`(Next 자동 생성, `next dev`가 재작성)를 만들며 `CLAUDE.md`를 `@AGENTS.md` 스텁으로 덮어써서 한글 `CLAUDE.md`를 복구하고 끝에 `@AGENTS.md` 임포트를 추가함.
- `app/page.tsx`(CNA 데모)는 제거하고 홈을 `app/(marketing)/page.tsx`로 이동(둘 다 `/`라 충돌).
- `#11`: `leads.email`에 `unique` + 형식 CHECK 추가. `POST /api/diagnoses`는 Phase 1에서 email 기준 **upsert**로 구현(재방문자 500 방지). 신규-상담-무진단 경로도 email upsert.
- `#21`: `consultations.preferred_date`는 D2-b가 날짜 아닌 선택지 버킷("가능한 빨리" 등)이 되어 `text`가 **정답** — 변경 없음. `diagnoses.website_status`는 다른 옵션 컬럼과 마찬가지로 CHECK 없이 zod/`options.ts`로만 강제(스펙 방침 유지, 라벨=계약 이중화 회피).
- `next.config.ts`에 `output: "standalone"`, `.gitignore`에 `n8n.env`/`!*.example` 규칙 추가.

### Phase 1 이탈·메모
- ~~**후속 필요**: `lib/validation.ts` zod 필드 일부에 한글 `error:` 없어 영문 기본 메시지 노출~~ → **해결** (`fix/validation-korean-messages`, 2026-09-09, 4.6 QA 에서 재확인 후). `opt()` 헬퍼에 필드별 `SELECT_MSG` 맵 + `requiredText()`(누락·빈값·초과 한글) 헬퍼, `phone`/`email` 에 constructor `error` 추가. 진단 14필드 + 상담 스키마 누락/형식오류/enum오류 전부 한글. 진단 폼 1단계 Playwright 재확인. `tsc`·`eslint`·`build` 0.
- **알려진 한계 (결함 #11 / I3)**: `POST /api/diagnoses` 의 `leads` upsert 는 `onConflict: "email"` 이라 "마지막 연락처가 이긴다". 공용 메일함(`info@`·`ceo@`)으로 다른 사람이 재제출하면 `contact_name`·`phone`·`company_name` 이 덮어써져, 먼저 접수된 `diagnoses` 행이 다른 사람 연락처와 묶인다(관리자 화면 Phase 3 에서 그대로 노출). 스펙 §5.1 6단계·결함 #11 이 재방문자 500 방지를 위해 이 방식을 명시하므로 MVP 는 유지 — post-MVP 에서 `leads` append-only + 리포트 계층 email 디둡으로 재검토. 최종 리뷰에서 docs-only 로 확정(쿼리 변경 없음).
- **되돌림 (최종 리뷰 m8)**: SDD 원장 Ruling 1 로 추가했던 `tsx` devDependency 를 소비처가 없어 제거(`npm uninstall tsx`). 일회성 테스트는 계획대로 `node --experimental-strip-types` 를 쓰고 `_wak_*.mts` 는 사용 후 삭제됐으므로 `tsx` 는 죽은 의존성이었음.
