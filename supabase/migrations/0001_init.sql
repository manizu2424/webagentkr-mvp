-- WEBAGENT.KR — 초기 스키마
-- 실행: Supabase 대시보드 > SQL Editor 에 붙여넣어 1회 실행 (기술 스펙 §3, §3.1)
--
-- ⚠️ 실행 전 필수 (기술 스펙 §3.1 + 결함 #5):
--   Supabase 대시보드 > Authentication > Providers 에서
--     1) Email 회원가입(Sign up) 비활성화
--     2) Anonymous sign-in 비활성화        ← 스펙엔 없지만 이게 켜져 있으면
--                                             누구나 authenticated 롤을 얻어 아래 admin_* 정책을 통과한다
--   관리자 계정은 대시보드에서 1개만 수동 생성한다.
--
-- 스펙과의 차이 (decisions.md):
--   D1  diagnoses.purpose, diagnoses.staff_count 추가 / "현재 처리 방식" 필드는 폼에서 제거
--   D4  diagnosis_results.difficulty 컬럼 없음 (난이도는 recommended_tasks jsonb 안 업무별 값)
--   #11 leads.email 에 unique — POST /api/diagnoses 는 email 기준 upsert
--   #21 consultations.preferred_date 는 의도적으로 text (D2-b 의 선택지 버킷: "가능한 빨리" 등, 날짜 아님)

-- ── 확장 ─────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── updated_at 자동 갱신 함수 ────────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ── leads ────────────────────────────────────────────────────────────
-- 개인 식별 정보(PII). 이 테이블 내용은 n8n / AI 로 절대 전달하지 않는다 (기획서 §16.1).
create table leads (
  id                uuid primary key default gen_random_uuid(),
  company_name      text not null,
  industry          text not null,          -- lib/options.ts industry 와 1:1 (D2)
  employee_count    text not null,          -- 예: "5-10명" — lib/options.ts employeeCount 와 1:1
  contact_name      text not null,
  email             text not null,
  phone             text not null,
  consulting_method text,                   -- 상담 희망 방식 — lib/options.ts consultingMethod 와 1:1
  created_at        timestamptz not null default now(),
  constraint leads_email_unique unique (email),
  constraint leads_email_format check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

-- ── diagnoses ────────────────────────────────────────────────────────
create table diagnoses (
  id               uuid primary key default gen_random_uuid(),  -- 결과 페이지 공개 식별자로 그대로 사용 (UUID 라 추측 불가)
  lead_id          uuid not null references leads(id) on delete cascade,
  website_status   text,                    -- lib/options.ts websiteStatus 와 1:1
  current_tools    text[] not null default '{}',
  repetitive_tasks text[] not null default '{}',
  daily_hours      text,
  staff_count      text,                    -- D1 추가: 담당 인원 (lib/options.ts staffCount)
  monthly_volume   text,
  purpose          text,                    -- D1 추가: 도입 목적 (lib/options.ts purpose) — §11.3 태깅 분기에 사용
  pain_point       text,                    -- 자유 텍스트. PII 가 섞일 수 있어 n8n 전달 시 주의 (기획서 §16.1)
  budget_range     text,
  status           text not null default 'SUBMITTED'
                   check (status in ('SUBMITTED','PROCESSING','COMPLETED','FAILED')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create trigger diagnoses_set_updated_at
  before update on diagnoses
  for each row execute function set_updated_at();
create index idx_diagnoses_lead_id on diagnoses(lead_id);

-- ── diagnosis_results (diagnoses 와 1:1) ─────────────────────────────
-- n8n 이 service_role 로 insert. AI 출력 필드명과 다르므로 n8n Code 노드에서 매핑 (결함 #9, n8n/workflows/README.md).
create table diagnosis_results (
  id                    uuid primary key default gen_random_uuid(),
  diagnosis_id          uuid not null unique references diagnoses(id) on delete cascade,
  automation_score      smallint check (automation_score between 0 and 100),
  recommended_tasks     jsonb not null,     -- [{name, reason, difficulty, estimatedMonthlySavedHours}]  (AI: priorityTasks)
  estimated_saved_hours jsonb,              -- {min, max}                                                 (AI: totalEstimatedSavedHours)
  recommended_stack     text[],             --                                                            (AI: recommendedStack)
  implementation_steps  text[],             --                                                            (AI: implementationSteps)
  ai_summary            text,               --                                                            (AI: summary)
  created_at            timestamptz not null default now()
  -- difficulty 컬럼 없음 (decisions.md D4): 최상위 난이도는 AI 출력에 존재하지 않는다
);

-- ── consultations ────────────────────────────────────────────────────
create table consultations (
  id                    uuid primary key default gen_random_uuid(),
  lead_id               uuid not null references leads(id) on delete cascade,
  diagnosis_id          uuid references diagnoses(id),   -- 어느 진단에서 넘어온 상담인지 추적 (스펙 원본엔 없던 추가분)
  suggested_service_type text
                        check (suggested_service_type in
                          ('AI Automation','n8n Automation','Smart Website','AI Agent','AI Consulting')),
  preferred_date        text,               -- 선택지 버킷 (lib/options.ts preferredDate) — 날짜 아님
  consultation_type     text,               -- 상담 방식 — lib/options.ts consultingMethod 공유 (D2-c)
  status                text not null default 'NEW'
                        check (status in
                          ('NEW','CONTACT_PENDING','SCHEDULED','PROPOSAL_SENT','CONTRACTED','ON_HOLD','CLOSED')),
  memo                  text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create trigger consultations_set_updated_at
  before update on consultations
  for each row execute function set_updated_at();
create index idx_consultations_lead_id on consultations(lead_id);
create index idx_consultations_diagnosis_id on consultations(diagnosis_id);

-- ── submission_log ──────────────────────────────────────────────────
-- 스팸 방어용. MVP 의 rate limit 은 Next.js 프로세스 인메모리(lib/rateLimit.ts)로 하므로
-- 지금은 사용하지 않지만, 다중 인스턴스로 확장할 때 DB 기반 폴백으로 쓰기 위해 미리 만들어 둔다 (기술 스펙 §5).
create table submission_log (
  id         bigserial primary key,
  ip         text not null,
  created_at timestamptz not null default now()
);
create index idx_submission_log_ip_created on submission_log(ip, created_at);

-- ── RLS ─────────────────────────────────────────────────────────────
-- 원칙 (기술 스펙 §3.1):
--   anon  : 정책을 하나도 만들지 않는다 → 브라우저 anon 키로는 읽기/쓰기 전부 불가.
--           공개 진단/상담 제출은 서버(Next.js API Route)가 service_role 키로 수행 → RLS 자동 우회.
--   authenticated (= 관리자, 가입 비활성화로 사실상 1계정) : 관리자 화면에서 직접 조회/갱신.
alter table leads             enable row level security;
alter table diagnoses         enable row level security;
alter table diagnosis_results enable row level security;
alter table consultations     enable row level security;
alter table submission_log    enable row level security;

create policy admin_select_leads          on leads             for select to authenticated using (true);
create policy admin_select_diagnoses      on diagnoses         for select to authenticated using (true);
create policy admin_update_diagnoses      on diagnoses         for update to authenticated using (true);
create policy admin_select_results        on diagnosis_results for select to authenticated using (true);
create policy admin_select_consultations  on consultations     for select to authenticated using (true);
create policy admin_update_consultations  on consultations     for update to authenticated using (true);
