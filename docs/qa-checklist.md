# 출시 전 QA 체크리스트 (task.md 4.6 / 기획서 §17.2)

배포일에 이 문서를 위에서 아래로 실행한다. 각 항목의 **결과** 칸에 `PASS` / `FAIL` + 날짜/메모를 적는다.

**환경 태그**

| 태그 | 의미 |
|---|---|
| `[로컬]` | `npm run dev` 만으로 실행 가능 (DB 쓰기 없음 — curl/Playwright) |
| `[로컬+DB]` | dev + Supabase 연결 필요. 테스트 행을 만들고 끝나면 삭제한다 (`*@qa.test` 마커) |
| `[배포]` | Contabo 배포 + Nginx Proxy Manager + 실제 도메인 필요 |
| `[배포+n8n]` | 배포 + 실 n8n 워크플로우(Phase B) 필요 |
| `[실기기]` | 실제 모바일 기기 (iOS Safari / Android Chrome) |

**사전 준비**
- `NEXT_PUBLIC_GA4_MEASUREMENT_ID`, `NEXT_PUBLIC_CLARITY_PROJECT_ID`, `NEXT_PUBLIC_SITE_URL` 을 프로덕션 값으로 `.env` 에 설정했는지 확인.
- `supabase/migrations/0001_init.sql` + `0002_diagnoses_idempotency.sql` 적용 확인 (`diagnoses.idempotency_key` 컬럼 존재).
- Supabase Auth: 이메일 회원가입 + 익명 로그인 **둘 다 비활성화** 확인 (관리자 콘솔 인가의 유일한 전제 — CLAUDE.md 결함 #5).
- `N8N_WEBHOOK_URL` 설정 확인 (`[배포+n8n]` 항목 대상). 미설정이면 모든 진단이 3분 타임아웃 → 상담 CTA 로 종결됨(Mock-우선 설계상 정상).

---

## A. 전환 퍼널 Happy Path

### A1 `[로컬+DB]` / `[배포+n8n]` — 진단 5단계 제출 → 결과 → 상담 전 구간

1. `/diagnosis` 접속, 5단계를 모두 유효값으로 채우고 제출.
2. `/diagnosis/<id>` 로 이동 → "분석 중" 폴링 화면.
3. **로컬:** 다른 터미널에서
   `curl -X POST "http://localhost:3000/api/dev/mock-result/<id>"` (outcome 생략 = completed).
   **배포+n8n:** 실제 n8n 이 OpenAI 호출 후 `diagnosis_results` 기록 + `status=COMPLETED`.
4. 결과 페이지가 폴링을 멈추고 6개 카드(추정치 명시)를 렌더.
5. "상담 신청" CTA → `/consultation?diagnosisId=<id>` (연락처 프리필/생략).
6. 상담 폼 제출 → 성공 화면.

- 기대: 각 단계 전환에 막힘 없음. 결과 카드에 "추정" 문구. 상담은 진단 lead 를 재사용(`consultations.lead_id == diagnoses.lead_id`).
- **결과:**

### A2 `[로컬+DB]` — 멱등성 (중복 제출 방지, 결함 #13)

1. 유효한 바디로 `POST /api/diagnoses` 2회 연속 (같은 `idempotencyKey`).
2. 두 응답의 `diagnosisId` 가 동일한지, `leads`/`diagnoses` 가 1행씩만 생겼는지 확인.

- 기대: 2번째 호출은 기존 행의 `diagnosisId` 를 그대로 반환. 추가 lead/AI 호출 없음.
- **결과:**

---

## B. 폼 검증 & 스팸 방어 (클라이언트 우회 = 서버 재검증)

### B1 `[로컬]` — 개인정보 동의 없이 서버에서도 거부 (클라이언트 우회)

```
curl -sS -X POST http://localhost:3000/api/diagnoses \
  -H 'content-type: application/json' \
  -d '{"companyName":"큐에이","industry":"컨설팅","employeeCount":"5-10명","websiteStatus":"없음",
       "currentTools":[],"repetitiveTasks":[],"dailyHours":"1~2시간","staffCount":"1명",
       "monthlyVolume":"50건 미만","purpose":"기타","budgetRange":"300만원 미만",
       "consultingMethod":"전화","contactName":"큐에이","email":"a@qa.test","phone":"010-1234-5678",
       "idempotencyKey":"00000000-0000-4000-8000-000000000001"}'
```

- 기대: `400 {"error":"validation", ...}` (consentAgreed 누락). DB 에 아무것도 안 씀.
- **결과:**

### B2 `[로컬]` — 허니팟

위 B1 바디에 `"consentAgreed":true, "hp_field":"bot"` 추가하여 POST.

- 기대: `200 {"ok":true}`. DB 에 아무것도 안 씀 (`[diagnoses] 허니팟 채워짐` 로그).
- **결과:**

### B3 `[로컬]` — 전화번호 형식 오류

B1 바디 + `"consentAgreed":true`, `"phone":"12345"` 로 POST.

- 기대: `400 {"error":"validation"}`, issues 에 `phone` 경로 + "휴대폰 번호 형식이 올바르지 않습니다".
- **결과:**

### B4 `[로컬]` — 필수값 누락

B1 바디에서 `companyName` 을 빼고 `"consentAgreed":true` 로 POST.

- 기대: `400 {"error":"validation"}`, issues 에 `companyName`.
- **결과:**

### B5 `[로컬]` — 폼 UI 오류 메시지 노출 (Playwright/수동)

`/diagnosis` 에서 1단계 빈 상태로 "다음" → 필드별 오류 문구. 5단계에서 동의 체크 없이 제출 → "개인정보 수집·이용 동의가 필요합니다".

- 기대: 각 단계 오류가 해당 필드 아래 한글로 노출. 제출 버튼 중복 클릭 방지(제출 중 비활성).
- **결과:**

### B6 `[로컬]` — Rate limit (IP당 시간당 5건 → 429)

같은 IP 로 `POST /api/diagnoses` 6회 연속(검증 실패 바디여도 무방 — rate limit 이 zod 앞단).

```
for i in $(seq 1 6); do curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  http://localhost:3000/api/diagnoses -H 'content-type: application/json' -d '{}'; done
```

- 기대: 앞 5회는 400, 6회째 `429` + `Retry-After` 헤더.
- **결과:**

### B7 `[배포]` — 프록시 뒤 Rate limit 이 IP별로 동작 (결함 #2 회귀 방지)

배포 환경에서 서로 다른 두 네트워크(예: 휴대폰 LTE vs 사무실 IP)로 각각 6회 제출.

- 기대: 한 IP 가 429 여도 다른 IP 는 정상. `cf-connecting-ip`/`x-forwarded-for` 기반이므로 전체가 한 버킷이 아님. (버킷이 하나면 사이트 전체가 시간당 5건으로 막힘)
- **결과:**

---

## C. 실패 경로 (FAILED / timeout)

### C1 `[로컬+DB]` / `[배포+n8n]` — AI 응답 실패 시 §9.5 흐름

1. 진단 제출 → `/diagnosis/<id>`.
2. **로컬:** `curl -X POST "http://localhost:3000/api/dev/mock-result/<id>?outcome=failed"`.
   **배포+n8n:** n8n 에서 의도적으로 검증 실패를 유발(스키마 안 맞는 응답).
3. 결과 페이지가 사과 문구 + 이미 입력한 연락처가 프리필된 상담 CTA(`/consultation?diagnosisId=<id>`)를 노출.

- 기대: 스피너 무한 대기 없음. `status=FAILED` 확정. Telegram `[진단 실패]` 알림.
- **결과:**

### C2 `[로컬]` — 폴링 타임아웃 UX

`/diagnosis/<id>?_test_maxAttempts=2` (비프로덕션 전용 쿼리)로 접속, mock-result 를 호출하지 않음.

- 기대: 2회 폴링 후 타임아웃 안내 + 상담 CTA. "다시 시도" 링크 동작.
- **결과:**

### C3 `[로컬]` — 존재하지 않는 진단 번호

`/diagnosis/11111111-1111-1111-1111-111111111111` 접속.

- 기대: `notfound` 뷰 — "진단 새로 시작하기" 링크(무한 재시도 아님).
- **결과:**

### C4 `[로컬+DB]` — 결함 #1 회귀 방지 (COMPLETED 를 PROCESSING 이 덮어쓰지 않음)

1. 진단 제출 → 즉시 `GET /api/diagnoses/<id>` → `PROCESSING` (webhook 미설정 시).
2. 곧바로 `POST /api/dev/mock-result/<id>` → `COMPLETED`.
3. `GET /api/diagnoses/<id>` 를 3회 반복 → 매번 `COMPLETED` (절대 `PROCESSING` 으로 되돌아가지 않음).
4. 코드 확인: `POST /api/diagnoses` 는 webhook 호출 **전에** `PROCESSING` 을 set 한다(순서 역전 완료).

- 기대: 상태가 단조 진행(SUBMITTED → PROCESSING → COMPLETED). 되돌림 없음.
- **결과:**

---

## D. 알림 (Telegram)

### D1 `[배포]` — 신규 진단 알림

진단 제출(또는 mock-result completed) 시 관리자 chat 에 도착.

- 기대: `TELEGRAM_ADMIN_CHAT_ID` 로 회사명·진단번호 포함(PII 이름·전화·이메일 **미포함**).
- **결과:**

### D2 `[배포]` — 신규 상담 알림

상담 폼 제출 시 `[신규 상담]` + 추정 서비스 유형(`suggested_service_type`).

- 기대: 회사명·상담 요약만. 이름·전화·이메일 미포함.
- **결과:**

### D3 `[배포]` — 시스템 에러 알림

n8n Error Trigger 또는 webhook POST 실패 시 `TELEGRAM_ERROR_CHAT_ID` 로 도착.

- 기대: `[진단 실패]` 태그. (로컬 dev 머신은 IPv6 라우팅 이슈로 `sendTelegram` 이 ETIMEDOUT 될 수 있음 — 배포 환경에서 확인.)
- **결과:**

### D4 `[배포]` — PII 경계 육안 확인

D1~D3 메시지 본문에 이름/휴대폰/이메일이 한 글자도 없는지 직접 확인. `painPoint` 자유 입력에 사용자가 넣은 PII 가 새지 않는지도 확인.

- **결과:**

---

## E. 반응형 / 크로스 브라우저

### E1 `[로컬]` — 데스크톱/태블릿/모바일 뷰포트 (Playwright 또는 devtools)

`/`, `/diagnosis`, `/diagnosis/<id>` (결과 카드), `/consultation`, `/privacy` 를 1280 / 768 / 375 폭에서 확인.

- 기대: 가로 스크롤 없음. 진단 폼 탭 타겟 44px 이상. 동의 배너가 하단에서 콘텐츠를 가리지 않음.
- **결과:**

### E2 `[실기기]` — iOS Safari + Android Chrome 각 1회

실제 기기로 진단 happy path 1회 완주.

- 기대: 폰트(Pretendard) 로드, select/체크박스 조작, 제출·결과·상담까지 이상 없음.
- **결과:**

---

## F. 관리자 콘솔 (배포 후)

### F1 `[배포]` — 미인증 접근 리다이렉트

로그아웃 상태로 `/admin`, `/admin/consultations/<id>` 접근 → `/admin/login` 리다이렉트.

- **결과:**

### F2 `[배포]` — 로그인 → 상담 목록/상세/상태전이/메모

관리자 계정으로 로그인, 상담 목록 필터, 상세에서 `<select>` 상태 변경(즉시 저장), 메모 저장, 진단 상세 링크.

- 기대: RLS `authenticated` 로 조회/갱신 동작. 비-uuid 경로는 404. server action 세션 만료 시 크래시 없이 `{error}`.
- **결과:**

### F3 `[배포]` — anon 차단

브라우저 콘솔에서 anon 키로 `leads`/`consultations` SELECT 시도 → 0행/거부.

- 기대: RLS 정책이 anon 롤에 하나도 없으므로 아무것도 못 읽음.
- **결과:**

---

## G. SEO / 분석 (배포 후)

### G1 `[배포]` — robots / sitemap / canonical

`https://<도메인>/robots.txt` (Disallow `/admin/`·`/api/`, Sitemap 링크), `/sitemap.xml` (5 URL), 주요 페이지 `<link rel="canonical">` 가 실제 도메인.

- **결과:**

### G2 `[배포]` — OG / 아이콘

`/` 를 카카오톡/슬랙에 붙여 미리보기 카드(제목·설명·이미지) 확인. 브라우저 탭 파비콘.

- **결과:**

### G3 `[배포]` — 분석 동의 게이트

동의 배너에서 "거부" → GA4/Clarity 스크립트 미로드. "동의" → 로드. 푸터 "쿠키 설정" 으로 재선택. `/admin` 에서는 배너·스크립트 없음.

- **결과:**

---

## H. 로컬 사전 검증 결과 (이 브랜치에서 미리 실행)

`[로컬]` / `[로컬+DB]` 항목은 배포 전에 미리 한 번 실행해 회귀를 조기에 잡는다. 마지막 실행: **2026-09-09** (`feat/qa-checklist`, dev + 실 Supabase 서울). 테스트 행은 `*@qa.test` 로 생성 후 전량 삭제함.

| 항목 | 결과 | 메모 |
|---|---|---|
| B1 동의 우회 | ✅ PASS | `consentAgreed` 누락 → `400 {"error":"validation"}` + 한글 메시지. DB 무기록 |
| B2 허니팟 | ✅ PASS | `hp_field` 채움 → `200 {"ok":true}`. DB 무기록 |
| B3 전화번호 형식 | ✅ PASS | `phone:"12345"` → 400, `path:["phone"]`, "휴대폰 번호 형식이 올바르지 않습니다" |
| B4 필수값 누락 | ✅ PASS | 제출 차단 + 400 + `path:["companyName"]` + "회사명을 입력해 주세요" (2026-09-09 한글 메시지 수정 후) |
| B5 폼 UI 오류 문구 | ✅ PASS | 1단계 빈 상태 "다음" → 진행 차단 + 필드별 한글 오류 4건("회사명을 입력해 주세요"·"업종을 선택해 주세요" 등), 영문 0 (2026-09-09 `lib/validation.ts` 수정) |
| B6 rate limit 429 | ✅ PASS | 신규 서버에서 5×400 후 6회째 `429` + `Retry-After` |
| C1 FAILED (API) | ✅ PASS | `?outcome=failed` → `status=FAILED`, 결과행 0, `[진단 실패]` Telegram 시도. UI 사과+CTA 는 Phase 2/묶음 A 에서 검증됨 |
| C2 폴링 타임아웃 | ✅ PASS | `?_test_maxAttempts=2` → "예상보다 오래 걸리고 있습니다" + "상담 신청하기" CTA(`/consultation`) |
| C3 notfound | ✅ PASS | 없는 uuid → "진단을 찾을 수 없습니다" + "진단 새로 시작하기" 링크(재시도 루프 아님) |
| A1 happy path (API+결과) | ✅ PASS | submit 200 → `PROCESSING` → mock 200 → `COMPLETED` + `result` 6필드 |
| A2 멱등성 | ✅ PASS | 같은 `idempotencyKey` 2회 → 동일 `diagnosisId` |
| C4 결함 #1 회귀 | ✅ PASS | `PROCESSING` → mock `COMPLETED` → 3회 폴링 모두 `COMPLETED`(되돌림 없음) |
| E1 반응형(375px) | ✅ PASS | `/`·`/diagnosis`·`/privacy` 페이지 가로 스크롤 없음(`scrollWidth ≤ 375`). 법적 표는 자체 `overflow-x` 컨테이너 안에서만 스크롤 |

### 이번 실행에서 발견한 이슈

1. ~~zod 오류 메시지 영문 노출~~ — **해결 (2026-09-09, `fix/validation-korean-messages`).** `lib/validation.ts` 의 `opt()` 헬퍼에 필드별 `SELECT_MSG` 맵 + `requiredText()` 헬퍼 도입. 누락(`undefined`)·빈값·잘못된 enum 값·형식 오류 모두 한글. 진단 14필드 + 상담 스키마 curl 검증, 진단 폼 1단계 Playwright 재확인.
2. ~~DB 잔여 시드~~ — **삭제 완료 (2026-09-09).** 묶음 B 관리자 콘솔 검증 시드(`admin-verify-A/B@webagent.test` + 자식 진단/결과/상담)를 service-role 스크립트로 제거. 5개 테이블 전부 0행(마이그레이션 직후 상태) 확인.
