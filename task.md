# WEBAGENT.KR MVP — 전체 개발 계획 / 작업 관리

> Living document. 작업 진행에 따라 체크박스 갱신·메모 추가·범위 조정.
> 근거 문서: `개발자용_통합_MVP_기획서.md`(제품·사업), `개발_착수_기술_스펙.md`(구현), `CLAUDE.md`(구현 지침·스펙 결함 목록), `decisions.md`(미결 결정).

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
> 그중 사용자 결정이 필요했던 **5건(D1~D5)은 2026-09-04 전원 확정** — `decisions.md` 참조.

**D1~D5 확정 요약** (Phase 0에서 반영):
- **D1** `diagnoses`에 `purpose`(도입 목적)·`staff_count`(담당 인원) 추가, **현재 처리 방식은 폼에서 제거**
- **D2** 선택지는 한글 라벨 저장 + `lib/options.ts` 단일 정의 (`decisions.md` D2-b 목록 그대로)
- **D3** 서비스 태깅은 **상담 신청 시점 Next.js**(`lib/serviceTagging.ts`), n8n 아님
- **D4** `diagnosis_results.difficulty` **컬럼 삭제**
- **D5** Supabase **Free + cron `pg_dump`**, 첫 계약 성사 시 Pro 전환

## 현재 상태

- [x] **결정 확정** — `decisions.md` D1~D5 (2026-09-04, 전원 권장안대로)
- [x] Phase 0 — 1주차: 기반 구성  (2026-09-04 완료 · 검증 통과 · 커밋 완료)
- [ ] Phase 1 — 2주차: 랜딩 + 진단 폼  ← **다음 착수 대상**
- [ ] Phase 2 — 3주차: 결과 파이프라인 (Mock 우선)
- [ ] Phase 3 — 4주차: 상담 + 관리자 + 법적 고지 + GA4
- [ ] Phase 4 — 지속(P1): 출시 마무리

---

## Phase 0 — 1주차: 기반 구성

기술 스펙 §10 "1주차 완료 기준"을 코드로 채운다. 기능 로직은 이 페이즈 범위 밖(스텁만).

- [x] **0.0 선행 결정** — `decisions.md` D1~D5 확정 완료(2026-09-04). 아래 각 항목에 반영됨.
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
1. Supabase 프로젝트 생성(**리전: Seoul 권장** — 결함 #15) → `0001_init.sql` 실행
2. Supabase Auth **Email 가입 + 익명 로그인 모두 비활성화**, 관리자 계정 1개 수동 생성(+2FA 권장)
3. Telegram 봇 생성(BotFather) → 토큰/chat id
4. OpenAI API 키 발급
5. `.env.example` → `.env` 채우기, `n8n.env` 별도 작성
6. (배포) Contabo VPS `docker compose up`, Nginx Proxy Manager에서 도메인·인증서, **방화벽 80/443만 개방**

---

## Phase 1 — 2주차: 랜딩 + 진단 폼

- [ ] 1.1 랜딩페이지: Hero → 문제 제시 → Before/After → 서비스 5종 카드 → 자동화 데모 3개(`자동화 데모` 라벨 필수) → 진단 CTA → 구축 절차 → 신뢰 요소 → FAQ → 최종 CTA (기획서 §5). 반응형.
- [ ] 1.2 5단계 진단 폼(기획서 §7): 단계별 화면, 진행률, 이전/다음, 오류 메시지, 제출 버튼 중복 클릭 방지
  - 1 회사정보 / 2 사용도구(복수) / 3 반복업무(복수) / 4 업무량·문제 / 5 상담정보 + 개인정보 동의
  - 선택지는 전부 `lib/options.ts` 참조
- [ ] 1.3 클라이언트 유효성 검사 = `lib/validation.ts` 스키마 재사용
- [ ] 1.4 허니팟 `hp_field` (숨김: `position:absolute;left:-9999px` + `tabIndex=-1` + `aria-hidden`) — 기술 스펙 §5
- [ ] 1.5 `POST /api/diagnoses` 구현(기술 스펙 §4.1 + 결함 수정)
  - 허니팟→200 무저장 / `consentAgreed!==true`→400 / rate limit(`clientIp.ts` 사용)→429
  - leads insert → diagnoses insert(SUBMITTED)
  - **`PROCESSING`으로 먼저 전이한 뒤** n8n webhook POST (**PII 제외**, `X-Webhook-Secret`) — 순서 역전으로 경쟁 조건 제거 (결함 #1, 치명)
  - **웹훅 호출 실패 시 `FAILED` + Telegram 알림** (결함 #3, 치명)
  - n8n 미구성 단계에서는 env 없으면 skip + 로그
  - `{ diagnosisId }` 반환
- [ ] 1.6 **서버 측 중복 제출 방지** — 멱등성 키 또는 단시간 동일 페이로드 차단 (결함 #13)
- [ ] 1.7 제출 성공 시 `/diagnosis/[id]` 이동

---

## Phase 2 — 3주차: 결과 파이프라인 (Mock 우선)

- [ ] 2.1 `GET /api/diagnoses/[id]` (기술 스펙 §4.2): PROCESSING / COMPLETED(+result) / FAILED. **`SUBMITTED`는 PROCESSING으로 취급**(결함 #12). lead 정보 절대 미포함.
- [ ] 2.2 결과 페이지 `app/diagnosis/[id]/page.tsx` — 3초 폴링, COMPLETED/FAILED 시 중단, **최대 시도 횟수/타임아웃 설정**. 구조화 카드(준비도, 우선 업무, 예상 절감 시간, 권장 구성, 다음 행동). "추정치" 명시.
- [ ] 2.3 FAILED UX(기획서 §9.5): 안내 문구 + 입력한 연락처로 상담 폼 프리필
- [ ] 2.4 **Mock 경로 먼저**: 고정 더미 JSON으로 DB 저장 → 결과 페이지 → Telegram 알림까지 동작시킴(기획서 §9.4)
- [ ] 2.5 **AI↔DB↔API 필드 매핑표를 `n8n/workflows/README.md`에 명문화** (결함 #9) — `CLAUDE.md`의 매핑표 참조
- [ ] 2.6 n8n 워크플로우 구성(기술 스펙 §6): Webhook(secret 검증) → 입력 정리 → OpenAI HTTP Request(Structured Output, 기술 스펙 §7.3 스키마 — strict 요건 충족 확인됨) → 응답 필드 검증 → IF → 성공: `diagnosis_results` insert + status=COMPLETED + Telegram / 실패: status=FAILED + Telegram `[진단 실패]`
- [ ] 2.7 Error Trigger 워크플로우 → `TELEGRAM_ERROR_CHAT_ID` (기획서 §16.5)
- [ ] 2.8 워크플로우 JSON export → `n8n/workflows/{diagnosis-pipeline,error-trigger}.json` 커밋
- [ ] 2.9 필드 단계적 안정화: 우선 핵심 4개(준비도/우선업무/절감시간/요약), 나머지는 P1 가능(기획서 §9.3)

---

## Phase 3 — 4주차: 상담 + 관리자 + 법적 고지 + GA4

- [ ] 3.1 `POST /api/consultations` (기술 스펙 §4.3 + 결함 수정)
  - 허니팟/rate limit → **`diagnosisId` → `diagnoses.lead_id` 역참조로 lead 재사용, 신규는 `leads.email` unique 기준 upsert** (결함 #11)
  - consultations insert(NEW) → Telegram
- [ ] 3.2 상담 폼 페이지 + 결과 페이지 CTA 연동
- [ ] 3.3 **서비스 유형 자동 태깅을 `lib/serviceTagging.ts`에 구현** — 상담 신청 시점에 `diagnosis_results`를 읽어 계산(결함 #8, D3 결정). n8n이 아님. `suggested_service_type` 저장 + Telegram 표시.
- [ ] 3.4 관리자 화면(기획서 §11): 로그인(Supabase Auth), 대시보드 숫자 카드, 진단 목록/상세, 상담 목록/상세, 상태 변경·메모. 별도 API 없이 `lib/supabase/client.ts` + RLS 직접 조회(기술 스펙 §4.4). `app/admin/layout.tsx` 세션 체크.
- [ ] 3.5 개인정보처리방침(기획서 §16.1 + 결함 #15): **실제 인프라 기준 국외 이전 고지** — Telegram(상호 전송), Contabo VPS(독일), Supabase 리전, OpenAI. AI 호출에서 식별정보 제외 사실도 반영. (전문가 검토는 사용자 몫)
- [ ] 3.6 **이용약관 페이지** (기획서 §16.2 — 어느 범위 목록에도 없던 항목, 결함 #14)
- [ ] 3.7 개인정보 수집 동의 서버 재검증 + 전화번호 형식 검증 확인
- [ ] 3.8 GA4 이벤트(기획서 §14.4, 기술 스펙 §9): `step{1..5}_view/complete`, `step5_submit`, `diagnosis_result_view`, `consultation_cta_click`, `consultation_submit` — 삽입 위치는 기술 스펙 §9 표
- [ ] 3.9 GA4 쿠키/분석 동의 처리 (결함 #22 — 스펙 미정의)

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
| #1 경쟁 조건 | 1.5 |
| #2 프록시 IP | 0.5 (`clientIp.ts`), 1.5, 4.6 |
| #3 웹훅 실패 | 1.5 |
| #4 포트 노출 | 0.6 |
| #5 익명 로그인 | 0.3 주석 + 사용자 작업 2 |
| #6·#7 누락 필드 | D1 → 0.0/0.3 |
| #8 태깅 위치 | D3 → 3.3 |
| #9 필드 매핑 | 0.3(difficulty), 2.5 |
| #10 선택지 값 | D2 → 0.5 (`options.ts`) |
| #11 upsert 키 | 0.3, 3.1 |
| #12 SUBMITTED | 2.1 |
| #13 중복 제출 | 1.6 |
| #14 P0/일정 불일치 | 3.6, 4.5 |
| #15 국외 이전 | 3.5 + 사용자 작업 1 |
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
- 2026-09-03: 전체 md 검토 반영. 스펙 결함 22건을 `CLAUDE.md`에 기록하고 각 페이즈에 해소 작업 배치. 선행 결정 5건을 `decisions.md`로 분리. Phase 0에 `options.ts`/`clientIp.ts`/Dockerfile/포트 바인딩, Phase 1에 경쟁 조건·웹훅 실패·중복 제출 대응, Phase 3에 이용약관·태깅 위치 수정 추가.
- 2026-09-04: **D1~D5 전원 권장안대로 확정.** 진단 폼에 도입 목적·담당 인원 추가하고 현재 처리 방식 제거, 선택지 한글 라벨 저장, 서비스 태깅을 상담 시점 Next.js로, `difficulty` 컬럼 삭제, 백업은 Free + cron `pg_dump`. Phase 0 착수 가능 상태.
- 2026-09-04: **Phase 0 완료.** `create-next-app@latest`가 **Next.js 16.3.4 / React 19.2.8 / Tailwind v4 / zod 4.5**를 설치함(스펙·초기 계획의 "Next 15" 가정과 다름 — 스텁 수준에서는 영향 없음, `params`는 Promise·`PageProps`/`RouteContext`는 전역 생성 타입). shadcn 스타일 `base-nova`. 검증 결과: `next build` 성공(16 라우트), `eslint` 0건, `tsc --noEmit` 청정, `docker compose config` 유효(포트 `127.0.0.1` 바인딩 확인), `0001_init.sql`을 Postgres 16에 적용해 5테이블+RLS+정책6+트리거2 생성 및 CHECK/unique/트리거 동작 확인, `rateLimit`(6번째 차단·버킷 분리)·`clientIp`(cf 우선·xff 파싱·fallback) 유닛 통과. `git init` + 초기 커밋.

### Phase 0 이탈·메모
- **Next 16** (계획은 15 가정). CNA가 `AGENTS.md`(Next 자동 생성, `next dev`가 재작성)를 만들며 `CLAUDE.md`를 `@AGENTS.md` 스텁으로 덮어써서 한글 `CLAUDE.md`를 복구하고 끝에 `@AGENTS.md` 임포트를 추가함.
- `app/page.tsx`(CNA 데모)는 제거하고 홈을 `app/(marketing)/page.tsx`로 이동(둘 다 `/`라 충돌).
- `#11`: `leads.email`에 `unique` + 형식 CHECK 추가. `POST /api/diagnoses`는 Phase 1에서 email 기준 **upsert**로 구현(재방문자 500 방지). 신규-상담-무진단 경로도 email upsert.
- `#21`: `consultations.preferred_date`는 D2-b가 날짜 아닌 선택지 버킷("가능한 빨리" 등)이 되어 `text`가 **정답** — 변경 없음. `diagnoses.website_status`는 다른 옵션 컬럼과 마찬가지로 CHECK 없이 zod/`options.ts`로만 강제(스펙 방침 유지, 라벨=계약 이중화 회피).
- `next.config.ts`에 `output: "standalone"`, `.gitignore`에 `n8n.env`/`!*.example` 규칙 추가.
